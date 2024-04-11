import path from "path";
import { TemplateArgs } from "./TemplateArgs.js";
import { addLineNumbers } from "../text/addLineNumbers.js";

export default async function generate(args: TemplateArgs): Promise<string> {
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
    printFileTemplate(args)
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

function printFileTemplate(args: TemplateArgs) {
  const filePath = args.outPath
    ? relativePath(args.outPath, args.workingDir)
    : "./some/path/filename.ext";

  const tmpl = `
  I want you to respond in the following format:

  - $START_UPDATES:file_path$: Marks the beginning of updates for the file specified by file_path.
  - $INSERT_LINES:line_number$: Indicates the start of a block of lines to be inserted at the specified line_number. The line number is based on the file's original state.
  - $END_INSERT_LINES$: Marks the end of the insertion block.
  - $DELETE_LINES:from_line_num-to_line_num$: Specifies a range of lines to be deleted, inclusive of both from_line_num and to_line_num.
  - $END_UPDATES:file_path$: Marks the end of updates for the file specified by file_path.
  - line numbers always reference the original line numbers.
  - Do not worry about line numbers changing as content is added. The references always point to the original line numbers.
  - To replace a line, you'll have to delete a line and insert it again.
  
  Example:

  Suppose you have a file named math_operations.ts (with line numbers added) with the following content:

  \`\`\`
  1: function addNumbers(a: number, b: number) {
  2:   let result = a + b;
  3:   console.log("The result is: " + result);
  4:   return result;
  5: }
  \`\`\`

  And your instruction is - "Change the function name to sumNumbers, add a parameter for an optional logging message, and replace the console log line with a conditional one that only logs the result if the logging message is provided."

  You should produce the following result:

  \`\`\`
  $START_UPDATES:math_operations.ts$

  $DELETE_LINES:1-1$
  $INSERT_LINES:1$
  function sumNumbers(a: number, b: number, logMessage?: string) {
  $END_INSERT_LINES$
  
  $DELETE_LINES:3-3$
  $INSERT_LINES:3$
    if (logMessage) console.log(logMessage + result);
  $END_INSERT_LINES$
  
  $END_UPDATES:math_operations.ts$

  If the modified artefact (such as a code block, function, class, interface etc) is small (that is, say less than 10 lines), consider replacing the entire artefact rather than individual lines.
  When doing this, make sure you delete the entire artefect (ie, the entire function or code-block or class or other, including any trailing/concluding braces etc), and then regenerated that entire block.

  If the content to be generated (across all files) is less than a hundred lines, you can consider deleting all lines in a file at once (with DELETE_LINES) and then re-inserting the desired content for that file (with INSERT_LINES) at once.
  
  \`\`\`
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
