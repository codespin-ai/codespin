import { exec } from "child_process";

export async function execString(
  command: string,
  workingDir: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { cwd: workingDir }, (error, stdout, stderr) => {
      if (error && error.code !== 1) {
        reject(error);
      } else if (stderr) {
        reject(new Error(stderr));
      } else {
        resolve(stdout);
      }
    });
  });
}
