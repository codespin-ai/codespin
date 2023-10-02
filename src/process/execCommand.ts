import { exec } from "child_process";
import { promisify } from "util";

const asyncExec = promisify(exec);

/**
 * Calls an executable with arguments.
 *
 * @param {string} executable The executable to run.
 * @param {Array<string>} argsList The list of arguments to pass to the executable.
 * @returns {Promise<string>} Resolves with the standard output of the command.
 */
export async function execCommand(
  executable: string,
  argsList: Array<string>
): Promise<string> {
  const command = `${executable} ${argsList.join(" ")}`;
  try {
    const { stdout } = await asyncExec(command);
    return stdout;
  } catch (error: any) {
    throw new Error(`Error executing command: ${command}. ${error.message}`);
  }
}
