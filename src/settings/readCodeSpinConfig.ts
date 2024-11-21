import { CodeSpinConfig } from "./CodeSpinConfig.js";
import { readConfig } from "./readConfig.js";

export async function readCodeSpinConfig(
  customConfigDir: string | undefined,
  workingDir: string
): Promise<CodeSpinConfig> {
  const configInfo = await readConfig<CodeSpinConfig>(
    "codespin.json",
    customConfigDir,
    workingDir
  );

  if (configInfo.config) {
    const version = (configInfo as CodeSpinConfig).version;
    if (version === "0.0.2") {
      throw new Error(
        `codespin.json version ${version} is not supported any more. You must do a "codespin init" to generate these files: ${configInfo.files.join(
          ", "
        )}. Type "codespin init --help" for more information.`
      );
    }
    return configInfo.config;
  } else {
    const defaultConfig: CodeSpinConfig = {
      model: "gpt-4o",
      template: "default.mjs",
    };

    return defaultConfig;
  }
}
