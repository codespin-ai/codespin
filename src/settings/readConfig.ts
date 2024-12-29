import { promises as fs } from "fs";
import * as path from "path";
import { exception } from "../exception.js";
import { MissingConfigError } from "../errors.js";
import { getConfigDir } from "./getConfigDir.js";
import { getGlobalConfigDir } from "./getGlobalConfigDir.js";

async function getConfigFilePath(
  pathFragment: string,
  customConfigDir: string | undefined,
  workingDir: string
): Promise<string | undefined> {
  // Check custom config directory first
  if (customConfigDir) {
    const configPath = path.join(customConfigDir, pathFragment);
    if (
      await fs.access(configPath).then(
        () => true,
        () => false
      )
    ) {
      return configPath;
    }
  }

  // Check project and working directory
  const configDir = customConfigDir ?? (await getConfigDir(workingDir));
  if (configDir) {
    const configPath = path.join(configDir, pathFragment);
    if (
      await fs.access(configPath).then(
        () => true,
        () => false
      )
    ) {
      return configPath;
    }
  }

  // Check home directory last
  const globalConfigDir = await getGlobalConfigDir();
  if (globalConfigDir) {
    const configPath = path.join(globalConfigDir, pathFragment);
    if (
      await fs.access(configPath).then(
        () => true,
        () => false
      )
    ) {
      return configPath;
    }
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

  if (!filePath) {
    return undefined;
  }

  const fileContent = await fs.readFile(filePath, "utf8");
  return { config: JSON.parse(fileContent), filePath };
}

export async function readNonEmptyConfig<T>(
  pathFragment: string,
  customConfigDir: string | undefined,
  workingDir: string
): Promise<{ config: T; filePath: string }> {
  const config = await readConfig<T>(pathFragment, customConfigDir, workingDir);
  return config ?? exception(new MissingConfigError(pathFragment));
}
