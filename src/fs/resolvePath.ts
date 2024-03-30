import * as path from "path";
import { getProjectRootAndAssert } from "./getProjectRootAndAssert.js";

export async function resolvePath(
  filePath: string,
  relativeToDir: string,
  rootIsProjectRoot: boolean,
  workingDir: string
) {
  return filePath.startsWith("/")
    ? rootIsProjectRoot
      ? path.join(await getProjectRootAndAssert(workingDir), filePath)
      : path.resolve(relativeToDir, filePath)
    : path.resolve(relativeToDir, filePath);
}
