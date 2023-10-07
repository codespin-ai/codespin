import { promises as fs } from "fs";
import path from "path";

async function fileExistsInDir(
  dir: string,
  fileName: string
): Promise<boolean> {
  try {
    await fs.access(path.join(dir, fileName));
    return true;
  } catch {
    return false;
  }
}

export async function findFileInDirOrParents(
  startDir: string,
  fileName: string
): Promise<string | undefined> {
  const parentDir = path.dirname(startDir);

  if (await fileExistsInDir(startDir, fileName)) {
    return startDir;
  } else if (parentDir !== startDir) {
    // Not at the root yet
    return findFileInDirOrParents(parentDir, fileName);
  }

  return undefined;
}
