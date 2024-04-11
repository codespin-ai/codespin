export type CodespinConfig = {
  template?: string;
  model?: string;
  maxTokens?: number;
  maxDeclare?: number;
  models?: {
    [key: string]: string;
  };
};
