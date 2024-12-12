export type ModelDescription = {
  name: string;
  alias?: string;
  provider: string;
  maxOutputTokens: number;
};

export type CodeSpinConfig = {
  version: string;
  model: string;
  liteModel?: string | undefined;
  models: ModelDescription[];
  template?: string;
  debug?: boolean;
  multi?: number;
  maxInput?: number;
  markers?: {
    PROMPT?: string;
  };
  xmlCodeBlockElement?: string;
};
