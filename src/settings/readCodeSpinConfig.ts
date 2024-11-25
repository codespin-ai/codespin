import { exception } from "../exception.js";
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
    exception(
      "MISSING_CONFIG",
      `Could not find the configuration file codespin.json. Have you done a codespin init?`
    );
  }

  const { config, filePath }: { config: CodeSpinConfig; filePath: string } =
    configInfo;

  if (config.version !== "0.0.3") {
    exception(
      "UNSUPPORTED_CONFIG_VERSION",
      `codespin.json version ${config.version} is not supported any more. You must do a "codespin init" to generate the configuration. Type "codespin init --help" for more information.`
    );
  }

  if (!config.model) {
    exception(
      "MISSING_MODEL_NAME",
      `The model property is not specified in ${filePath}.`
    );
  }

  if (
    !config.models.find(
      (x) => x.alias === config.model || x.name === config.model
    )
  ) {
    exception(
      "INVALID_MODEL_NAME",
      `The model ${config.model} does not match any of the models defined in ${filePath}.`
    );
  }

  return configInfo.config;
}
