import path from "path";
import { VersionedFileInfo } from "../../fs/VersionedFileInfo.js";
import { VersionedPath } from "../../fs/VersionedPath.js";
import { getVersionedFileInfo } from "../../fs/getFileContent.js";
import { getVersionedPath } from "../../fs/getVersionedPath.js";
import { resolveWildcardPaths } from "../../fs/resolveWildcards.js";
import { PromptSettings } from "../../prompts/readPromptSettings.js";
import { removeDuplicates } from "./removeDuplicates.js";

export async function getIncludedFiles(
  includesFromCLI: VersionedPath[],
  excludesFromCLI: string[],
  promptFilePath: string | undefined,
  promptSettings: PromptSettings | undefined,
  workingDir: string
): Promise<VersionedFileInfo[]> {
  const includesFromPrompt = promptFilePath
    ? await Promise.all(
        (promptSettings?.include || []).map(async (x) =>
          getVersionedPath(x, path.dirname(promptFilePath), true, workingDir)
        )
      )
    : [];

  const allPaths = includesFromCLI.concat(includesFromPrompt);

  const pathsWithWildcards: VersionedPath[] = (
    await Promise.all(
      allPaths.map(async (x) =>
        x.path.includes("*")
          ? (
              await resolveWildcardPaths(x.path)
            ).map((f) => ({
              path: f,
              version: x.version,
            }))
          : x
      )
    )
  ).flat();

  const validFiles = removeDuplicates(
    pathsWithWildcards.filter((x) => !excludesFromCLI.includes(x.path)),
    (x) => x.path
  );

  const fileInfoList = await Promise.all(
    validFiles.map((x) => getVersionedFileInfo(x, workingDir))
  );

  return fileInfoList;
}
