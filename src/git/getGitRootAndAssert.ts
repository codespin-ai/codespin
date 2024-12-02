import { UnknownGitRootError } from "../errors.js";
import { exception } from "../exception.js";
import { getGitRoot } from "./getGitRoot.js";

export async function getGitRootAndAssert(workingDir: string): Promise<string> {
  const gitRoot = await getGitRoot(workingDir);
  return gitRoot || exception(new UnknownGitRootError());
}
