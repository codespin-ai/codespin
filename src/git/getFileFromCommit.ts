import { execString } from "../process/execString.js";
import { getPathRelativeToGitRoot } from "./getPathRelativeToGitRoot.js";

export async function getFileFromCommit(
  filePath: string,
  version: string | undefined,
  workingDir: string
): Promise<string> {
  // git needs the relative path here.
  const relativePath = await getPathRelativeToGitRoot(filePath, workingDir);
  const committedFile = await execString(
    `git show ${version}:${relativePath}`,
    workingDir
  );
  return committedFile;
}
