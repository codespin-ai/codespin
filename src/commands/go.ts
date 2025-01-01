import path from "path";
import { CodeSpinContext } from "../CodeSpinContext.js";
import { writeDebug } from "../console.js";
import { setDebugFlag } from "../debugMode.js";

import { CompletionInputMessage, CompletionOptions } from "libllm";
import { CLIParameterError } from "../errors.js";
import { getProviderForModel } from "../llm/getProviderForModel.js";
import { convertPromptToMessage } from "../prompts/convertPromptToMessage.js";
import {
  convertMessageFileFormat,
  loadMessagesFromFile,
} from "../prompts/loadMessagesFromFile.js";
import { stdinDirective } from "../prompts/stdinDirective.js";
import { MessagesArg } from "../prompts/types.js";
import { validateMaxInputMessagesLength } from "../safety/validateMaxInputLength.js";
import { getConfigDirs } from "../settings/getConfigDirs.js";
import { readCodeSpinConfig } from "../settings/readCodeSpinConfig.js";
import plainTemplate, {
  PlainTemplateArgs,
  PlainTemplateResult,
} from "../templates/plain.js";
import { getCustomTemplate } from "../templating/getCustomTemplate.js";

export type GoArgs = {
  template: string | undefined;
  prompt: string;
  model: string | undefined;
  maxInput?: number;
  maxTokens?: number;
  debug?: boolean;
  config: string | undefined;
  images?: string[];
  messages?: string;
  messagesJson?: MessagesArg;
  reloadConfig?: boolean;
  reloadProviderConfig?: boolean;
  responseCallback?: (text: string) => Promise<void>;
  responseStreamCallback?: (text: string) => void;
  promptCallback?: (prompt: string) => Promise<void>;
  cancelCallback?: (cancel: () => void) => void;
};

export type GoResult = {
  response: string;
};

export async function go(
  args: GoArgs,
  context: CodeSpinContext
): Promise<GoResult> {
  const config = await readCodeSpinConfig(
    args.config,
    context.workingDir,
    args.reloadConfig
  );

  const maxInput = args.maxInput ?? config.maxInput;

  const model = args.model ?? config.model;

  if (config.debug) {
    setDebugFlag();
  }

  // Load messages or convert prompt to message
  let messages: CompletionInputMessage[] = [];

  if (args.messagesJson) {
    // Convert provided messages JSON directly
    messages = await convertMessageFileFormat(
      args.messagesJson,
      context.workingDir
    );
  } else if (args.messages) {
    // Load messages from JSON file
    const messagesPath = path.resolve(context.workingDir, args.messages);
    messages = await loadMessagesFromFile(messagesPath, context.workingDir);
  } else if (args.prompt) {
    // Convert traditional prompt to message
    const templateFunc =
      (await getCustomTemplate<PlainTemplateArgs, PlainTemplateResult>(
        "plain",
        args.config,
        context.workingDir
      )) ?? plainTemplate;

    const { prompt: evaluatedPrompt } = await templateFunc(
      {
        prompt: await stdinDirective(
          args.prompt + "\n codespin:stdin",
          context.workingDir
        ),
      },
      config
    );

    if (args.promptCallback) {
      await args.promptCallback(evaluatedPrompt);
    }

    // Convert prompt to message
    const message = await convertPromptToMessage(
      evaluatedPrompt,
      args.images,
      context.workingDir
    );
    messages = [message];
  } else {
    throw new CLIParameterError(
      "Must specify one of: --messages, --messagesJson, or --prompt"
    );
  }

  validateMaxInputMessagesLength(messages, maxInput);

  let cancelCompletion: (() => void) | undefined;

  function generateCommandCancel() {
    if (cancelCompletion) {
      cancelCompletion();
    }
  }

  if (args.cancelCallback) {
    args.cancelCallback(generateCommandCancel);
  }

  const configDirs = await getConfigDirs(args.config, context.workingDir);

  const provider = await getProviderForModel(
    model,
    configDirs.configDir,
    configDirs.globalConfigDir
  );

  const completionOptions: CompletionOptions = {
    model,
    maxTokens: args.maxTokens,
    reloadConfig: args.reloadProviderConfig,
    responseStreamCallback: args.responseStreamCallback,
    cancelCallback: (cancel) => {
      cancelCompletion = cancel;
    },
  };

  writeDebug("--- MESSAGES ---");
  writeDebug(JSON.stringify(messages, null, 2));

  const completionResult = await provider.completion(
    messages,
    completionOptions,
    args.reloadProviderConfig
  );

  if (args.responseCallback) {
    await args.responseCallback(completionResult.message);
  }

  return { response: completionResult.message };
}
