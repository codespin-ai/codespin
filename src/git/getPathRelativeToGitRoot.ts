import { exception } from "../exception.js";
import { findGitProjectRoot } from "./findGitProjectRoot.js"; // Assuming the previous function is in this file.
import path from "path";

/**
 * Async function that takes an absolute path and returns its path relative to the git project root.
 *
 * @param absolutePath The absolute path to be converted.
 * @returns Promise<string> - a promise that resolves to the relative path or rejects with an error.
 */
export async function getPathRelativeToGitRoot(
  filePath: string
): Promise<string> {
  try {
    const gitRoot = await findGitProjectRoot();
    if (gitRoot) {
      return path.relative(gitRoot, path.resolve(filePath));
    } else {
      exception(`${filePath} is not in a git project.`);
    }
  } catch (error: any) {
    // Handle the error. For now, just throwing it further.
    exception("Failed to get path relative to git root: " + error.message);
  }
}
