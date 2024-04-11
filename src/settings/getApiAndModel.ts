import { CodespinConfig } from "./CodespinConfig.js";

export function getApiAndModel(
  models: (string | undefined)[],
  config: CodespinConfig
): [string, string] {
  for (const model of models) {
    if (model) {
      // Model has a colon
      // Model === "anthropic:claude-3-haiku-423434"
      if (model.includes(":")) {
        return model.split(":") as [string, string];
      }
      // Model has no colon; is like "claude-3-haiku"
      // So we gotta check in the config.
      else {
        if (config.models?.[model]) {
          if (config.models?.[model].includes(":")) {
            return config.models?.[model].split(":") as [string, string];
          }
        }
      }
    }
  }

  // Default to openai and gpt-3.5
  return ["openai", "gpt-3.5-turbo"];
}
