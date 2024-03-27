// Convert file path to file URL
function pathToFileURL(filePath: string) {
  return new URL(`file://${filePath}`);
}

// Function to check if the current module is the main module
function isMainModule() {
  // Convert the file path in process.argv[1] to a URL
  const mainModuleURL = pathToFileURL(process.argv[1] || "").href;

  // Compare the current module's URL with the main module's URL
  return import.meta.url === mainModuleURL;
}

let isModule: "cli" | "module" | undefined = undefined;

export function getInvokeMode() {
  if (isModule === undefined) {
    isModule = isMainModule() ? "cli" : "module";
  }

  return isModule;
}
