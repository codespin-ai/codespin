import path from "path";
import { getGitRoot } from "../git/getGitRoot.js";
import { exception } from "../exception.js";

export async function resolveProjectFilePath(
  pathFragment: string,
  relativeTo: string,
  errors?: {
    missingGit?: string;
  }
) {
  if (pathFragment.startsWith("/")) {
    const projectRoot = await getGitRoot();

    if (!projectRoot) {
      exception(errors?.missingGit || "The project must be under git.");
    }

    return path.join(projectRoot, pathFragment);
  } else {
    return path.resolve(relativeTo, pathFragment);
  }
}
