export function writeToConsole(text?: string) {
  console.log(text || "");
}

export function errorToConsole(text?: string) {
  console.error(text || "");
}
