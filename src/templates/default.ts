import path from "path";
import { TemplateArgs } from "./TemplateArgs.js";
import { addLineNumbers } from "../text/addLineNumbers.js";
import { CodespinConfig } from "../settings/CodespinConfig.js";
import {
  getEndFileContentsMarker,
  getStartFileContentsMarker,
} from "../responseParsing/markers.js";

export default async function generate(
  args: TemplateArgs,
  config: CodespinConfig
): Promise<string> {
  return (
    (args.outPath
      ? printLine(
          `Generate source code for the file "${relativePath(
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
    printIncludeFiles(args, false) +
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
  const START_FILE_CONTENTS_MARKER = getStartFileContentsMarker(config);
  const END_FILE_CONTENTS_MARKER = getEndFileContentsMarker(config);
  const filePath = args.outPath
    ? relativePath(args.outPath, args.workingDir)
    : "./some/path/filename.ext";
  const tmpl = `
  Respond with just the code (but exclude invocation examples etc) in the following format:

  $${START_FILE_CONTENTS_MARKER}:${filePath}$
  <generated code for ${filePath} goes here...>
  $${END_FILE_CONTENTS_MARKER}:${filePath}$

  For example, like this:

  $${START_FILE_CONTENTS_MARKER}:./greet.ts$
  export function greet() {
    console.log("hello, world!");
  }
  $${END_FILE_CONTENTS_MARKER}:./greet.ts$

  If there are multiple files to be generated (as in "lorem.ts" and "ipsum.ts" in the example below), you may repeat blocks like this:

  $${START_FILE_CONTENTS_MARKER}:./lorem.ts$
  export function printLorem() {
    console.log("lorem!");
  }
  $${END_FILE_CONTENTS_MARKER}:./lorem.ts$

  $${START_FILE_CONTENTS_MARKER}:./ipsum.ts$
  export function printIpsum() {
    console.log("ipsum!");
  }
  $${END_FILE_CONTENTS_MARKER}:./ipsum.ts$

  DO NOT omit any code when printing a file. Don't include placeholders, "omitted for brevity" etc. You should print the complete file.
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
