import path from "path";
import { TemplateArgs } from "./TemplateArgs.js";
import { addLineNumbers } from "../text/addLineNumbers.js";
import { CodespinConfig } from "../settings/CodespinConfig.js";
import {
  getEndUpdatesMarker,
  getStartUpdatesMarker,
  getDeleteLinesMarker,
  getStartInsertLinesMarker,
  getEndInsertLinesMarker,
} from "../responseParsing/markers.js";
import { TemplateResult } from "../templating/getTemplate.js";

export default async function diffTemplate(
  args: TemplateArgs,
  config: CodespinConfig
): Promise<TemplateResult> {
  const prompt =
    (args.outPath
      ? printLine(
          `Generate code for the file "${relativePath(
            args.outPath,
            args.workingDir
          )}" based on the following instructions (enclosed between "-----").`,
          true
        )
      : "") +
    (args.outPath ? printLine("-----", true) : "") +
    printLine(printPrompt(args, false), args.outPath ? false : true) +
    (args.outPath ? printLine("-----", true) : "") +
    printIncludeFiles(args, true) +
    printFileTemplate(args, config);

  return { prompt, responseParser: "diff" };
}

function printLine(line: string | undefined, addBlankLine = false): string {
  return line
    ? line + (!line.endsWith("\n") ? "\n" : "") + (addBlankLine ? "\n" : "")
    : "\n";
}

function printPrompt(args: TemplateArgs, useLineNumbers: boolean) {
  return printLine(
    useLineNumbers ? args.promptWithLineNumbers : args.prompt,
    true
  );
}

function relativePath(filePath: string, workingDir: string) {
  return "./" + path.relative(workingDir, filePath);
}

function printFileTemplate(args: TemplateArgs, config: CodespinConfig) {
  const START_UPDATES_MARKER = getStartUpdatesMarker(config);
  const END_UPDATES_MARKER = getEndUpdatesMarker(config);
  const DELETE_LINES_MARKER = getDeleteLinesMarker(config);
  const START_INSERT_LINES_MARKER = getStartInsertLinesMarker(config);
  const END_INSERT_LINES_MARKER = getEndInsertLinesMarker(config);

  const tmpl = `
  I want you to suggest modifications to the files in the following format:

  Markers:
  - ${START_UPDATES_MARKER}, ${END_UPDATES_MARKER}, ${DELETE_LINES_MARKER}, ${START_INSERT_LINES_MARKER}, and ${END_INSERT_LINES_MARKER} are called markers.
  - $${START_UPDATES_MARKER}:file_path$ // Marks the beginning of updates for the file specified by file_path.
  - $${END_UPDATES_MARKER}:file_path$ // Marks the end of updates for the file specified by file_path.
  - Multiple files can be updated by repeating "$${START_UPDATES_MARKER}:file_path$" and "$${END_UPDATES_MARKER}:file_path$" blocks.

  Comments:
  - You must add one or more lines of comments before EACH ${DELETE_LINES_MARKER} or ${START_INSERT_LINES_MARKER} marker to explain what you're doing and why.
  - For delete operations, explain why the specific start and end lines were chosen for deletion, and include the line numbers in the comment.
  - Comments should be provided for EVERY SINGLE delete and insert operation, always referencing the relevant line numbers.
  - Keep the comments concise and focused on explaining the purpose and context of the requested modifications, without introducing additional instructions or reasoning.

  Deleting Lines:
  - ${DELETE_LINES_MARKER}:start_line:end_line // Indicates the lines to be deleted starting from start_line up to and including end_line.
    Line numbers are based on the original, unmodified file content.

  Inserting Lines:
  - ${START_INSERT_LINES_MARKER}:before_line // Indicates the start of lines to be inserted immediately before the line number specified by before_line.
    The before_line number is based on the original, unmodified file content.
  - ${END_INSERT_LINES_MARKER} // Marks the end of the lines to be inserted.
  - To insert at the end of the file, you can mention the last line number + 1 as the reference point.

  Rules:
  - While deleting, provide a comment explaining the reason for deleting the specific range of lines, and mentioning the line numbers.
  - While inserting, provide a comment explaining the purpose and placement of the inserted lines, and mentioning the line number.
  - Do not attempt to calculate or adjust the line numbers based on previous delete or insert operations.
    Always reference the line numbers from the original, unmodified file content.
  - Be precise and methodical in your modifications.
  - Double-check the line numbers to ensure they accurately represent the desired modifications based on the original line numbers.

  Let's look at some examples to illustrate the format:

  Example 1 (Updating Multiple Files):
  Suppose you have the following files:

  ./src/utils.ts:
      \`\`\`
      1: export function formatDate(date: Date) {
      2:   // Remove the time portion from the date string
      3:   return date.toISOString().split('T')[0];
      4: }
      5:
      6: export function capitalize(text: string) {
      7:   // Convert the first character to uppercase
      8:   return text.charAt(0).toUpperCase() + text.slice(1);
      9: }
      \`\`\`

  ./src/app.ts:
      \`\`\`
      1: import { formatDate } from './utils';
      2:
      3: const today = new Date();
      4: const formattedDate = formatDate(today);
      5: console.log('Today is', formattedDate);
      6: // TODO: Implement user login
      7: // TODO: Fetch data from API
      \`\`\`

  Modifications Required:
  - In utils.ts, remove the comment explaining the formatDate function.
  - In utils.ts, add a new function called 'truncate' to truncate a string to a specified length.
  - In app.ts, remove the TODO comments.
  - In app.ts, import the 'capitalize' function from utils.ts and use it to capitalize the 'formattedDate' before logging.

  Output diff:
      $${START_UPDATES_MARKER}:./src/utils.ts$

      // Remove comment on line 2
      ${DELETE_LINES_MARKER}:2:2

      // Add truncate function before line 10
      ${START_INSERT_LINES_MARKER}:10
      export function truncate(text: string, length: number) {
        if (text.length <= length) {
          return text;
        }
        return text.slice(0, length) + '...';
      }
      ${END_INSERT_LINES_MARKER}

      $${END_UPDATES_MARKER}:./src/utils.ts$

      $${START_UPDATES_MARKER}:./src/app.ts$

      // Remove TODO comments on lines 6-7
      ${DELETE_LINES_MARKER}:6:7

      // Update import statement before line 1
      ${DELETE_LINES_MARKER}:1:1
      ${START_INSERT_LINES_MARKER}:1
      import { formatDate, capitalize } from './utils';
      ${END_INSERT_LINES_MARKER}

      // Use capitalize function on formattedDate before line 5
      ${START_INSERT_LINES_MARKER}:5
      const capitalizedDate = capitalize(formattedDate);
      ${END_INSERT_LINES_MARKER}
      ${START_INSERT_LINES_MARKER}:6
      console.log('Today is', capitalizedDate);
      ${END_INSERT_LINES_MARKER}

      $${END_UPDATES_MARKER}:./src/app.ts$

  Example 2 (Deleting and Inserting Lines):
  Suppose you have the following file:

  ./src/config.ts:
      \`\`\`
      1: export const API_URL = 'https://api.example.com';
      2: export const API_KEY = 'abcdefghijklmnop';
      3: // Set the number of retries for failed requests
      4: export const MAX_RETRIES = 3;
      5: // Set the delay between retries in milliseconds
      6: export const RETRY_DELAY = 1000;
      7:
      8: export const CACHE_SIZE = 100;
      9: export const CACHE_EXPIRATION = 3600;
      \`\`\`

  Modifications Required:
  - Remove the 'API_KEY' constant.
  - Remove the comments above 'MAX_RETRIES' and 'RETRY_DELAY'.
  - Add a new constant 'API_TIMEOUT' with a value of 5000.
  - Update the 'CACHE_EXPIRATION' value to 7200.

  Output diff:
      $${START_UPDATES_MARKER}:./src/config.ts$

      // Remove API_KEY constant on line 2
      ${DELETE_LINES_MARKER}:2:2

      // Remove comments on lines 3 and 5
      ${DELETE_LINES_MARKER}:3:3
      ${DELETE_LINES_MARKER}:5:5

      // Add API_TIMEOUT constant before line 7
      ${START_INSERT_LINES_MARKER}:7
      export const API_TIMEOUT = 5000;
      ${END_INSERT_LINES_MARKER}

      // Update CACHE_EXPIRATION value on line 9
      ${DELETE_LINES_MARKER}:9:9
      ${START_INSERT_LINES_MARKER}:9
      export const CACHE_EXPIRATION = 7200;
      ${END_INSERT_LINES_MARKER}

      $${END_UPDATES_MARKER}:./src/config.ts$

  These examples demonstrate the format and usage of the markers for updating files, deleting lines, and inserting lines.
  Remember to always use the line numbers from the original, unmodified file content and avoid adjusting them based on prior modifications.
  Please double-check the line numbers in your modifications to ensure they accurately represent the desired changes based on the original file content.
  Provide a clear comment explaining the purpose and context for EACH delete and insert operation, always referencing the relevant line numbers.
  `;

  return printLine(fixTemplateWhitespace(tmpl), true);
}

function printIncludeFiles(args: TemplateArgs, useLineNumbers: boolean) {
  if (args.include.length === 0) {
    return "";
  } else {
    const text =
      printLine(
        useLineNumbers
          ? "Including relevant files below with line numbers added:"
          : "Including relevant files below:",
        true
      ) +
      args.include
        .map((file) => {
          if (file.type === "diff") {
            if (file.diff.trim().length > 0) {
              const text =
                printLine(
                  `Diff for the file ${relativePath(
                    file.path,
                    args.workingDir
                  )}:`
                ) +
                printLine("```") +
                printLine(file.diff) +
                printLine("```", true);

              return text;
            } else {
              return "";
            }
          } else {
            if (file.contents && file.contents.trim().length > 0) {
              const text =
                printLine(
                  `Contents of the file ${relativePath(
                    file.path,
                    args.workingDir
                  )}:`
                ) +
                printLine("```") +
                printLine(
                  useLineNumbers ? addLineNumbers(file.contents) : file.contents
                ) +
                printLine("```", true);

              return text;
            } else {
              return "";
            }
          }
        })
        .join("\n");
    return text;
  }
}

export function fixTemplateWhitespace(input: string) {
  // Split the string into an array of lines.
  const lines = input.split("\n");

  // Remove leading and trailing empty lines if found.
  if (lines[0].trim() === "") lines.shift();
  if (lines[lines.length - 1].trim() === "") lines.pop();

  // Identify the whitespace prior to the first non-empty line.
  const firstNonEmptyLine = lines.find((line) => line.trim() !== "");
  const leadingWhitespaceMatch = firstNonEmptyLine?.match(/^(\s+)/);
  const leadingWhitespace = leadingWhitespaceMatch
    ? leadingWhitespaceMatch[0]
    : "";

  // Subtract the whitespace from every other line, except empty lines.
  const transformedLines = lines.map((line) => {
    if (line.trim() === "") return line; // Return the empty line as it is.
    return line.startsWith(leadingWhitespace)
      ? line.slice(leadingWhitespace.length)
      : line;
  });

  return transformedLines.join("\n");
}
