import fs from "fs/promises";
import { CodeSpinConfig } from "./CodeSpinConfig.js";
import { fileExists } from "../fs/fileExists.js";

export async function readConfig(
  filePath: string
): Promise<CodeSpinConfig> {
  try {
    if (await fileExists(filePath)) {
      const data = await fs.readFile(filePath, "utf-8");
      return JSON.parse(data);
    } else {
      return {};
    }
  } catch (error: any) {
    throw new Error(`Error reading JSON file: ${error.message}`);
  }
}
