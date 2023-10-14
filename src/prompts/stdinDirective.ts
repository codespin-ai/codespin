export async function stdinDirective(contents: string): Promise<string> {
  let stdinContent = "";

  // Check if process.stdin is a TTY. If not, it means data is being piped in.
  if (!process.stdin.isTTY) {
    try {
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
    } catch (error) {
      console.error("Error reading from stdin:", error);
    }
  }

  // Replace 'codespin::stdin' with the content piped into the process or empty string.
  const replacedContents = contents.replace(/codespin::stdin/g, stdinContent);
  return replacedContents;
}
