// fileUtils.ts
import { promises as fs } from "fs";

/**
 * Writes the specified contents to a file.
 * @param path - The path to the file.
 * @param contents - The contents to write.
 */
export async function writeToFile(
  path: string,
  contents: string,
  append: boolean
): Promise<void> {
  if (!append) {
    await fs.writeFile(path, contents, "utf-8");
  } else {
    await fs.appendFile(path, contents);
  }
}
