import { CodespinConfig } from "../settings/CodespinConfig.js";
import { SourceFile } from "../sourceCode/SourceFile.js";

export type ParseFunc = (
  response: string,
  workingDir: string,
  config: CodespinConfig
) => Promise<SourceFile[]>;
