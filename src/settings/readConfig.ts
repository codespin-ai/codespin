import { promises as fs } from "fs";
import * as path from "path";
import { pathExists } from "../fs/pathExists.js";
import { CODESPIN_DIRNAME } from "../fs/pathNames.js";

import { homedir } from "os";
import { getGitRoot } from "../git/getGitRoot.js";
import { exception } from "../exception.js";
import { MissingConfigError } from "../errors.js";

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
): Promise<{ config: T; filePath: string } | undefined> {
  const filePath = await getConfigFilePath(
    pathFragment,
    customConfigDir,
    workingDir
  );

  if (filePath) {
    const fileContent = await fs.readFile(filePath, "utf8");
    return { config: JSON.parse(fileContent), filePath: filePath };
  } else {
    const homeConfigPath = (await pathExists(
      path.join(homedir(), CODESPIN_DIRNAME, pathFragment)
    ))
      ? path.join(homedir(), CODESPIN_DIRNAME, pathFragment)
      : undefined;

    if (homeConfigPath) {
      return {
        config: JSON.parse(await fs.readFile(homeConfigPath, "utf8")),
        filePath: homeConfigPath,
      };
    }
  }

  return undefined;
}

export async function readNonEmptyConfig<T>(
  pathFragment: string,
  customConfigDir: string | undefined,
  workingDir: string
): Promise<{ config: T; filePath: string }> {
  const config = await readConfig<T>(pathFragment, customConfigDir, workingDir);
  return config ?? exception(new MissingConfigError(pathFragment));
}
