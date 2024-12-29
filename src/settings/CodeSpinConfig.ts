
export type CodeSpinConfig = {
  version: string;
  model: string;
  liteModel?: string | undefined;
  debug?: boolean;
  maxInput?: number;

  // Markers
  filePathPrefix?: string;
  promptMarker?: string;
  xmlCodeBlockElement?: string;
};
