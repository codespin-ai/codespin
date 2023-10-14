import path from "path";
import { CompletionOptions } from "../api/CompletionOptions.js";
import { generateDeclaration } from "./generateDeclaration.js";

export async function getDeclarations(
  filePaths: string[],
  api: string,
  completionOptions: CompletionOptions
): Promise<{ path: string; declarations: string }[]> {
  return await Promise.all(
    filePaths.map(async (filePath) => {
      const declarations = await generateDeclaration(
        filePath,
        api,
        completionOptions
      );
      return {
        path: filePath,
        declarations,
      };
    })
  );
}
