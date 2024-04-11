import path from "path";
import { CompletionOptions } from "../api/CompletionOptions.js";
import { generateDeclaration } from "./generateDeclaration.js";
import { BasicFileInfo } from "../fs/BasicFileInfo.js";
import { CodespinConfig } from "../settings/CodespinConfig.js";

export async function getDeclarations(
  filePaths: string[],
  api: string,
  customConfigDir: string | undefined,
  completionOptions: CompletionOptions,
  workingDir: string,
  config: CodespinConfig
): Promise<BasicFileInfo[]> {
  return await Promise.all(
    filePaths.map(async (filePath) => {
      const contents = await generateDeclaration(
        filePath,
        api,
        customConfigDir,
        completionOptions,
        workingDir,
        config
      );
      return {
        path: filePath,
        contents,
      };
    })
  );
}
