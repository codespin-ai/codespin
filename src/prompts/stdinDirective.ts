import { writeError } from "../console.js";
import { getInvokeMode } from "../process/getInvokeMode.js";

export async function stdinDirective(
  contents: string,
  workingDir: string
): Promise<string> {
  if (getInvokeMode() === "cli") {
    let stdinContent = "";

    // Check if process.stdin is a TTY. If not, it means data is being piped in.
    if (!process.stdin.isTTY) {
      stdinContent = await new Promise<string>((resolve, reject) => {
        let data = "";
        process.stdin.on("data", (chunk) => {
          data += chunk;
        });
        process.stdin.on("end", () => {
          resolve(data);
        });
        process.stdin.on("error", reject);
      });
    }

    // Replace 'codespin:stdin' with the content piped into the process or empty string.
    const replacedContents = contents.replace(/codespin:stdin/g, stdinContent);
    return replacedContents;
  } else {
    return contents;
  }
}
