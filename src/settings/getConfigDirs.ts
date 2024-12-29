import * as path from "path";
import * as os from "os";
import { CODESPIN_DIRNAME } from "../fs/pathNames.js";
import { MissingConfigDirError } from "../errors.js";

export async function getConfigDirs(
  customConfigDir: string | undefined,
  workingDir: string
): Promise<{
  configDir: string;
  globalConfigDir: string | undefined;
}> {
  const homeDir = os.homedir();
  const globalConfigDir = path.join(homeDir, CODESPIN_DIRNAME);

  let configDir: string;
  if (customConfigDir) {
    configDir = path.resolve(customConfigDir);
  } else {
    configDir = path.join(workingDir, CODESPIN_DIRNAME);
  }

  if (!configDir) {
    throw new MissingConfigDirError(configDir);
  }

  return {
    configDir,
    globalConfigDir,
  };
}
