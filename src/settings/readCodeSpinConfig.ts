import {
  InvalidModelError,
  MissingConfigError,
  MissingModelConfigError,
  MissingModelError,
  UnsupportedConfigVersionError,
} from "../errors.js";
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

  if (
    !config.models.find(
      (x) => x.alias === config.model || x.name === config.model
    )
  ) {
    throw new MissingModelError(config.model);
  }

  return configInfo.config;
}
