import { SourceFile } from "../sourceCode/SourceFile.js";

export type StreamingFileParseResult =
  | { type: "text"; content: string }
  | { type: "end-file-block"; file: SourceFile }
  | { type: "start-file-block"; path: string }
  | { type: "markdown"; content: string };

type ParserState = {
  buffer: string;
  currentFilePath: string | null;
  insideFileBlock: boolean;
};

export const createStreamingFileParser = (
  callback: (result: StreamingFileParseResult) => void
) => {
  const state: ParserState = {
    buffer: "",
    currentFilePath: null,
    insideFileBlock: false,
  };

  const filePathRegex =
    /File path:\s*(\.\/[\w./-]+)\s*\n```(?:\w*\n)?([\s\S]*?)```\n?/gm;

  const flushBufferAsText = () => {
    if (state.buffer.trim()) {
      const content = state.buffer;
      callback({ type: "text", content });
      callback({ type: "markdown", content });
    }
    state.buffer = "";
  };

  return function processChunk(chunk: string): void {
    state.buffer += chunk;

    let lastIndex = 0;
    const matches = Array.from(state.buffer.matchAll(filePathRegex));

    for (const match of matches) {
      // Flush any preceding content as text and markdown
      const preFileContent = state.buffer.slice(lastIndex, match.index);
      if (preFileContent.trim()) {
        state.buffer = preFileContent;
        flushBufferAsText();
      }

      // Process the file block
      const filePath = match[1];
      const fileContent = match[2].trim() + "\n";

      callback({ type: "start-file-block", path: filePath });
      callback({ type: "text", content: fileContent });
      callback({
        type: "end-file-block",
        file: {
          path: filePath,
          contents: fileContent,
        },
      });

      lastIndex = match.index + match[0].length;
    }

    // Process remaining content after the last match
    state.buffer = state.buffer.slice(lastIndex);

    if (!state.buffer.trim()) {
      state.buffer = "";
    }
  };
};
