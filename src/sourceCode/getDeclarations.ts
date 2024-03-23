import path from "path";
import { CompletionOptions } from "../api/CompletionOptions.js";
import { generateDeclaration } from "./generateDeclaration.js";
import { BasicFileInfo } from "../fs/BasicFileInfo.js";

export async function getDeclarations(
  filePaths: string[],
  api: string,
  configDirFromArgs: string | undefined,
  completionOptions: CompletionOptions
): Promise<BasicFileInfo[]> {
  return await Promise.all(
    filePaths.map(async (filePath) => {
      const contents = await generateDeclaration(
        filePath,
        api,
        configDirFromArgs,
        completionOptions
      );
      return {
        path: filePath,
        contents,
      };
    })
  );
}
