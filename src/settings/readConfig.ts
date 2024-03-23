import fs from "fs/promises";
import { CodespinConfig } from "./CodespinConfig.js";
import { pathExists } from "../fs/pathExists.js";
import { getCodespinConfigDir } from "./getCodespinConfigDir.js";

export async function readConfig(
  directory: string | undefined
): Promise<CodespinConfig | undefined> {
  try {
    const configDir = await getCodespinConfigDir(directory, true);
    if (configDir) {
      const configPath = `${configDir}/codespin.json`;
      if (await pathExists(configPath)) {
        const data = await fs.readFile(configPath, "utf-8");
        return JSON.parse(data);
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  } catch (error: any) {
    throw new Error(`Error reading JSON file: ${error.message}`);
  }
}
