import { pathExists } from "../fs/pathExists.js";
import { getWorkingDir } from "../fs/workingDir.js";
import * as os from "os";
import { getGitRoot } from "../git/getGitRoot.js";
import { CODESPIN_CONFIG_DIRNAME } from "../fs/pathNames.js";

export async function getCodespinConfigDir(
  configDirFromArgs: string | undefined,
  searchHomeDir: boolean
): Promise<string | undefined> {
  // If a specific directory is provided and exists, return it immediately
  if (configDirFromArgs && (await pathExists(configDirFromArgs))) {
    return configDirFromArgs;
  }

  // First, try to find the Git project root and check there
  const gitRootDir = await getGitRoot();
  if (gitRootDir && (await pathExists(`${gitRootDir}/${CODESPIN_CONFIG_DIRNAME}`))) {
    return `${gitRootDir}/${CODESPIN_CONFIG_DIRNAME}`;
  }

  // If not found in Git root, check the current working directory
  const workingDir = getWorkingDir();
  if (await pathExists(`${workingDir}/${CODESPIN_CONFIG_DIRNAME}`)) {
    return `${workingDir}/${CODESPIN_CONFIG_DIRNAME}`;
  }

  if (searchHomeDir) {
    // As a last resort, check the home directory
    const homeDir = os.homedir();
    if (await pathExists(`${homeDir}/${CODESPIN_CONFIG_DIRNAME}`)) {
      return `${homeDir}/${CODESPIN_CONFIG_DIRNAME}`;
    }
  }

  // If none of the above paths contain the .codespin directory, return undefined
  return undefined;
}
