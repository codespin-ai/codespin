import { exception } from "../exception.js";
import { getGitRoot } from "./getGitRoot.js";

export async function getGitRootAndAssert(workingDir: string): Promise<string> {
  const gitRoot = await getGitRoot(workingDir);
  return (
    gitRoot ||
    exception(
      `You need to do "codespin init" (or "codespin init --force") from the root of the project.`
    )
  );
}
