import { execString } from "../process/execString.js";

export async function isGitRepo(workingDir: string): Promise<boolean> {
  try {
    await execString("git rev-parse --is-inside-work-tree", workingDir);
    return true;
  } catch (error) {
    return false;
  }
}
