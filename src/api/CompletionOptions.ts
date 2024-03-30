export type CompletionOptions = {
  model: string | undefined;
  maxTokens: number | undefined;
  debug: boolean | undefined;
  cancelCallback?: (cancellation: () => void) => void;
  responseStreamCallback?: (data: string) => void;
  responseCallback?: (data: string) => void;
};
