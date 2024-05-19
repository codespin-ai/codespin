import { CompletionOptions } from "../../api/CompletionOptions.js";
import { CompletionResult } from "../../api/CompletionResult.js";
import { getCompletionAPI } from "../../api/getCompletionAPI.js";
import { writeDebug } from "../../console.js";
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
  multi: number;
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

  const conversationHistory = [
    { role: "user" as const, content: args.evaluatedPrompt },
  ];

  writeDebug("--- PROMPT ---");
  for (const message of conversationHistory) {
    writeDebug(`ROLE: ${message.role}:`);
    writeDebug(message.content);
  }

  const completionResult = await completion(
    conversationHistory,
    args.customConfigDir,
    completionOptions,
    args.workingDir
  );

  return completionResult;
}
