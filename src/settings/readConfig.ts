import { promises as fs } from "fs";
import * as path from "path";
import { pathExists } from "../fs/pathExists.js";
import { CODESPIN_DIRNAME } from "../fs/pathNames.js";

import { getGitRoot } from "../git/getGitRoot.js";
import { homedir } from "os";

export async function getConfigFilePath(
  pathFragment: string,
  codespinDir: string | undefined,
  workingDir: string
): Promise<string | undefined> {
  if (codespinDir && (await pathExists(path.join(codespinDir, pathFragment)))) {
    return path.join(codespinDir, pathFragment);
  }

  // First, try to find the Git project root and check there
  const gitRootDir = await getGitRoot(workingDir);
  if (
    gitRootDir &&
    (await pathExists(path.join(gitRootDir, CODESPIN_DIRNAME, pathFragment)))
  ) {
    return path.join(gitRootDir, CODESPIN_DIRNAME, pathFragment);
  }

  // If not found in Git root, check the current working directory
  if (
    workingDir &&
    (await pathExists(path.join(workingDir, CODESPIN_DIRNAME, pathFragment)))
  ) {
    return path.join(workingDir, CODESPIN_DIRNAME, pathFragment);
  }

  if (await pathExists(path.join(homedir(), CODESPIN_DIRNAME, pathFragment))) {
    return path.join(homedir(), CODESPIN_DIRNAME, pathFragment);
  }

  return undefined;
}

export async function readConfig<T>(
  pathFragment: string,
  codespinDir: string | undefined,
  workingDir: string
): Promise<T | undefined> {
  const filePath = await getConfigFilePath(
    pathFragment,
    codespinDir,
    workingDir
  );
  if (filePath) {
    const fileContents = await fs.readFile(filePath, "utf8");
    return JSON.parse(fileContents);
  } else {
    return undefined;
  }
}
