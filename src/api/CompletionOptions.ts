export type CompletionOptions = {
  model: string | undefined;
  maxTokens: number | undefined;
  debug: boolean | undefined;
  responseStreamCallback?: (data: string) => void;
  responseCallback?: (data: string) => void;
};
