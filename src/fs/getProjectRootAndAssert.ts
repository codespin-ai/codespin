import { exception } from "../exception.js";
import { getProjectRoot } from "./getProjectRoot.js";

export async function getProjectRootAndAssert(): Promise<string> {
  const projectRoot = await getProjectRoot();

  return (
    projectRoot ||
    exception(
      `You need to do "codespin init" (or "codespin init --force") from the root of the project.`
    )
  );
}
