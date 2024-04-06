import { CodespinConfig } from "./CodespinConfig.js";

export function getApiAndModel(
  modelAlias: string,
  config: CodespinConfig
): [string | undefined, string | undefined] {
  return config.models?.[modelAlias]
    ? config.models[modelAlias].includes(":")
      ? (config.models[modelAlias].split(":") as [string, string])
      : [undefined, config.models[modelAlias]]
    : [undefined, undefined];
}
