import { CodeSpinContext } from "../CodeSpinContext.js";
import { CompletionOptions } from "../api/CompletionOptions.js";
import { getCompletionAPI } from "../api/getCompletionAPI.js";
import { CompletionContentPart, CompletionInputMessage } from "../api/types.js";
import { writeDebug } from "../console.js";
import { setDebugFlag } from "../debugMode.js";
import { exception } from "../exception.js";
import { loadImage } from "../prompts/loadImage.js";
import { stdinDirective } from "../prompts/stdinDirective.js";
import { validateMaxInputLength } from "../safety/validateMaxInputLength.js";
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
  images?: string[]; // New parameter for image paths
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

  // This is in bytes
  const maxInput = args.maxInput ?? config.maxInput;

  const model = getModel([args.model, config.model], config);

  if (config.debug) {
    setDebugFlag();
  }

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

  let content: string | CompletionContentPart[];

  // Handle images if provided
  if (args.images && args.images.length > 0) {
    const imageParts = await Promise.all(
      args.images.map(async (imagePath) => {
        const base64Data = await loadImage(imagePath, context.workingDir);
        return {
          type: "image" as const,
          base64Data,
        };
      })
    );

    content = [{ type: "text", text: evaluatedPrompt }, ...imageParts];
  } else {
    content = evaluatedPrompt;
  }

  const messageToLLM: CompletionInputMessage = {
    role: "user",
    content: content,
  };

  writeDebug("--- PROMPT ---");
  writeDebug(
    typeof content === "string" ? content : JSON.stringify(content, null, 2)
  );

  if (typeof content === "string") {
    validateMaxInputLength(content, maxInput);
  }

  const completionResult = await completion(
    [messageToLLM],
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
