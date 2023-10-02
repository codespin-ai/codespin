import fs from "fs";
import { join } from "path";
import * as url from "url";

export function getPackageVersion() {
  const __filename = url.fileURLToPath(import.meta.url);
  const packageJsonPath = join(__filename, "../../package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  return packageJson.version;
}
