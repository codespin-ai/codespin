import { CodespinConfig } from "../settings/CodespinConfig.js";
import { SourceFile } from "../sourceCode/SourceFile.js";
import { applyCustomDiff } from "./applyCustomDiff.js";
import {
  getEndFileContentsRegex,
  getStartFileContentsRegex,
} from "./markers.js";

type FileInfo = {
  path: string;
  contents: string;
};

export type ParseFunc = (
  response: string,
  isDiff: boolean | undefined,
  workingDir: string
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
  // Split by '$END_FILE_CONTENTS' to get each file's content
  return input
    .split(getEndFileContentsRegex(config))
    .filter((content) => content.trim() !== "") // Remove any empty splits
    .map((content) => {
      // Extract file name and contents using regex
      const match = content.match(getStartFileContentsRegex(config));
      if (match && match.length === 3) {
        return {
          path: match[1].trim(),
          contents: match[2].trim(),
        };
      }
      return null;
    })
    .filter(Boolean) as FileInfo[]; // Remove any null results
}
