export function getInvokeMode() {
  if (process.argv.includes("--cli")) {
    return "cli";
  } else {
    return "module";
  }
}
