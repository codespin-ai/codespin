import { SourceFile } from "../sourceCode/SourceFile.js";

export type StreamingFileParseResult =
  | { type: "text"; content: string }
  | { type: "file"; file: SourceFile }
  | { type: "new-file-block"; path: string }
  | { type: "markdown"; content: string };

type ParserState = {
  buffer: string;
  currentFilePath: string | null;
};

export const createStreamingFileParser = (
  callback: (result: StreamingFileParseResult) => void
) => {
  const state: ParserState = {
    buffer: "",
    currentFilePath: null,
  };

  const filePathRegex =
    /File path:\s*(\.\/[\w./-]+)\s*\n```(?:\w*\n)?([\s\S]*?)```\n?/gm;

  return function processChunk(chunk: string): void {
    // Immediately emit the chunk as text for streaming display
    callback({ type: "text", content: chunk });

    state.buffer += chunk;

    let lastIndex = 0;
    const matches = Array.from(state.buffer.matchAll(filePathRegex));

    for (const match of matches) {
      // Emit markdown block with content up to the file marker
      const markdownContent = state.buffer.slice(lastIndex, match.index);
      if (markdownContent) {
        callback({ type: "markdown", content: markdownContent });
      }

      callback({ type: "new-file-block", path: match[1] });
      callback({
        type: "file",
        file: {
          path: match[1],
          contents: match[2].trim() + "\n",
        },
      });

      lastIndex = match.index + match[0].length;
    }

    // Only keep unprocessed content in buffer
    state.buffer = state.buffer.slice(lastIndex);
  };
};
