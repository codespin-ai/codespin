import { promises as fs } from "fs";
import path from "path";

async function fileExistsInDir(
  dir: string,
  filename: string
): Promise<boolean> {
  try {
    await fs.access(path.resolve(dir, filename));
    return true;
  } catch {
    return false;
  }
}

export async function findFileInDirOrParents(
  startDir: string,
  filename: string
): Promise<string | undefined> {
  const parentDir = path.dirname(startDir);

  if (await fileExistsInDir(startDir, filename)) {
    return startDir;
  } else if (parentDir !== startDir) {
    // Not at the root yet
    return findFileInDirOrParents(parentDir, filename);
  }

  return undefined;
}
