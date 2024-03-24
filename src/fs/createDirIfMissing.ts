import { promises as fs } from "fs";
import { pathExists } from "./pathExists.js";

export async function createDirIfMissing(
  ...dirPaths: string[]
): Promise<void> {
  for (const dirPath of dirPaths) {
    const exists = await pathExists(dirPath);
    if (!exists) {
      await fs.mkdir(dirPath, { recursive: true }); // Using recursive to ensure all nested directories are created
    }
  }
}
