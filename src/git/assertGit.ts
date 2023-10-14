import { exception } from "../exception.js";
import { findGitProjectRoot } from "./findGitProjectRoot.js";

export async function assertGit(): Promise<string | never> {
  const gitDir = await findGitProjectRoot();

  if (!gitDir) {
    exception(`The project must be under git.`);
  }

  return gitDir;
}
