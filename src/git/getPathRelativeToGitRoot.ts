import path from "path";

import { getGitRootAndAssert } from "./getGitRootAndAssert.js";
import { GitPathError } from "../errors.js";

export async function getPathRelativeToGitRoot(
  filePath: string,
  workingDir: string
): Promise<string> {
  try {
    const gitRoot = await getGitRootAndAssert(workingDir);
    return path.relative(gitRoot, filePath);
  } catch (error: any) {
    throw new GitPathError(error.message);
  }
}
