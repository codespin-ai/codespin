import { execPromise } from "../process/execPromise.js";
import { getPathRelativeToGitRoot } from "./getPathRelativeToGitRoot.js";

export async function getFileFromCommit(
  filePath: string
): Promise<string | undefined> {
  try {
    // git needs the relative path here.
    const relativePath = await getPathRelativeToGitRoot(filePath);
    const committedFile = await execPromise(`git show HEAD:${relativePath}`);
    return committedFile;
  } catch {
    return undefined;
  }
}
