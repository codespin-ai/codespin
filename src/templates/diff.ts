import path from "path";
import { TemplateArgs } from "./TemplateArgs.js";
import { addLineNumbers } from "../text/addLineNumbers.js";
import { CodespinConfig } from "../settings/CodespinConfig.js";
import {
  getEndReplaceLinesMarker,
  getEndUpdatesMarker,
  getStartReplaceLinesMarker,
  getStartUpdatesMarker,
} from "../prompts/markers.js";

export default async function generate(
  args: TemplateArgs,
  config: CodespinConfig
): Promise<string> {
  return (
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
    printFileTemplate(args, config)
  );
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
  const START_REPLACE_LINES_MARKER = getStartReplaceLinesMarker(config);
  const END_REPLACE_LINES_MARKER = getEndReplaceLinesMarker(config);

  const tmpl = `
  I want you to suggest modifications to the files in the following format:
  - $${START_UPDATES_MARKER}:file_path$: Marks the beginning of updates for the file specified by file_path.
  - $${END_UPDATES_MARKER}:file_path$: Marks the end of updates for the file specified by file_path.
  - Multiple files can be updated by repeating "$${START_UPDATES_MARKER}:file_path$ and $${END_UPDATES_MARKER}:file_path$ blocks

  Within a block:
  - $${START_REPLACE_LINES_MARKER}:start_line_num-line_count$: Indicates the start of a block of lines to be replaced starting at the specified line number with line_count indicating how many lines to replace. Line numbers are based on the file's original state.
  - $${END_REPLACE_LINES_MARKER}$: Marks the end of the replace block.
  - To delete lines, simply don't include any lines between the $${START_REPLACE_LINES_MARKER}$ and $${END_REPLACE_LINES_MARKER}$ markers.
  - To add lines, include the new lines between the $${START_REPLACE_LINES_MARKER}$ and $${END_REPLACE_LINES_MARKER}$ markers without a corresponding original line number range.
  - Line numbers always reference the original line numbers.
  - Do not worry about line numbers changing as content is added. The references always point to the original line numbers.
  - You can add comments after the last $ of each marker, on the same line.

  Let's look at some examples:

  Case 1 (Updating Multiple Files):
  Suppose you have the following files:

  ./src/math_operations.ts:
      \`\`\`
      1: export function addNumbers(a: number, b: number) {
      2:   return a + b;
      3: }
      4:
      5: export function subtractNumbers(a: number, b: number) {
      6:   return a - b;
      7: }
      \`\`\`

  ./src/app.ts:
      \`\`\`
      1: import { addNumbers, subtractNumbers } from './math_operations';
      2:
      3: const result1 = addNumbers(5, 3);
      4: console.log('Result 1:', result1);
      5:
      6: const result2 = subtractNumbers(10, 7);
      7: console.log('Result 2:', result2);
      \`\`\`

  Modifications Required:
  - In math_operations.ts, add a new function to multiply numbers
  - In app.ts, use the new multiplyNumbers function and log the result

  Output diff:
      $${START_UPDATES_MARKER}:./src/math_operations.ts$

      $${START_REPLACE_LINES_MARKER}:8-0$ // Add multiplyNumbers function
      export function multiplyNumbers(a: number, b: number) {
        return a * b;
      }
      $${END_REPLACE_LINES_MARKER}$

      $${END_UPDATES_MARKER}:./src/math_operations.ts$

      $${START_UPDATES_MARKER}:./src/app.ts$

      $${START_REPLACE_LINES_MARKER}:1-1$ // Update import statement
      import { addNumbers, subtractNumbers, multiplyNumbers } from './math_operations';
      $${END_REPLACE_LINES_MARKER}$

      $${START_REPLACE_LINES_MARKER}:8-0$ // Use multiplyNumbers function
      const result3 = multiplyNumbers(4, 5);
      console.log('Result 3:', result3);
      $${END_REPLACE_LINES_MARKER}$

      $${END_UPDATES_MARKER}:./src/app.ts$

  Case 2 (Deleting Across Multiple Files):
  Suppose you have the following files:

  ./src/math_operations.ts:
      \`\`\`
      1: export function addNumbers(a: number, b: number) {
      2:   return a + b;
      3: }
      4:
      5: export function subtractNumbers(a: number, b: number) {
      6:   return a - b;
      7: }
      \`\`\`

  ./src/app.ts:
      \`\`\`
      1: import { addNumbers, subtractNumbers } from './math_operations';
      2:
      3: const result1 = addNumbers(5, 3);
      4: console.log('Result 1:', result1);
      5:
      6: const result2 = subtractNumbers(10, 7);
      7: console.log('Result 2:', result2);
      \`\`\`

  Modifications Required:
  - Delete the subtractNumbers function from math_operations.ts
  - Remove the usage of subtractNumbers from app.ts

  Output diff:
      $${START_UPDATES_MARKER}:./src/math_operations.ts$

      $${START_REPLACE_LINES_MARKER}:5-3$ // Delete subtractNumbers function
      $${END_REPLACE_LINES_MARKER}$

      $${END_UPDATES_MARKER}:./src/math_operations.ts$

      $${START_UPDATES_MARKER}:./src/app.ts$

      $${START_REPLACE_LINES_MARKER}:1-1$ // Update import statement
      import { addNumbers } from './math_operations';
      $${END_REPLACE_LINES_MARKER}$

      $${START_REPLACE_LINES_MARKER}:6-2$ // Remove usage of subtractNumbers
      $${END_REPLACE_LINES_MARKER}$

      $${END_UPDATES_MARKER}:./src/app.ts$

  Case 3 (Adding and Replacing Across Multiple Files):
  Suppose you have the following files:

  ./src/math_operations.ts:
      \`\`\`
      1: export function addNumbers(a: number, b: number) {
      2:   return a + b;
      3: }
      \`\`\`

  ./src/app.ts:
      \`\`\`
      1: import { addNumbers } from './math_operations';
      2:
      3: const result1 = addNumbers(5, 3);
      4: console.log('Result 1:', result1);
      \`\`\`

  Modifications Required:
  - In math_operations.ts, add a new function to calculate the square of a number
  - In app.ts, replace the addNumbers usage with the new square function

  Output diff:
      $${START_UPDATES_MARKER}:./src/math_operations.ts$

      $${START_REPLACE_LINES_MARKER}:4-0$ // Add square function
      export function square(num: number) {
        return num * num;
      }
      $${END_REPLACE_LINES_MARKER}$

      $${END_UPDATES_MARKER}:./src/math_operations.ts$

      $${START_UPDATES_MARKER}:./src/app.ts$

      $${START_REPLACE_LINES_MARKER}:1-1$ // Update import statement
      import { square } from './math_operations';
      $${END_REPLACE_LINES_MARKER}$

      $${START_REPLACE_LINES_MARKER}:3-1$ // Replace addNumbers usage with square
      const result1 = square(5);
      $${END_REPLACE_LINES_MARKER}$

      $${END_UPDATES_MARKER}:./src/app.ts$

  Other instructions: make sure you correctly identify line numbers while replacing.

  For example, in ./src/math_operations.ts:
      \`\`\`
      1: export function addNumbers(a: number, b: number) {
      2:   return a + b;
      3: }
      4:
      5: export function subtractNumbers(a: number, b: number) {
      6:   return a - b;
      7: }
      \`\`\`

  If your intent is to fully replace the function subtractNumbers(), you must mention the line number as 5, and count as 3 to include the trailing curly braces.

  Be methodical and precise.
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
