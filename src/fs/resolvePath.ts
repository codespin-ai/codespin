import * as path from "path";
import { getWorkingDir } from "./workingDir.js";

export async function resolvePath(filePath: string) {
  return filePath.startsWith("/")
    ? filePath
    : path.resolve(getWorkingDir(), filePath);
}
