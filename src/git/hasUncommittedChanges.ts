import { execString } from "../process/execString.js";

export async function hasUncommittedChanges(
  workingDir: string
): Promise<boolean> {
  try {
    const status = await execString(`git status --porcelain`, workingDir);
    return status.length > 0;
  } catch (error) {
    return false;
  }
}
