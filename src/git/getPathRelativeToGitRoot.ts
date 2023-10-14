import { exception } from "../exception.js";
import { findGitProjectRoot } from "./findGitProjectRoot.js"; // Assuming the previous function is in this file.
import path from "path";

export async function getPathRelativeToGitRoot(
  filePath: string
): Promise<string> {
  try {
    const gitRoot = await findGitProjectRoot();
    if (gitRoot) {
      return path.relative(gitRoot, path.resolve(filePath));
    } else {
      exception(`${filePath} is not in a project under git.`);
    }
  } catch (error: any) {
    // Handle the error. For now, just throwing it further.
    exception("Failed to get path relative to git root: " + error.message);
  }
}
