import {
  MissingConfigError,
  MissingModelConfigError,
  UnsupportedConfigVersionError
} from "../errors.js";
import { CodeSpinConfig } from "./CodeSpinConfig.js";
import { readConfig } from "./readConfig.js";

let cachedConfig: CodeSpinConfig | null = null;

export async function readCodeSpinConfig(
  customConfigDir: string | undefined,
  workingDir: string,
  reloadConfig: boolean = false
): Promise<CodeSpinConfig> {
  if (cachedConfig && !reloadConfig) {
    return cachedConfig;
  }

  const configInfo = await readConfig<CodeSpinConfig>(
    "codespin.json",
    customConfigDir,
    workingDir
  );

  if (!configInfo) {
    throw new MissingConfigError("codespin.json");
  }

  const { config, filePath }: { config: CodeSpinConfig; filePath: string } =
    configInfo;

  if (config.version !== "0.0.3") {
    throw new UnsupportedConfigVersionError(config.version);
  }

  if (!config.model) {
    throw new MissingModelConfigError(filePath);
  }

  cachedConfig = configInfo.config;
  return cachedConfig;
}
