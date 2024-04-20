import { CodespinConfig } from "../settings/CodespinConfig.js";
import { SourceFile } from "../sourceCode/SourceFile.js";

export async function noOutputParser(
  response: string,
  workingDir: string,
  config: CodespinConfig
): Promise<SourceFile[]> {
  return [];
}
