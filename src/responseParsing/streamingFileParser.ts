import { SourceFile } from "../sourceCode/SourceFile.js";

export type StreamingFileParseResult =
  | { type: "text"; content: string }
  | { type: "file"; file: SourceFile }
  | { type: "new-file-block"; path: string };

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
    /File path:\s*(\.\/[\w./-]+)\s*\n^```(?:\w*\n)?([\s\S]*?)^```/gm;

  return function processChunk(chunk: string): void {
    state.buffer += chunk;

    while (true) {
      if (!state.currentFilePath) {
        const pathMatch = /File path:\s*(\.\/[\w./-]+)/.exec(state.buffer);
        if (pathMatch) {
          state.currentFilePath = pathMatch[1].trim();
          callback({ type: "new-file-block", path: state.currentFilePath });
        }
      }

      const match = filePathRegex.exec(state.buffer);

      if (!match) {
        if (!state.currentFilePath) {
          callback({ type: "text", content: chunk });
        }
        break;
      }

      const [fullMatch, path, contents] = match;
      callback({
        type: "file",
        file: { path: path.trim(), contents: contents.trim() },
      });

      state.currentFilePath = null;
      const remaining = state.buffer.substring(match.index + fullMatch.length);
      if (remaining.length > 0) {
        callback({ type: "text", content: remaining });
      }

      state.buffer = remaining;
      filePathRegex.lastIndex = 0;
    }
  };
};
