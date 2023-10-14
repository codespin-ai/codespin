// projectRoot.ts

import { exec } from "child_process";
import { promisify } from "util";

// Use promisify to convert the callback-based exec function into a promise-based one.
const execPromise = promisify(exec);

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
    const { stdout } = await execPromise("git rev-parse --show-toplevel");

    // trim is used to remove the trailing newline character from the output
    return stdout.trim();
  } catch (error: any) {
    // Handle the error. For now, just throwing it further.
    return undefined;
  }
}
