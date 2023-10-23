import { exec } from "child_process";
import path from "path";

export async function execDirective(
  contents: string,
  promptFilePath: string | undefined,
  baseDir: string = ""
): Promise<string> {
  const execPattern = /codespin:exec:(.+)/g;
  let match;

  const execPromise = (
    command: string,
    workingDirectory: string
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      exec(command, { cwd: workingDirectory }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout.trim());
      });
    });
  };

  // Using a while loop to iterate through all matches
  while ((match = execPattern.exec(contents)) !== null) {
    const command = match[1];
    const commandWorkingDirectory = promptFilePath
      ? path.dirname(promptFilePath)
      : process.cwd();

    let commandOutput;
    try {
      commandOutput = await execPromise(command, commandWorkingDirectory);
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
