import path from "path";
import { CompletionOptions } from "../../api/CompletionOptions.js";
import { BasicFileInfo } from "../../fs/BasicFileInfo.js";
import { resolvePathInProject } from "../../fs/resolvePath.js";
import { resolveWildcardPaths } from "../../fs/resolveWildcards.js";
import { PromptSettings } from "../../prompts/readPromptSettings.js";
import { removeDuplicates } from "./removeDuplicates.js";
import { exception } from "../../exception.js";
import { getDeclarations } from "../../sourceCode/getDeclarations.js";

export async function getIncludedDeclarations(
  declarationsFromCLI: string[],
  api: string,
  promptFilePath: string | undefined,
  promptSettings: PromptSettings | undefined,
  completionOptions: CompletionOptions,
  maxDeclare: number,
  customConfigDir: string | undefined,
  workingDir: string,
  config: CompletionOptions
): Promise<BasicFileInfo[]> {
  const declarationsFromPrompt = promptFilePath
    ? await Promise.all(
        (promptSettings?.declare || []).map(async (x) =>
          resolvePathInProject(x, path.dirname(promptFilePath), workingDir)
        )
      )
    : [];

  const allPaths = declarationsFromPrompt.concat(declarationsFromCLI);

  const pathsWithWildcards: string[] = (
    await Promise.all(
      allPaths.map(async (x) =>
        x.includes("*") ? await resolveWildcardPaths(x) : x
      )
    )
  ).flat();

  const filePaths = removeDuplicates(pathsWithWildcards, (x) => x);

  if (filePaths.length > maxDeclare) {
    exception(
      `The number of declaration files exceeded ${maxDeclare}. Set the --max-declare parameter.`
    );
  }

  if (filePaths.length) {
    return await getDeclarations(
      filePaths,
      api,
      customConfigDir,
      completionOptions,
      workingDir,
      config
    );
  } else {
    return [];
  }
}
