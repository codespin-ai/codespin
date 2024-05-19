import { CodespinConfig } from "../settings/CodespinConfig.js";

export function getStartUpdatesMarker(config: CodespinConfig) {
  return config.markers?.START_UPDATES || "START_UPDATES";
}

export function getStartUpdatesRegex(config: CodespinConfig) {
  const marker = getStartUpdatesMarker(config);
  return new RegExp(`\\$${marker}:(.+?)\\$(?:\\s*\\/\\/.*)?`, "s");
}

export function getEndUpdatesMarker(config: CodespinConfig) {
  return config.markers?.END_UPDATES || "END_UPDATES";
}

export function getEndUpdatesRegex(config: CodespinConfig) {
  const marker = getEndUpdatesMarker(config);
  return new RegExp(`\\$${marker}:.+?\\$(?:\\s*\\/\\/.*)?`);
}

export function getDeleteLinesMarker(config: CodespinConfig) {
  return config.markers?.DELETE_LINES || "DELETE_LINES";
}

export function getDeleteLinesRegex(config: CodespinConfig) {
  const marker = getDeleteLinesMarker(config);
  return new RegExp(`${marker}:(\\d+):(\\d+)(?:\\s*\\/\\/.*)?`, "s");
}

export function getStartInsertLinesMarker(config: CodespinConfig) {
  return config.markers?.START_INSERT_LINES || "START_INSERT_LINES";
}

export function getStartInsertLinesRegex(config: CodespinConfig) {
  const marker = getStartInsertLinesMarker(config);
  return new RegExp(`${marker}:(\\d+)(?:\\s*\\/\\/.*)?`, "s");
}

export function getEndInsertLinesMarker(config: CodespinConfig) {
  return config.markers?.END_INSERT_LINES || "END_INSERT_LINES";
}

export function getEndInsertLinesRegex(config: CodespinConfig) {
  const marker = getEndInsertLinesMarker(config);
  return new RegExp(`${marker}(?:\\s*\\/\\/.*)?`);
}

export function getPromptMarker(config: CodespinConfig) {
  return config.markers?.PROMPT || "PROMPT";
}

export function getPromptRegex(config: CodespinConfig) {
  const marker = getPromptMarker(config);
  return new RegExp(`\\$${marker}\\$`);
}
