import { CodeSpinConfig } from "../settings/CodeSpinConfig.js";
import { SourceFile } from "../sourceCode/SourceFile.js";

export async function fileBlockParser(
  response: string,
  workingDir: string,
  xmlCodeBlockElement: string | undefined,
  config: CodeSpinConfig
): Promise<SourceFile[]> {
  if (xmlCodeBlockElement) {
    return parseXmlContent(response, xmlCodeBlockElement);
  }
  return parseFileContent(response);
}

const filePathRegex =
  /File path:\s*([\w./-]+)\s*\n^```(?:\w*\n)?([\s\S]*?)^```/gm;

// This regex captures anything that looks like "File path: path" format
const filePathExtractor = /File path:\s*([\w./-]+)/;

function parseFileContent(input: string): SourceFile[] {
  const results: SourceFile[] = [];
  let remainingInput = input;

  while (remainingInput.trim() !== "") {
    const match = filePathRegex.exec(remainingInput);
    if (match) {
      const path = match[1]?.trim();
      const content = match[2]?.trim();

      if (path && content) {
        results.push({ path: path, content: content });
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

function parseXmlContent(input: string, xmlElement: string): SourceFile[] {
  const results: SourceFile[] = [];

  // Create a regex that matches the XML tags and captures their content
  const xmlRegex = new RegExp(
    `<${xmlElement}>([\\s\\S]*?)</${xmlElement}>`,
    "g"
  );

  let match;
  while ((match = xmlRegex.exec(input)) !== null) {
    const content = match[1]?.trim();
    if (!content) continue;

    // Split input into lines and look backwards from the match for the file path
    const upToMatch = input.substring(0, match.index);
    const lines = upToMatch.split("\n");

    // Find the last non-empty line before the XML block
    let pathLine = "";
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line) {
        pathLine = line;
        break;
      }
    }

    // Extract the file path using the existing pattern
    const pathMatch = filePathExtractor.exec(pathLine);
    if (pathMatch) {
      const path = pathMatch[1].trim();
      results.push({ path, content: content });
    }
  }

  return results;
}
