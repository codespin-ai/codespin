type CodeBlockInfo = {
  language?: string;
  contents: string;
};

export function extractFromCodeBlock(input: string): CodeBlockInfo {
  const match = input.match(/```(\w*)\n?([\s\S]*?)```/);
  if (match && match.length === 3) {
    return {
      language: match[1] ? match[1].trim() : undefined, // Capture the optional language identifier
      contents: match[2].trim(), // Capture the code block contents
    };
  }
  throw new Error("No valid markdown code block found.");
}
