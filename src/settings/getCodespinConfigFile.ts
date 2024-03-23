import * as path from "path";
import { getCodespinConfigDir } from "./getCodespinConfigDir.js";

export async function getCodespinConfigFile(
  configDirFromArgs: string | undefined,
  searchHomeDir: boolean
): Promise<string | undefined> {
  const configDir = await getCodespinConfigDir(
    configDirFromArgs,
    searchHomeDir
  );

  if (configDir) {
    return path.join(configDir, "codespin.json");
  } else {
    return undefined;
  }
}
