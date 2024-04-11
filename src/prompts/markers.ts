import { CodespinConfig } from "../settings/CodespinConfig.js";

export function getStartUpdatesMarker(config: CodespinConfig) {
  return config.markers?.START_UPDATES || "START_UPDATES";
}

export function getStartUpdatesRegex(config: CodespinConfig) {
  const marker = getStartUpdatesMarker(config);
  return new RegExp(`\\$${marker}:(.*?)\\$(.*)`, "s");
}

export function getEndUpdatesMarker(config: CodespinConfig) {
  return config.markers?.END_UPDATES || "END_UPDATES";
}

export function getEndUpdatesRegex(config: CodespinConfig) {
  const marker = getEndUpdatesMarker(config);
  return new RegExp(`\\$${marker}:.+?\\$`);
}

export function getStartFileContentsMarker(config: CodespinConfig) {
  return config.markers?.START_FILE_CONTENTS || "START_FILE_CONTENTS";
}

export function getStartFileContentsRegex(config: CodespinConfig) {
  const marker = getStartFileContentsMarker(config);
  return new RegExp(`\\$${marker}:(.*?)\\$(.*)`, "s");
}

export function getEndFileContentsMarker(config: CodespinConfig) {
  return config.markers?.END_FILE_CONTENTS || "END_FILE_CONTENTS";
}

export function getEndFileContentsRegex(config: CodespinConfig) {
  const marker = getEndFileContentsMarker(config);
  return new RegExp(`\\$${marker}:.+?\\$`);
}
