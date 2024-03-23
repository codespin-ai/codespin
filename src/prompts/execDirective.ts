import path from "path";
import { getWorkingDir } from "../fs/workingDir.js";
import { execString } from "../process/execString.js";

export async function execDirective(
  contents: string,
  promptFilePath: string | undefined
): Promise<string> {
  const execPattern = /codespin:exec:(.+)/g;
  let match;

  // Using a while loop to iterate through all matches
  while ((match = execPattern.exec(contents)) !== null) {
    const command = match[1];

    const commandDir = promptFilePath
      ? path.dirname(promptFilePath)
      : getWorkingDir();

    let commandOutput;

    try {
      commandOutput = await execString(command, commandDir);
    } catch (err: any) {
      throw new Error(
        `Failed to execute command: ${command}. Error: ${err.message}`
      );
    }

    // Replace the matched pattern with the command output
    contents = contents.replace(match[0], commandOutput);
  }

  return contents;
}
