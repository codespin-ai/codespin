import { promises as fs } from "fs";
import * as path from "path";
import { pathExists } from "../fs/pathExists.js";
import { CODESPIN_DIRNAME } from "../fs/pathNames.js";

import { homedir } from "os";
import { getGitRoot } from "../git/getGitRoot.js";

async function getConfigFilePath(
  pathFragment: string,
  customConfigDir: string | undefined,
  workingDir: string
): Promise<string | undefined> {
  if (
    customConfigDir &&
    (await pathExists(path.join(customConfigDir, pathFragment)))
  ) {
    return path.join(customConfigDir, pathFragment);
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

  return undefined;
}

export async function readConfig<T>(
  pathFragment: string,
  customConfigDir: string | undefined,
  workingDir: string
): Promise<T | undefined> {
  const homeConfigPath = (await pathExists(
    path.join(homedir(), CODESPIN_DIRNAME, pathFragment)
  ))
    ? path.join(homedir(), CODESPIN_DIRNAME, pathFragment)
    : undefined;

  const homeConfig = homeConfigPath
    ? JSON.parse(await fs.readFile(homeConfigPath, "utf8"))
    : undefined;

  const filePath = await getConfigFilePath(
    pathFragment,
    customConfigDir,
    workingDir
  );

  if (filePath) {
    const fileContents = await fs.readFile(filePath, "utf8");
    const jsonConfig = JSON.parse(fileContents);
    return homeConfig ? { ...homeConfig, ...jsonConfig } : jsonConfig;
  } else {
    return homeConfig;
  }
}
