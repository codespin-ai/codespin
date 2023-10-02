import { exec } from "child_process";

export async function isCommitted(filePath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    exec(`git ls-files ${filePath}`, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      // If the file is tracked by git, it will appear in the stdout.
      resolve(!!stdout);
    });
  });
}
