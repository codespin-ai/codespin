import { getWorkingDir } from "../fs/workingDir.js";
import { execString } from "../process/execString.js";
import { getPathRelativeToGitRoot } from "./getPathRelativeToGitRoot.js";

export async function getFileFromCommit(
  filePath: string,
  version: string | undefined
): Promise<string> {
  // git needs the relative path here.
  const relativePath = await getPathRelativeToGitRoot(filePath);
  const committedFile = await execString(
    `git show ${version}:${relativePath}`,
    getWorkingDir()
  );
  return committedFile;
}
