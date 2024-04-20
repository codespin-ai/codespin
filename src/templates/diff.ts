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

export default async function generate(
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
    printDeclarations(args) +
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
  - You must add one or more lines of comments before the ${DELETE_LINES_MARKER} or ${START_INSERT_LINES_MARKER} markers to explain what you're doing.

  Deleting Lines:
  - ${DELETE_LINES_MARKER}:start_line:end_line // Indicates the lines to be deleted starting from start_line up to and including end_line. Line numbers are based on the file's original state.

  Inserting Lines:
  - ${START_INSERT_LINES_MARKER}:after_line // Indicates the start of lines to be inserted immediately after the line number specified by after_line.
  - ${END_INSERT_LINES_MARKER} // Marks the end of the lines to be inserted.

  Rules:
  - To delete lines, use the ${DELETE_LINES_MARKER} marker followed by the start and end line numbers separated by a colon.
  - To insert lines, use the ${START_INSERT_LINES_MARKER} marker followed by the line number after which the lines should be inserted, then add the lines to be inserted, 
    and finally use the ${END_INSERT_LINES_MARKER} to mark the end of the inserted lines.
  - Line numbers always refer to the line numbers in the original, unmodified file. The first line is line 1, not line 0.
  - Do not worry about line numbers changing as content is updated or added. Always use the original line numbers in your markers.
  - Be precise and methodical in your modifications.

  Let's look at some examples to illustrate the format:

  Example 1 (Updating Multiple Files):
  Suppose you have the following files:

  ./src/utils.ts:
      \`\`\`
      1: export function formatDate(date: Date) {
      2:   return date.toISOString().split('T')[0];
      3: }
      4:
      5: export function capitalize(text: string) {
      6:   return text.charAt(0).toUpperCase() + text.slice(1);
      7: }
      \`\`\`

  ./src/app.ts:
      \`\`\`
      1: import { formatDate } from './utils';
      2:
      3: const today = new Date();
      4: const formattedDate = formatDate(today);
      5: console.log('Today is', formattedDate);
      \`\`\`

  Modifications Required:
  - In utils.ts, add a new function called 'truncate' to truncate a string to a specified length.
  - In app.ts, import the 'capitalize' function from utils.ts and use it to capitalize the 'formattedDate' before logging.

  Output diff:
      $${START_UPDATES_MARKER}:./src/utils.ts$

      // Add truncate function
      ${START_INSERT_LINES_MARKER}:7
      export function truncate(text: string, length: number) {
        if (text.length <= length) {
          return text;
        }
        return text.slice(0, length) + '...';
      }
      ${END_INSERT_LINES_MARKER}

      $${END_UPDATES_MARKER}:./src/utils.ts$

      $${START_UPDATES_MARKER}:./src/app.ts$

      // Import capitalize function
      ${DELETE_LINES_MARKER}:1:1
      ${START_INSERT_LINES_MARKER}:0
      import { formatDate, capitalize } from './utils';
      ${END_INSERT_LINES_MARKER}

      // Capitalize formattedDate
      ${DELETE_LINES_MARKER}:5:5
      ${START_INSERT_LINES_MARKER}:4
      const capitalizedDate = capitalize(formattedDate);
      console.log('Today is', capitalizedDate);
      ${END_INSERT_LINES_MARKER}

      $${END_UPDATES_MARKER}:./src/app.ts$

  Example 2 (Deleting and Inserting Lines):
  Suppose you have the following file:

  ./src/config.ts:
      \`\`\`
      1: export const API_URL = 'https://api.example.com';
      2: export const API_KEY = 'abcdefghijklmnop';
      3:
      4: export const MAX_RETRIES = 3;
      5: export const RETRY_DELAY = 1000;
      6:
      7: export const CACHE_SIZE = 100;
      8: export const CACHE_EXPIRATION = 3600;
      \`\`\`

  Modifications Required:
  - Remove the 'API_KEY' constant.
  - Add a new constant 'API_TIMEOUT' with a value of 5000.
  - Update the 'CACHE_EXPIRATION' value to 7200.

  Output diff:
      $${START_UPDATES_MARKER}:./src/config.ts$

      // Remove API_KEY constant
      ${DELETE_LINES_MARKER}:2:2

      // Add API_TIMEOUT constant
      ${START_INSERT_LINES_MARKER}:5
      export const API_TIMEOUT = 5000;
      ${END_INSERT_LINES_MARKER}

      // Update CACHE_EXPIRATION value
      ${DELETE_LINES_MARKER}:8:8
      ${START_INSERT_LINES_MARKER}:7
      export const CACHE_EXPIRATION = 7200;
      ${END_INSERT_LINES_MARKER}

      $${END_UPDATES_MARKER}:./src/config.ts$

  These examples demonstrate the format and usage of the markers for updating files, deleting lines, and inserting lines. Remember to follow the rules and be precise in your modifications.
  `;

  return printLine(fixTemplateWhitespace(tmpl), true);
}

function printDeclarations(args: TemplateArgs) {
  if (args.declare.length === 0) {
    return "";
  } else {
    const text =
      printLine(
        "Here are some relevant declarations/signatures for external dependencies:",
        true
      ) +
      args.declare
        .map(
          (file) =>
            printLine(
              `Declarations for ${relativePath(file.path, args.workingDir)}:`
            ) +
            printLine("```") +
            printLine(file.contents) +
            printLine("```", true)
        )
        .join("\n");
    return text;
  }
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
