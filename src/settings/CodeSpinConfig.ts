import { ModelDescription } from "libllm";

export type CodeSpinConfig = {
  version: string;
  model: string;
  liteModel?: string | undefined;
  models: ModelDescription[];
  template?: string;
  debug?: boolean;
  multi?: number;
  maxInput?: number;
  filePathPrefix?: string;
  markers?: {
    PROMPT?: string;
  };
  xmlCodeBlockElement?: string;
};
