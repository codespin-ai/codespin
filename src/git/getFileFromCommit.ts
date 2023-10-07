import { execPromise } from "../process/execPromise.js";

export async function getFileFromCommit(filePath: string) {
  const committedFile = await execPromise(`git show HEAD:${filePath}`);
  return committedFile;
}
