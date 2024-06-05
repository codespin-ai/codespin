import { CodeSpinConfig } from "../settings/CodeSpinConfig.js";
import { SourceFile } from "../sourceCode/SourceFile.js";

export type ParseFunc = (
  response: string,
  workingDir: string,
  config: CodeSpinConfig
) => Promise<SourceFile[]>;
