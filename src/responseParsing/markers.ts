import { CodeSpinConfig } from "../settings/CodeSpinConfig.js";

export function getStartUpdatesMarker(config: CodeSpinConfig) {
  return config.markers?.START_UPDATES || "START_UPDATES";
}

export function getStartUpdatesRegex(config: CodeSpinConfig) {
  const marker = getStartUpdatesMarker(config);
  return new RegExp(`\\$${marker}:(.+?)\\$(?:\\s*\\/\\/.*)?`, "s");
}

export function getEndUpdatesMarker(config: CodeSpinConfig) {
  return config.markers?.END_UPDATES || "END_UPDATES";
}

export function getEndUpdatesRegex(config: CodeSpinConfig) {
  const marker = getEndUpdatesMarker(config);
  return new RegExp(`\\$${marker}:.+?\\$(?:\\s*\\/\\/.*)?`);
}

export function getDeleteLinesMarker(config: CodeSpinConfig) {
  return config.markers?.DELETE_LINES || "DELETE_LINES";
}

export function getDeleteLinesRegex(config: CodeSpinConfig) {
  const marker = getDeleteLinesMarker(config);
  return new RegExp(`${marker}:(\\d+):(\\d+)(?:\\s*\\/\\/.*)?`, "s");
}

export function getStartInsertLinesMarker(config: CodeSpinConfig) {
  return config.markers?.START_INSERT_LINES || "START_INSERT_LINES";
}

export function getStartInsertLinesRegex(config: CodeSpinConfig) {
  const marker = getStartInsertLinesMarker(config);
  return new RegExp(`${marker}:(\\d+)(?:\\s*\\/\\/.*)?`, "s");
}

export function getEndInsertLinesMarker(config: CodeSpinConfig) {
  return config.markers?.END_INSERT_LINES || "END_INSERT_LINES";
}

export function getEndInsertLinesRegex(config: CodeSpinConfig) {
  const marker = getEndInsertLinesMarker(config);
  return new RegExp(`${marker}(?:\\s*\\/\\/.*)?`);
}

export function getPromptMarker(config: CodeSpinConfig) {
  return config.markers?.PROMPT || "PROMPT";
}

export function getPromptRegex(config: CodeSpinConfig) {
  const marker = getPromptMarker(config);
  return new RegExp(`\\$${marker}\\$`);
}
