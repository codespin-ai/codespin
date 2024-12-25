import { ModelDescription } from "libllm";

export type CodeSpinConfig = {
  version: string;
  model: string;
  liteModel?: string | undefined;
  models: ModelDescription[];
  debug?: boolean;
  maxInput?: number;

  // Markers
  filePathPrefix?: string;
  promptMarker?: string;
  xmlCodeBlockElement?: string;
};
