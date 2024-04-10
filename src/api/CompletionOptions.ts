export type CompletionOptions = {
  model: string | undefined;
  maxTokens: number | undefined;
  cancelCallback?: (cancel: () => void) => void;
  responseStreamCallback?: (data: string) => void;
  responseCallback?: (data: string) => void;
};
