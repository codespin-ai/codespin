import { CompletionOptions } from "../api/CompletionOptions.js";
import { exception } from "../exception.js";
import { pathExists } from "../fs/pathExists.js";
import { generateDeclaration } from "./generateDeclaration.js";

export async function getDeclarations(
  files: string[],
  api: string,
  completionOptions: CompletionOptions
): Promise<{ name: string; declarations: string }[]> {
  if (!(await pathExists("codespin/declarations"))) {
    exception(
      `The path codespin/declarations was not found. Have you done "codespin init"?`
    );
  }

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
