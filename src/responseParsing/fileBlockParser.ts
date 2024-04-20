import { isDefined } from "../langTools/isDefined.js";
import { CodespinConfig } from "../settings/CodespinConfig.js";
import { SourceFile } from "../sourceCode/SourceFile.js";
import { extractFromMarkdownCodeBlock } from "./codeBlocks.js";
import {
  getEndFileContentsRegex,
  getStartFileContentsRegex,
} from "./markers.js";

type FileInfo = {
  path: string;
  contents: string;
};

export async function fileBlockParser(
  response: string,
  workingDir: string,
  config: CodespinConfig
): Promise<SourceFile[]> {
  return parseFileContents(response, config);
}

function parseFileContents(input: string, config: CodespinConfig): FileInfo[] {
  return input
    .split(getEndFileContentsRegex(config))
    .slice(0, -1) // Remove the last
    .filter((content) => content.trim() !== "")
    .map((content) => {
      const match = content.match(getStartFileContentsRegex(config));
      if (match && match.length === 3) {
        const contents = match[2].trim();

        return {
          path: match[1].trim(),
          contents: extractFromMarkdownCodeBlock(contents, true).contents,
        };
      }
      return null;
    })
    .filter(isDefined);
}
