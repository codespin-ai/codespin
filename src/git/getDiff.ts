import { getWorkingDir } from "../fs/workingDir.js";
import { execString } from "../process/execString.js";
import { getPathRelativeToGitRoot } from "./getPathRelativeToGitRoot.js";

export async function getDiff(
  filePath: string,
  version1: string | undefined,
  version2: string | undefined
): Promise<string> {
  const relativePath = await getPathRelativeToGitRoot(filePath);
  const committedFile = version2
    ? await execString(
        `git diff ${version1} ${version2} -- ${relativePath}`,
        getWorkingDir()
      )
    : await execString(
        `git diff ${version1} -- ${relativePath}`,
        getWorkingDir()
      );
  return committedFile;
}
