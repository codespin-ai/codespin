import path from "path";
import { fileURLToPath } from "url";

function isMainModule() {
  return (
    import.meta?.url &&
    process.argv[1] ===
      path.resolve(fileURLToPath(import.meta.url), "../../index.js")
  );
}

let isModule: "cli" | "module" | undefined = undefined;

export function getInvokeMode() {
  if (isModule === undefined) {
    isModule =
      process.env.CODESPIN_CLI_MODE === "true" || isMainModule()
        ? "cli"
        : "module";
  }

  return isModule;
}
