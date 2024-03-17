// projectRoot.ts

import { getWorkingDir } from "../fs/workingDir.js";
import { execString } from "../process/execString.js";

/**
 * Async function that retrieves the project root for a git project.
 * It runs the 'git rev-parse --show-toplevel' command which gives the top-level directory
 * of the git repository. If the command succeeds, it means the current directory is inside a git repository
 * and the output will be the path to the root directory of that repository.
 * If the command fails, it either means git is not installed or the current directory is not inside a git repository.
 *
 * @returns Promise<string> - a promise that resolves to the path of the git project root or rejects with an error.
 */
export async function findGitProjectRoot(): Promise<string | undefined> {
  try {
    const result = await execString(
      "git rev-parse --show-toplevel",
      getWorkingDir()
    );

    // trim is used to remove the trailing newline character from the output
    return result.trim();
  } catch (error: any) {
    // Handle the error. For now, just throwing it further.
    return undefined;
  }
}
