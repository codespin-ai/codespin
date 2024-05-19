import { CompletionOptions } from "../../api/CompletionOptions.js";
import { CompletionResult } from "../../api/CompletionResult.js";
import { getCompletionAPI } from "../../api/getCompletionAPI.js";
import { ContinuationTemplateArgs } from "../../templates/ContinuationTemplateArgs.js";
import { getTemplate } from "../../templating/getTemplate.js";

type CallCompletionArgs = {
  api: string;
  model: string;
  maxTokens: number | undefined;
  evaluatedPrompt: string;
  config: string | undefined;
  workingDir: string;
  multi?: number;
  responseCallback?: (text: string) => void;
  responseStreamCallback?: (text: string) => void;
  cancelCallback?: (cancel: () => void) => void;
};

async function callContinuationTemplate(
  args: CallCompletionArgs,
  accumulatedOutput: string
): Promise<CompletionResult> {
  const continuationTemplate = await getTemplate<ContinuationTemplateArgs>(
    "continuation",
    args.config,
    args.workingDir
  );

  const { prompt: continuationPrompt } = await continuationTemplate(
    {
      prompt: args.evaluatedPrompt,
      incompleteOutput: accumulatedOutput,
    },
    {} as any
  );

  const continuationArgs = {
    ...args,
    evaluatedPrompt: continuationPrompt,
  };

  return await callCompletion(continuationArgs);
}

export async function callCompletion(
  args: CallCompletionArgs
): Promise<CompletionResult> {
  let cancelCompletion: (() => void) | undefined;

  function generateCommandCancel() {
    if (cancelCompletion) {
      cancelCompletion();
    }
  }

  if (args.cancelCallback) {
    args.cancelCallback(generateCommandCancel);
  }

  const completion = getCompletionAPI(args.api);

  const completionOptions: CompletionOptions = {
    model: args.model,
    maxTokens: args.maxTokens,
    responseStreamCallback: args.responseStreamCallback,
    responseCallback: args.responseCallback,
    cancelCallback: (cancel) => {
      cancelCompletion = cancel;
    },
  };

  let accumulatedOutput = "";
  const completionResult = await completion(
    args.evaluatedPrompt,
    args.config,
    completionOptions,
    args.workingDir
  );

  if (completionResult.ok) {
    accumulatedOutput += completionResult.message;

    let continuationCount = 0;
    const maxContinuations = args.multi ?? 0;

    let finishReason = completionResult.finishReason;

    while (finishReason === "MAX_TOKENS") {
      if (continuationCount >= maxContinuations) {
        return {
          ok: false,
          error: {
            code: "max_continuations_reached",
            message: `The maximum number of continuations (${maxContinuations}) has been reached.`,
          },
        };
      }
      continuationCount++;
      const continuationResult = await callContinuationTemplate(
        args,
        accumulatedOutput
      );

      if (continuationResult.ok) {
        accumulatedOutput += completionResult.message;
        finishReason = continuationResult.finishReason;
      } else {
        return continuationResult;
      }
    }

    return {
      ...completionResult,
      message: accumulatedOutput,
    };
  } else {
    return completionResult;
  }
}
