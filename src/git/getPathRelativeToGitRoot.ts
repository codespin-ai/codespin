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
    exception(
      "FAILED_TO_GET_PATH_RELATIVE_TO_GIT_ROOT",
      `Failed to get path relative to git root: ${error.message}`
    );
  }
}
