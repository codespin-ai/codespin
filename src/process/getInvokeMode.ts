
let isModule: "cli" | "module" | undefined = undefined;

export function setInvokeMode(mode: "cli" | "module") {
  isModule = mode;
}

export function getInvokeMode() {
  return isModule === undefined ? "module" : isModule;
}
