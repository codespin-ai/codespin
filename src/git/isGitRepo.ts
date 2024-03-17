import { getWorkingDir } from "../fs/workingDir.js";
import { execString } from "../process/execString.js";

export async function isGitRepo(): Promise<boolean> {
  try {
    await execString("git rev-parse --is-inside-work-tree", getWorkingDir());
    return true;
  } catch (error) {
    return false;
  }
}
