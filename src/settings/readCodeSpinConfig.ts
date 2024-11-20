import { CodeSpinConfig } from "./CodeSpinConfig.js";
import { readConfig } from "./readConfig.js";

export async function readCodeSpinConfig(
  customConfigDir: string | undefined,
  workingDir: string
): Promise<CodeSpinConfig> {
  const config = await readConfig("codespin.json", customConfigDir, workingDir);

  if (config) {
    if ((config as CodeSpinConfig).version === "0.0.1") {
      throw new Error(
        `codespin.json version 0.0.1 is not supported any more. You must do a codespin init to generated new config files. Type "codespin init --help" for more information.`
      );
    }
    return config;
  } else {
    const defaultConfig: CodeSpinConfig = {
      model: "gpt-4o",
      template: "default.mjs",
    };

    return defaultConfig;
  }
}
