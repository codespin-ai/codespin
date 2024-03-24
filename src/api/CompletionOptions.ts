export type CompletionOptions = {
  model: string | undefined;
  maxTokens: number | undefined;
  debug: boolean | undefined;
  dataCallback?: (data: string) => void;
  apiVersion?: string;
};
