let debugFlag = false;

export function setDebugFlag() {
  debugFlag = true;
}

export function unsetDebugFlag() {
  debugFlag = false;
}

export function isDebugging() {
  return debugFlag;
}
