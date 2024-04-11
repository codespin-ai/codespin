import path from "path";
import { TemplateArgs } from "./TemplateArgs.js";
import { addLineNumbers } from "../text/addLineNumbers.js";
import { CodespinConfig } from "../settings/CodespinConfig.js";
import { getEndUpdatesMarker, getStartUpdatesMarker } from "../prompts/markers.js";

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

  const tmpl = `
  I want you to respond in the following format:
  - $${START_UPDATES_MARKER}:file_path$: Marks the beginning of updates for the file specified by file_path.
  - $${END_UPDATES_MARKER}:file_path$: Marks the end of updates for the file specified by file_path.
  - Multiple files can be updated by repeating "$${START_UPDATES_MARKER}:file_path$ and $${END_UPDATES_MARKER}:file_path$ blocks
  
  Within a block:
  - $INSERT_LINES:line_number$: Indicates the start of a block of lines to be inserted at the specified line_number. The line number is based on the file's original state.
  - $END_INSERT_LINES$: Marks the end of the insertion block.
  - $DELETE_LINES:start_line_num-end_line_num$: Specifies a range of lines to be deleted, inclusive of both start_line_num and end_line_num.
  - line numbers always reference the original line numbers.
  - Do not worry about line numbers changing as content is added. The references always point to the original line numbers.
  - To replace a line, you'll have to delete a line and insert it again.
  
  Let's look at some examples:

  Suppose you have a file named ./src/math_operations.ts (with line numbers added) with the following content:

      \`\`\`
      1: function addNumbers(a: number, b: number) {
      2:   let result = a + b;
      3:   console.log("The result is: " + result);
      4:   return result;
      5: }
      \`\`\`

  And your instructions are: "Change the function name to sumNumbers, add a parameter for an optional logging message, and replace the console log line with a conditional one that only logs the result if the logging message is provided."

  Then your response should be as follows:
      $${START_UPDATES_MARKER}:./src/math_operations.ts$

      $DELETE_LINES:1-1$
      $INSERT_LINES:1$
      function sumNumbers(a: number, b: number, logMessage?: string) {
      $END_INSERT_LINES$
      
      $DELETE_LINES:3-3$
      $INSERT_LINES:3$
        if (logMessage) console.log(logMessage + result);
      $END_INSERT_LINES$
      
      $${END_UPDATES_MARKER}:./src/math_operations.ts$
      
  The above response updates only a single file. For multiple updates, repeat the $${START_UPDATES_MARKER}:..$ and $${END_UPDATES_MARKER}:..$ blocks.

  If you're updating more than 50% of a "code artefact" (a "code artefact" being a code block, function, class, interface etc), consider replacing the entire artefact rather than individual lines.
  If you decide to do this, make sure you delete the entire "code artefect", and then regenerate the artefact.

  For example, if you decide to modify a large part of the following function:
      \`\`\`
      133: function multiply(a: number, b: number) {
      134:   let result = a * b;
      135:   return result;
      136: }
      \`\`\`

  You must respond with:
      $${START_UPDATES_MARKER}:./src/math_operations.ts$

      $DELETE_LINES:133-136$
      $INSERT_LINES:133$
      /// whatever you want to insert...
      $END_INSERT_LINES$
      
      $${END_UPDATES_MARKER}:./src/math_operations.ts$
  
  In this case, make sure you include line 136 as well in the deletion, since it's a part of the function (the "artefact" in this case).

  If files are lengthy or if there are many files, you must reduce the size of the output by printing only the edits which are necessary (instead of reprinting the entire file).

  For example, if the task is to say remove comments across a bunch of files, you could respond with something like:
      $${START_UPDATES_MARKER}:./src/some/file.ts$
      $DELETE_LINES:43-44$
      $${END_UPDATES_MARKER}:./src/some/file.ts$

      $${START_UPDATES_MARKER}:./src/other/file.ts$
      $DELETE_LINES:66-66$
      $DELETE_LINES:122-124$
      $DELETE_LINES:211-211$
      $${END_UPDATES_MARKER}:./src/other/file.ts$

      $${START_UPDATES_MARKER}:./src/another/file.ts$
      $DELETE_LINES:1-1$
      $DELETE_LINES:11-11$
      $${END_UPDATES_MARKER}:./src/another/file.ts$

  In the above example, you were able to edit three files while keeping the response size very small. In the same way, wherever possible print only the changes which need to be made.
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
