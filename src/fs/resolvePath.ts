import * as path from "path";
import { getProjectRootAndAssert } from "./getProjectRootAndAssert.js";

export async function resolvePath(
  filePath: string,
  relativeToDir: string,
  rootIsProjectRoot: boolean
) {
  return filePath.startsWith("/")
    ? rootIsProjectRoot
      ? path.join(await getProjectRootAndAssert(), filePath)
      : path.resolve(relativeToDir, filePath)
    : path.resolve(relativeToDir, filePath);
}
