import { join } from "path";
import { pathExists } from "../fs/pathExists.js";
import { CODESPIN_DIRNAME } from "../fs/pathNames.js";
import { getWorkingDir } from "../fs/workingDir.js";
import { getGitRoot } from "../git/getGitRoot.js";
import { homedir } from "os";

export async function getConfigFilePath(
  pathFragment: string,
  codespinDir: string | undefined
): Promise<string | undefined> {
  if (codespinDir && (await pathExists(join(codespinDir, pathFragment)))) {
    return join(codespinDir, pathFragment);
  }

  // First, try to find the Git project root and check there
  const gitRootDir = await getGitRoot();
  if (
    gitRootDir &&
    (await pathExists(join(gitRootDir, CODESPIN_DIRNAME, pathFragment)))
  ) {
    return join(gitRootDir, CODESPIN_DIRNAME, pathFragment);
  }

  // If not found in Git root, check the current working directory
  const workingDir = getWorkingDir();
  if (
    workingDir &&
    (await pathExists(join(workingDir, CODESPIN_DIRNAME, pathFragment)))
  ) {
    return join(workingDir, CODESPIN_DIRNAME, pathFragment);
  }

  if (await pathExists(join(homedir(), CODESPIN_DIRNAME, pathFragment))) {
    return join(homedir(), CODESPIN_DIRNAME, pathFragment);
  }

  return undefined;
}
