import { CodeSpinConfig } from "./CodeSpinConfig.js";

export function getFilePathPrefix(config: CodeSpinConfig) {
  return config.filePathPrefix || "File path:";
}

export function getPromptMarker(config: CodeSpinConfig) {
  return config.markers?.PROMPT || "PROMPT";
}

export function getPromptRegex(config: CodeSpinConfig) {
  const marker = getPromptMarker(config);
  return new RegExp(`\\$${marker}\\$`);
}
