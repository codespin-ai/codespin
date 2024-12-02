import { UnknownProjectRootError } from "../errors.js";
import { exception } from "../exception.js";
import { getProjectRoot } from "./getProjectRoot.js";

export async function getProjectRootAndAssert(
  workingDir: string
): Promise<string> {
  const projectRoot = await getProjectRoot(workingDir);

  return projectRoot || exception(new UnknownProjectRootError());
}
