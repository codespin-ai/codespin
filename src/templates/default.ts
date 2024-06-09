import path from "path";
import { TemplateArgs } from "./TemplateArgs.js";
import { addLineNumbers } from "../text/addLineNumbers.js";
import { CodeSpinConfig } from "../settings/CodeSpinConfig.js";
import { trimWhitespace } from "../templating/trimWhitespace.js";
import { TemplateResult } from "./TemplateResult.js";
import { VersionedFileInfo } from "../fs/VersionedFileInfo.js";
import { SourceFile } from "../sourceCode/SourceFile.js";

export default async function defaultTemplate(
  args: TemplateArgs,
  config: CodeSpinConfig
): Promise<TemplateResult> {
  const prompt =
    (args.outPath
      ? printLine(
          `Generate the content of the file "${relativePath(
            args.outPath,
            args.workingDir
          )}" based on the following instructions (enclosed between "-----").`,
          true
        )
      : "") +
    (args.outPath ? printLine("-----", true) : "") +
    printLine(printPrompt(args, false), args.outPath ? false : true) +
    (args.outPath ? printLine("-----", true) : "") +
    printIncludeFiles(
      args.generatedFiles.length === 0
        ? args.includes
        : // This is a continuation
          // In included files, we'll exclude previously generated files
          filterIncludes(
            args.includes,
            (args.generatedFiles ?? []).map((x) => x.path),
            args.workingDir
          ),
      args.workingDir,
      false
    ) +
    printGeneratedFiles(args.generatedFiles, args.workingDir) +
    printFileTemplate(args, config);

  return { prompt, responseParser: "file-block" };
}

function printLine(line: string | undefined, addBlankLine = false): string {
  return line
    ? line + (!line.endsWith("\n") ? "\n" : "") + (addBlankLine ? "\n" : "")
    : "\n";
}

function printPrompt(args: TemplateArgs, useLineNumbers: boolean) {
  return printLine(
    useLineNumbers ? addLineNumbers(args.prompt) : args.prompt,
    true
  );
}

function relativePath(filePath: string, workingDir: string) {
  return "./" + path.relative(workingDir, filePath);
}

function printFileTemplate(args: TemplateArgs, config: CodeSpinConfig) {
  const tmpl = `
  Respond with just the code (but exclude invocation examples etc) in the following format:

  File path:./some/path/greet.ts
  \`\`\`
  source code for greet.ts goes here...
  \`\`\`

  If there are multiple files to be generated (as in "some/path/lorem.ts" and "some/path/ipsum.ts" in the example below), you should repeat blocks like this:

  File path:./some/path/lorem.ts
  \`\`\`
  source code for lorem.ts goes here...
  \`\`\`

  File path:./some/path/ipsum.ts
  \`\`\`
  source code for ipsum.ts goes here...
  \`\`\`

  You must respond with the complete contents of each file. DO NOT omit any line.
  `;

  return printLine(trimWhitespace(tmpl), true);
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
          ? "Contents of files (with line numbers added) are included below."
          : "Contents of files are included below.",
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
            if (file.contents && file.contents.trim().length > 0) {
              const text =
                printLine(`File path:${relativePath(file.path, workingDir)}`) +
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

function printGeneratedFiles(generatedFiles: SourceFile[], workingDir: string) {
  if (generatedFiles.length === 0) {
    return "";
  } else {
    const text =
      printLine(
        "The following files have already been generated. You must skip generating them in your response.",
        true
      ) +
      generatedFiles
        .map((file) => {
          if (file.contents && file.contents.trim().length > 0) {
            const text =
              printLine(`File path:${relativePath(file.path, workingDir)}`) +
              printLine("```") +
              printLine(file.contents) +
              printLine("```", true);

            return text;
          } else {
            return "";
          }
        })
        .join("\n");
    return text;
  }
}

function filterIncludes(
  files: VersionedFileInfo[],
  exclusions: string[],
  workingDir: string
) {
  return files.filter(
    (x) => !exclusions.includes(relativePath(x.path, workingDir))
  );
}
