import path from "path";
import { VersionedFileInfo } from "../fs/VersionedFileInfo.js";
import { CodeSpinConfig } from "../settings/CodeSpinConfig.js";
import { addLineNumbers } from "../text/addLineNumbers.js";
import { FormatterTemplateArgs } from "./FormatterTemplateArgs.js";
import { FormatterTemplateResult } from "./FormatterTemplateResult.js";
import { CodeSpinContext } from "../CodeSpinContext.js";

export default async function filesTemplate(
  args: FormatterTemplateArgs,
  config: CodeSpinConfig,
  context: CodeSpinContext
): Promise<FormatterTemplateResult> {
  const prompt =
    printLine(args.prompt, true) +
    printIncludeFiles(args.includes, args.workingDir, false);

  return { prompt };
}

function printLine(line: string | undefined, addBlankLine = false): string {
  return line
    ? line + (!line.endsWith("\n") ? "\n" : "") + (addBlankLine ? "\n" : "")
    : "\n";
}

function relativePath(filePath: string, workingDir: string) {
  return "./" + path.relative(workingDir, filePath);
}

function printIncludeFiles(
  includes: VersionedFileInfo[],
  workingDir: string,
  useLineNumbers: boolean
) {
  if (includes.length === 0) {
    return "";
  } else {
    const text =
      printLine(
        useLineNumbers
          ? "Content of files (with line numbers added) are included below."
          : "Content of files are included below.",
        true
      ) +
      includes
        .map((file) => {
          if (file.type === "diff") {
            const text =
              // Print the contents first
              printLine(`File path:${relativePath(file.path, workingDir)}`) +
              printLine("```") +
              printLine(addLineNumbers(file.version2 ?? "")) +
              printLine("```", true) +
              printLine("") +
              // Print the diff
              (file.diff.trim().length > 0)
                ? printLine(
                    `Also included below is the diff for the same file ${relativePath(
                      file.path,
                      workingDir
                    )} to help you understand the changes:`
                  ) +
                  printLine("```") +
                  printLine(file.diff) +
                  printLine("```", true)
                : "";

            return text;
          } else {
            if (file.content && file.content.trim().length > 0) {
              const text =
                printLine(`File path:${relativePath(file.path, workingDir)}`) +
                printLine("```") +
                printLine(
                  useLineNumbers ? addLineNumbers(file.content) : file.content
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
