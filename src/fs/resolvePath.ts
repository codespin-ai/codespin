import * as path from "path";
import { getProjectRootAndAssert } from "./getProjectRootAndAssert.js";

export async function resolvePathInProject(
  filePath: string,
  relativeToDir: string,
  workingDir: string
) {
  return filePath.startsWith("/")
    ? path.join(await getProjectRootAndAssert(workingDir), filePath)
    : path.resolve(relativeToDir, filePath);
}
