import path from "path";
import { getProjectRoot } from "./getProjectRoot.js";
import { exception } from "../exception.js";

export async function resolveProjectFilePath(
  pathFragment: string,
  relativeTo: string
): Promise<string> {
  if (pathFragment.startsWith("/")) {
    const projectRoot = await getProjectRoot();

    return projectRoot
      ? path.join(projectRoot, pathFragment)
      : exception(
          `Unable to find project root. Have you done a "codespin init"?`
        );
  } else {
    return path.resolve(relativeTo, pathFragment);
  }
}
