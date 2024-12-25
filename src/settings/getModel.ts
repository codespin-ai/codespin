import { ModelDescription } from "libllm";
import { InvalidModelError, MissingModelError } from "../errors.js";
import { exception } from "../exception.js";
import { CodeSpinConfig } from "./CodeSpinConfig.js";

export function getModel(
  models: (string | undefined)[],
  config: CodeSpinConfig
): ModelDescription {
  const modelName = models.find(Boolean);

  if (modelName) {
    const maybeModel = config.models?.find(
      (x) => x.alias === modelName || x.name === modelName
    );
    return maybeModel || exception(new InvalidModelError(modelName));
  }

  throw new MissingModelError(modelName);
}
