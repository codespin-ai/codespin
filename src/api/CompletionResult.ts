export type SuccessfulCompletionResult = {
  ok: true;
  message: string;
  finishReason: "STOP" | "MAX_TOKENS";
};

export type FailedCompletionResult = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

export type CompletionResult =
  | SuccessfulCompletionResult
  | FailedCompletionResult;
