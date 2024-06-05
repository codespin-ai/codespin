import { CodeSpinConfig } from "../settings/CodeSpinConfig.js";
import { SourceFile } from "../sourceCode/SourceFile.js";

export async function fileBlockParser(
  response: string,
  workingDir: string,
  config: CodeSpinConfig
): Promise<SourceFile[]> {
  return parseFileContents(response);
}

const filePathRegex = /File path:\s*(\.\/[\w./-]+)\s*\n^```([\s\S]*?)^```/gm;

function parseFileContents(input: string): SourceFile[] {
  const results: SourceFile[] = [];
  let remainingInput = input;

  while (remainingInput.trim() !== "") {
    const match = filePathRegex.exec(remainingInput);
    if (match) {
      const path = match[1]?.trim();
      const contents = match[2]?.trim();

      if (path && contents) {
        results.push({ path: path, contents: contents });
      }

      // Move the start position past the current match to search for the next block
      remainingInput = remainingInput.substring(match.index + match[0].length);

      filePathRegex.lastIndex = 0; // Reset the lastIndex to ensure the regex starts from the beginning of the new string slice
    } else {
      break; // No more matches, exit the loop
    }
  }

  return results;
}
