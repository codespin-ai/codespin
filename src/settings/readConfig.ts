import fs from "fs/promises";
import { CodespinConfig } from "./CodespinConfig.js";
import { getConfigFilePath } from "./getConfigFilePath.js";

export async function readConfig(
  codespinDir: string | undefined
): Promise<CodespinConfig> {
  const configPath = await getConfigFilePath("codespin.json", codespinDir);

  if (configPath) {
    const data = await fs.readFile(configPath, "utf-8");
    return JSON.parse(data);
  }
  // return defaults
  else {
    const defaultConfig: CodespinConfig = {
      api: "openai",
      maxDeclare: 20,
      maxTokens: 2000,
      model: "gpt-3.5-turbo",
      template: "default.mjs",
    };

    return defaultConfig;
  }
}
