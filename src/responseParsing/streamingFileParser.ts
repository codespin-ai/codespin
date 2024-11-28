import { SourceFile } from "../sourceCode/SourceFile.js";

export type StreamingFileParseResult =
  | { type: "text"; content: string }
  | { type: "end-file-block"; file: SourceFile }
  | { type: "start-file-block"; path: string }
  | { type: "markdown"; content: string };

// Regex to match the start of a file block
const startFileRegex = /File path:\s*(\.\/[\w./-]+)\s*\n\s*```(?:\w*\n)?/g;

// Regex to match the end of a file block
const endFileRegex = /\s*```\n?/g;

// Regex to match language identifier line
const languageLineRegex = /^\w+\n/;

export function createStreamingFileParser(
  callback: (result: StreamingFileParseResult) => void
): (chunk: string) => void {
  let buffer: string = ""; // Buffer to accumulate incoming text
  let insideFileBlock: boolean = false; // Flag to track if we're inside a file block
  let currentFilePath: string = ""; // Variable to store the current file path

  return function processChunk(chunk: string): void {
    // Emit the incoming chunk as a "text" event immediately and unconditionally
    callback({ type: "text", content: chunk });

    // Append the chunk to the buffer
    buffer += chunk;

    // Continuously process the buffer for all possible matches
    processBuffer();
  };

  function processBuffer(): void {
    while (true) {
      if (!insideFileBlock) {
        // Look for the start of a file block
        startFileRegex.lastIndex = 0; // Reset regex state
        const startMatch = startFileRegex.exec(buffer);

        if (startMatch) {
          const matchStartIndex = startMatch.index;
          const matchEndIndex = startFileRegex.lastIndex;

          // Emit any markdown before the start of the file block
          if (matchStartIndex > 0) {
            const markdownContent = buffer.slice(0, matchStartIndex);
            if (markdownContent.trim()) {
              callback({ type: "markdown", content: markdownContent });
            }
          }

          // Extract the file path
          currentFilePath = startMatch[1];
          callback({ type: "start-file-block", path: currentFilePath });

          // Update the buffer to remove the processed part
          buffer = buffer.slice(matchEndIndex);
          insideFileBlock = true;

          // Continue the loop to check for more matches
          continue;
        } else {
          // No more start matches; exit the loop
          break;
        }
      } else {
        // Inside a file block, look for the end
        endFileRegex.lastIndex = 0; // Reset regex state
        const endMatch = endFileRegex.exec(buffer);

        if (endMatch) {
          const matchStartIndex = endMatch.index;
          const matchEndIndex = endFileRegex.lastIndex;

          // Extract the file content up to the end of the block
          let fileContent = buffer.slice(0, matchStartIndex);

          // Strip out language identifier if present
          const languageMatch = languageLineRegex.exec(fileContent);
          if (languageMatch) {
            fileContent = fileContent.slice(languageMatch[0].length);
          }

          // Emit the end of the file block with the correct path
          const sourceFile: SourceFile = {
            path: currentFilePath,
            contents: fileContent.trim(),  // Also trim any extra whitespace
          };
          callback({ type: "end-file-block", file: sourceFile });

          // Update the buffer to remove the processed part
          buffer = buffer.slice(matchEndIndex);

          // Reset the current file path
          currentFilePath = "";

          // Emit the remaining buffer as text (if any)
          if (buffer.length > 0) {
            callback({ type: "text", content: buffer });
          }

          insideFileBlock = false;

          // Continue the loop to check for more matches
          continue;
        } else {
          // No end match found; wait for more chunks
          break;
        }
      }
    }
  }
}