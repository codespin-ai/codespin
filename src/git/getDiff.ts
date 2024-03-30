import { execString } from "../process/execString.js";
import { getPathRelativeToGitRoot } from "./getPathRelativeToGitRoot.js";

export async function getDiff(
  filePath: string,
  version1: string | undefined,
  version2: string | undefined,
  workingDir: string
): Promise<string> {
  const relativePath = await getPathRelativeToGitRoot(filePath, workingDir);
  const committedFile = version2
    ? await execString(
        `git diff ${version1} ${version2} -- ${relativePath}`,
        workingDir
      )
    : await execString(`git diff ${version1} -- ${relativePath}`, workingDir);
  return committedFile;
}
