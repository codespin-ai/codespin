import { CodespinConfig } from "../settings/CodespinConfig.js";
import { SourceFile } from "../sourceCode/SourceFile.js";
import { applyCustomDiff } from "../prompts/applyCustomDiff.js";
import {
  getEndFileContentsRegex,
  getStartFileContentsRegex,
} from "./markers.js";
import { extractFromMarkdownCodeBlock } from "./codeblocks.js";
import { isDefined } from "../langTools/isDefined.js";

type FileInfo = {
  path: string;
  contents: string;
};

export type ParseFunc = (
  response: string,
  isDiff: boolean | undefined,
  workingDir: string,
  config: CodespinConfig
) => Promise<SourceFile[]>;

export async function extractCode(
  response: string,
  isDiff: boolean | undefined,
  workingDir: string,
  config: CodespinConfig
): Promise<SourceFile[]> {
  return isDiff
    ? await applyCustomDiff(response, workingDir, config)
    : parseFileContents(response, config);
}

function parseFileContents(input: string, config: CodespinConfig): FileInfo[] {
  return input
    .split(getEndFileContentsRegex(config))
    .filter((content) => content.trim() !== "") // Remove any empty splits
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
