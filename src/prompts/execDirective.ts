import path from "path";

import { execString } from "../process/execString.js";

export async function execDirective(
  content: string,
  promptFilePath: string | undefined,
  workingDir: string
): Promise<string> {
  const execPattern = /codespin:exec:(.+)/g;
  let match;

  // Using a while loop to iterate through all matches
  while ((match = execPattern.exec(content)) !== null) {
    const command = match[1];

    const commandDir = promptFilePath
      ? path.dirname(promptFilePath)
      : workingDir;

    const commandOutput = await execString(command, commandDir);

    // Replace the matched pattern with the command output
    content = content.replace(match[0], commandOutput);
  }

  return content;
}
