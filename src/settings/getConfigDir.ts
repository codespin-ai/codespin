import * as path from "path";
import { pathExists } from "../fs/pathExists.js";
import { CODESPIN_DIRNAME } from "../fs/pathNames.js";
import { getGitRoot } from "../git/getGitRoot.js";

export async function getConfigDir(
  basePath: string
): Promise<string | undefined> {
  // First, try to find the Git project root and check there
  const gitRootDir = await getGitRoot(basePath);
  if (
    gitRootDir &&
    (await pathExists(path.join(gitRootDir, CODESPIN_DIRNAME)))
  ) {
    return path.join(gitRootDir, CODESPIN_DIRNAME);
  }

  // If not found in Git root, check the provided base path
  if (basePath && (await pathExists(path.join(basePath, CODESPIN_DIRNAME)))) {
    return path.join(basePath, CODESPIN_DIRNAME);
  }

  return undefined;
}
