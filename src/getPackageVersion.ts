import fs from "fs";
import * as path from "path";
import * as url from "url";

export function getPackageVersion() {
  const __filename = get__filename();
  const packageJsonPath = path.resolve(__filename, "../../package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  return packageJson.version;
}

function get__filename() {
  if (import.meta.url) {
    return url.fileURLToPath(import.meta.url);
  } else {
    return __filename;
  }
}
