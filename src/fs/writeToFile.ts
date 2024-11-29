// fileUtils.ts
import { promises as fs } from "fs";

/**
 * Writes the specified content to a file.
 * @param path - The path to the file.
 * @param content - The content to write.
 */
export async function writeToFile(
  path: string,
  content: string,
  append: boolean
): Promise<void> {
  if (!append) {
    await fs.writeFile(path, content, "utf-8");
  } else {
    await fs.appendFile(path, content);
  }
}
