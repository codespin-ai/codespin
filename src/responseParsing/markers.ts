import { CodeSpinConfig } from "../settings/CodeSpinConfig.js";

export function getPromptMarker(config: CodeSpinConfig) {
  return config.markers?.PROMPT || "PROMPT";
}

export function getPromptRegex(config: CodeSpinConfig) {
  const marker = getPromptMarker(config);
  return new RegExp(`\\$${marker}\\$`);
}
