import { CodespinConfig } from "./CodespinConfig.js";
import { readConfig } from "./readConfig.js";

export async function readCodespinConfig(
  codespinDir: string | undefined,
  workingDir: string
): Promise<CodespinConfig> {
  const config = await readConfig("codespin.json", codespinDir, workingDir);

  if (config) {
    return config;
  } else {
    const defaultConfig: CodespinConfig = {
      maxDeclare: 20,
      maxTokens: 2000,
      model: "openai:gpt-3.5-turbo",
      template: "default.mjs",
    };

    return defaultConfig;
  }
}
