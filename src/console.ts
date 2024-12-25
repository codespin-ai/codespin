import { isDebugging } from "./debugMode.js";

export function writeError(text: string) {
  console.error(text || "");
}

export function writeDebug(text: string) {
  if (isDebugging()) {
    console.log(text || "");
  }
}

export function getLoggers() {
  return {
    writeError,
    writeDebug,
  };
}
