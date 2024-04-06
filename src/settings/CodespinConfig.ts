export type CodespinConfig = {
  template?: string;
  api?: string;
  model?: string;
  maxTokens?: number;
  maxDeclare?: number;
  models?: {
    [key: string]: string;
  };
};
