// readFileContents.ts
import { promises as fs } from "fs";

async function readFileContents(
  filePath: string,
  lineNumbers: boolean
): Promise<string> {
  const fileContent = await fs.readFile(filePath, "utf-8");

  if (lineNumbers) {
    return fileContent
      .split("\n")
      .map((line, index) => `${index + 1}: ${line}`)
      .join("\n");
  }

  return fileContent;
}

export { readFileContents };
