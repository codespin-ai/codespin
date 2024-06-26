import { execString } from "../process/execString.js";

let gitRoot: string | undefined;
let notUnderGit = false;

export async function getGitRoot(
  workingDir: string
): Promise<string | undefined> {
  if (notUnderGit) {
    return undefined;
  }

  try {
    if (!gitRoot) {
      const result = await execString(
        "git rev-parse --show-toplevel",
        workingDir
      );

      // trim is used to remove the trailing newline character from the output
      gitRoot = result.trim();
    }
    return gitRoot;
  } catch (error: any) {
    notUnderGit = true;
    return undefined;
  }
}
