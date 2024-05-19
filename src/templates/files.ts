import path from "path";
import { CodespinConfig } from "../settings/CodespinConfig.js";
import { TemplateResult } from "../templating/getTemplate.js";
import { addLineNumbers } from "../text/addLineNumbers.js";
import { TemplateArgs } from "./TemplateArgs.js";

export default async function filesTemplate(
  args: TemplateArgs,
  config: CodespinConfig
): Promise<TemplateResult> {
  const prompt =
    printLine(args.prompt, true) +
    printIncludeFiles(args, false);

  return { prompt, responseParser: "no-output" };
}

function printLine(line: string | undefined, addBlankLine = false): string {
  return line
    ? line + (!line.endsWith("\n") ? "\n" : "") + (addBlankLine ? "\n" : "")
    : "\n";
}

function relativePath(filePath: string, workingDir: string) {
  return "./" + path.relative(workingDir, filePath);
}

function printIncludeFiles(args: TemplateArgs, useLineNumbers: boolean) {
  if (args.include.length === 0) {
    return "";
  } else {
    const text = args.include
      .map((file) => {
        if (file.type === "diff") {
          if (file.diff.trim().length > 0) {
            const text =
              printLine(
                `Diff for the file ${relativePath(file.path, args.workingDir)}:`
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
