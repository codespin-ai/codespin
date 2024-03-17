import { getWorkingDir } from "../fs/workingDir.js";
import { execString } from "../process/execString.js";
import { getPathRelativeToGitRoot } from "./getPathRelativeToGitRoot.js";

export async function getFileFromCommit(
  filePath: string
): Promise<string | undefined> {
  try {
    // git needs the relative path here.
    const relativePath = await getPathRelativeToGitRoot(filePath);
    const committedFile = await execString(
      `git show HEAD:${relativePath}`,
      getWorkingDir()
    );
    return committedFile;
  } catch {
    return undefined;
  }
}
