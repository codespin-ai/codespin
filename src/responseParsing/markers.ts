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

export function getStartFileContentsMarker(config: CodespinConfig) {
  return config.markers?.START_FILE_CONTENTS || "START_FILE_CONTENTS";
}

export function getStartFileContentsRegex(config: CodespinConfig) {
  const marker = getStartFileContentsMarker(config);
  return new RegExp(`\\$${marker}:(.+?)\\$(?:\\s*\\/\\/.*)?(.*)`, "s");
}

export function getEndFileContentsMarker(config: CodespinConfig) {
  return config.markers?.END_FILE_CONTENTS || "END_FILE_CONTENTS";
}

export function getEndFileContentsRegex(config: CodespinConfig) {
  const marker = getEndFileContentsMarker(config);
  return new RegExp(`\\$${marker}:.+?\\$(?:\\s*\\/\\/.*)?`);
}

export function getStartReplaceLinesMarker(config: CodespinConfig) {
  return config.markers?.START_REPLACE_LINES || "START_REPLACE_LINES";
}

export function getStartReplaceLinesRegex(config: CodespinConfig) {
  const marker = getStartReplaceLinesMarker(config);
  return new RegExp(`\\$${marker}:(\\d+-\\d+)\\$(?:\\s*\\/\\/.*)?`, "s");
}

export function getEndReplaceLinesMarker(config: CodespinConfig) {
  return config.markers?.END_REPLACE_LINES || "END_REPLACE_LINES";
}

export function getEndReplaceLinesRegex(config: CodespinConfig) {
  const marker = getEndReplaceLinesMarker(config);
  return new RegExp(`\\$${marker}\\$(?:\\s*\\/\\/.*)?`);
}
