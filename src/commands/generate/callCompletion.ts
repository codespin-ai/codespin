import { CompletionOptions } from "../../api/CompletionOptions.js";
import { CompletionResult } from "../../api/CompletionResult.js";
import { getCompletionAPI } from "../../api/getCompletionAPI.js";
import { CodespinConfig } from "../../settings/CodespinConfig.js";

type CallCompletionArgs = {
  api: string;
  model: string;
  maxTokens: number | undefined;
  evaluatedPrompt: string;
  config: CodespinConfig;
  customConfigDir: string | undefined;
  workingDir: string;
  responseCallback?: (text: string) => void;
  responseStreamCallback?: (text: string) => void;
  cancelCallback?: (cancel: () => void) => void;
};

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

  const completionResult = await completion(
    [{ role: "user", content: args.evaluatedPrompt }],
    args.customConfigDir,
    completionOptions,
    args.workingDir
  );

  return completionResult;
}
