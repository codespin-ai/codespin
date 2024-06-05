import { CodeSpinConfig } from "./CodeSpinConfig.js";
import { readConfig } from "./readConfig.js";

export async function readCodeSpinConfig(
  customConfigDir: string | undefined,
  workingDir: string
): Promise<CodeSpinConfig> {
  const config = await readConfig("codespin.json", customConfigDir, workingDir);

  if (config) {
    return config;
  } else {
    const defaultConfig: CodeSpinConfig = {
      maxTokens: 2000,
      model: "openai:gpt-3.5-turbo",
      template: "default.mjs",
    };

    return defaultConfig;
  }
}
