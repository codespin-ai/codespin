import { exception } from "../exception.js";
import { CodeSpinConfig, ModelDescription } from "./CodeSpinConfig.js";

export function getModel(
  models: (string | undefined)[],
  config: CodeSpinConfig
): ModelDescription {
  const modelName = models.find(Boolean);

  if (modelName) {
    const maybeModel = config.models?.find(
      (x) => (x.alias ?? x.name) === modelName
    );
    return (
      maybeModel ||
      exception(
        `Invalid model ${modelName}. It should be something like "gpt-4o".`
      )
    );
  }

  return {
    name: "gpt-4o",
    provider: "openai",
    maxOutputTokens: 16000,
  };
}
