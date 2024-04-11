export type CompletionOptions = {
  model: string;
  maxTokens: number | undefined;
  cancelCallback?: (cancel: () => void) => void;
  responseStreamCallback?: (data: string) => void;
  responseCallback?: (data: string) => void;
};
