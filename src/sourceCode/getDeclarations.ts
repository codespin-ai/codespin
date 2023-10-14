import { CompletionOptions } from "../api/CompletionOptions.js";
import { generateDeclaration } from "./generateDeclaration.js";

export async function getDeclarations(
  files: string[],
  api: string,
  completionOptions: CompletionOptions
): Promise<{ name: string; declarations: string }[]> {
  return await Promise.all(
    files.map(async (file) => {
      const declarations = await generateDeclaration(
        file,
        api,
        completionOptions
      );
      return {
        name: file,
        declarations,
      };
    })
  );
}
