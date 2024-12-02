export type CompletionResult = {
  message: string;
  finishReason: "STOP" | "MAX_TOKENS";
};
