import path from "path";
import { exception } from "../exception.js";
import { getGitRootAndAssert } from "./getGitRootAndAssert.js";

export async function getPathRelativeToGitRoot(
  filePath: string,
  workingDir: string
): Promise<string> {
  try {
    const gitRoot = await getGitRootAndAssert(workingDir);
    return path.relative(gitRoot, filePath);
  } catch (error: any) {
    exception(`Failed to get path relative to git root: ${error.message}`);
  }
}
