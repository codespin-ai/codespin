import path from "path";
import { exception } from "../exception.js";
import { assertGitRoot } from "./assertGitRoot.js";

export async function getPathRelativeToGitRoot(
  filePath: string
): Promise<string> {
  try {
    const gitRoot = await assertGitRoot();
    return path.relative(gitRoot, path.resolve(filePath));
  } catch (error: any) {
    exception("Failed to get path relative to git root: " + error.message);
  }
}
