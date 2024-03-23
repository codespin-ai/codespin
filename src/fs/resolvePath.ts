import * as path from "path";
import { getProjectRootAndAssert } from "./getProjectRootAndAssert.js";

export async function resolvePath(baseDir: string, filePath: string) {
  return filePath.startsWith("/")
    ? path.join(await getProjectRootAndAssert(), filePath)
    : path.resolve(baseDir, filePath);
}
