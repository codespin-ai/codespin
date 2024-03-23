import path from "path";
import { getProjectRootAndAssert } from "./getProjectRootAndAssert.js";

export async function getPathRelativeToProjectRoot(
  filePath: string
): Promise<string> {
  const projectRoot = await getProjectRootAndAssert();
  return path.relative(projectRoot, filePath);
}
