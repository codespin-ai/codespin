import { execPromise } from "../process/execPromise.js";

export async function getFileFromCommit(
  filePath: string
): Promise<string | undefined> {
  try {
    const committedFile = await execPromise(`git show HEAD:${filePath}`);
    return committedFile;
  } catch {
    return undefined;
  }
}
