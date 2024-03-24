import { pathExists } from "./pathExists.js";
import { getWorkingDir } from "./workingDir.js";
import { getGitRoot } from "../git/getGitRoot.js";
import { CODESPIN_DIRNAME } from "./pathNames.js";
import { join } from "path";

export async function getProjectRoot(): Promise<string | undefined> {
  // First, try to find the Git project root and check if .codespin exists there
  const gitRootDir = await getGitRoot();
  if (
    gitRootDir &&
    (await pathExists(join(gitRootDir, CODESPIN_DIRNAME)))
  ) {
    return gitRootDir; // Project dir is the Git root dir if .codespin exists under it
  }

  // If not found in Git root, check the current working directory
  const workingDir = getWorkingDir();
  if (await pathExists(join(workingDir, CODESPIN_DIRNAME))) {
    return workingDir; // Project dir is the current working dir if .codespin exists under it
  }

  // If .codespin directory is not found in either location, return undefined
  return undefined;
}
