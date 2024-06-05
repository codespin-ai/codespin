import { exception } from "../exception.js";
import { CodeSpinConfig } from "./CodeSpinConfig.js";

export function getApiAndModel(
  models: (string | undefined)[],
  config: CodeSpinConfig
): [string, string] {
  for (const modelAndApi of models) {
    if (modelAndApi) {
      // Model has a colon
      // Model === "anthropic:claude-3-haiku-423434"
      if (modelAndApi.includes(":")) {
        return modelAndApi.split(":").map((x) => x.trim()) as [string, string];
      }
      // Model has no colon; is like "claude-3-haiku"
      // So we gotta check in the config.
      else {
        if (config.models?.[modelAndApi]) {
          if (config.models?.[modelAndApi].includes(":")) {
            return config.models?.[modelAndApi]
              .split(":")
              .map((x) => x.trim()) as [string, string];
          }
        }
        return exception(
          `Invalid model ${modelAndApi}. It should be something like "openai:gpt-4o" or a reference to a model name defined in the config file.`
        );
      }
    }
  }

  // Default to openai and gpt-3.5-turbo
  return ["openai", "gpt-3.5-turbo"];
}
