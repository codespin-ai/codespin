import { dirname } from "path";
import { promises as fsPromises } from "fs";

export async function ensureDirExists(filePath: string): Promise<void> {
  const dirPath = dirname(filePath);
  try {
    await fsPromises.access(dirPath);
  } catch (error) {
    await fsPromises.mkdir(dirPath, { recursive: true });
  }
}
