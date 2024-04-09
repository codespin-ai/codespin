export function getInvokeMode() {
  if (process.env.CODESPIN_CLI_MODE === "true") {
    return "cli";
  } else {
    return "module";
  }
}
