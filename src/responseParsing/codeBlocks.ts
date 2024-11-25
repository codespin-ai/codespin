import { exception } from "../exception.js";

type CodeBlockInfo = {
  language?: string;
  contents: string;
};

export function extractFromMarkdownCodeBlock(
  input: string,
  isOptional: boolean
): CodeBlockInfo {
  const match = input.match(/```(\w*)\n?([\s\S]*?)```/);

  return match && match.length === 3
    ? {
        language: match[1] ? match[1].trim() : undefined, // Capture the optional language identifier
        contents: match[2].trim(), // Capture the code block contents
      }
    : isOptional
    ? {
        language: undefined,
        contents: input,
      }
    : exception("MISSING_CODE_BLOCK", "No valid markdown code block found.");
}
