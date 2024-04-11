import { SourceFile } from "../sourceCode/SourceFile.js";
import { applyCustomDiff } from "./applyCustomDiff.js";
import { extractFromCodeBlock } from "./extractFromCodeBlock.js";

type FileInfo = {
  path: string;
  contents: string;
};

export type ParseFunc = (
  response: string,
  isDiff: boolean | undefined
) => Promise<SourceFile[]>;

export async function extractCode(
  response: string,
  isDiff: boolean | undefined
): Promise<SourceFile[]> {
  return isDiff ? await applyCustomDiff(response) : parseFileContents(response);
}

const parseFileContents = (input: string): FileInfo[] => {
  // Split by '$END_FILE_CONTENTS' to get each file's content
  return input
    .split(/\$END_FILE_CONTENTS:.*?\$/)
    .filter((content) => content.trim() !== "") // Remove any empty splits
    .map((content) => {
      // Extract file name and contents using regex
      const match = content.match(/\$START_FILE_CONTENTS:(.*?)\$(.*)/s);
      if (match && match.length === 3) {
        return {
          path: match[1].trim(),
          contents: match[2].trim(),
        };
      }
      return null;
    })
    .filter(Boolean) as FileInfo[]; // Remove any null results
};
