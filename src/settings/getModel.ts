import { exception } from "../exception.js";
import { CodeSpinConfig, ModelDescription } from "./CodeSpinConfig.js";

export function getModel(
  models: (string | undefined)[],
  config: CodeSpinConfig
): ModelDescription {
  const modelName = models.find(Boolean);

  if (modelName) {
    const maybeModel = config.models?.find(
      (x) => x.alias === modelName || x.name === modelName
    );
    return (
      maybeModel ||
      exception(
        "INVALID_MODEL",
        `Invalid model ${modelName}. It should be something like "gpt-4o".`
      )
    );
  }

  exception(
    "MISSING_MODEL_NAME",
    `The model ${modelName} could not be found. Have you done "codespin init"?.`
  );
}
