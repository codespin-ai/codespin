import path from "path";
import { CodeSpinContext } from "../CodeSpinContext.js";
import { CompletionOptions } from "../api/CompletionOptions.js";
import { getCompletionAPI } from "../api/getCompletionAPI.js";
import { CompletionContentPart, CompletionInputMessage } from "../api/types.js";
import { writeDebug } from "../console.js";
import { setDebugFlag } from "../debugMode.js";
import { exception } from "../exception.js";
import { convertPromptToMessage } from "../prompts/convertPromptToMessage.js";
import { loadMessagesFromFile } from "../prompts/loadMessagesFromFile.js";
import { stdinDirective } from "../prompts/stdinDirective.js";
import {
  validateMaxInputMessagesLength,
  validateMaxInputStringLength,
} from "../safety/validateMaxInputLength.js";
import { getModel } from "../settings/getModel.js";
import { readCodeSpinConfig } from "../settings/readCodeSpinConfig.js";
import { PlainTemplateArgs } from "../templates/PlainTemplateArgs.js";
import { PlainTemplateResult } from "../templates/PlainTemplateResult.js";
import plainTemplate from "../templates/plain.js";
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
  messages?: string; // New: Path to messages JSON file
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
  const config = await readCodeSpinConfig(args.config, context.workingDir);

  const maxInput = args.maxInput ?? config.maxInput;

  const model = getModel([args.model, config.model], config);

  if (config.debug) {
    setDebugFlag();
  }

  // Load messages or convert prompt to message
  let messages: CompletionInputMessage[] = [];

  if (args.messages) {
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
    return exception(
      "MISSING_INPUT",
      "Either --messages or --prompt must be specified"
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

  const completion = getCompletionAPI(model.provider);

  const completionOptions: CompletionOptions = {
    model,
    maxTokens: args.maxTokens,
    responseStreamCallback: args.responseStreamCallback,
    cancelCallback: (cancel) => {
      cancelCompletion = cancel;
    },
  };

  writeDebug("--- MESSAGES ---");
  writeDebug(JSON.stringify(messages, null, 2));

  const completionResult = await completion(
    messages,
    args.config,
    completionOptions,
    context.workingDir
  );

  if (completionResult.ok && args.responseCallback) {
    await args.responseCallback(completionResult.message);
  }

  return completionResult.ok
    ? { response: completionResult.message }
    : exception(completionResult.error.code, completionResult.error.message);
}
