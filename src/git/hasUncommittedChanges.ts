import { execString } from "../process/execString.js";
import { getPathRelativeToGitRoot } from "./getPathRelativeToGitRoot.js";

export async function hasUncommittedChanges(
  filePath: string,
  workingDir: string
): Promise<boolean> {
  try {
    const relativePath = await getPathRelativeToGitRoot(filePath, workingDir);
    const status = await execString(
      `git status --porcelain -- ${relativePath}`,
      workingDir
    );

    // git status --porcelain returns empty string if there are no changes
    return status.length > 0;
  } catch (error) {
    return false;
  }
}
