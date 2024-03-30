import { exception } from "../exception.js";
import { getProjectRoot } from "./getProjectRoot.js";

export async function getProjectRootAndAssert(workingDir: string): Promise<string> {
  const projectRoot = await getProjectRoot(workingDir);

  return (
    projectRoot ||
    exception(
      `You need to do "codespin init" (or "codespin init --force") from the root of the project.`
    )
  );
}
