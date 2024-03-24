import { CodespinConfig } from "./CodespinConfig.js";
import { readConfig } from "./readConfig.js";

export async function readCodespinConfig(
  codespinDir: string | undefined
): Promise<CodespinConfig> {
  const config = await readConfig("codespin.json", codespinDir);

  if (config) {
    return config;
  } else {
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
