import path from "path";
import { TemplateArgs } from "./TemplateArgs.js";
import { addLineNumbers } from "../text/addLineNumbers.js";
import { CodespinConfig } from "../settings/CodespinConfig.js";
import { trimWhitespace } from "../templating/trimWhitespace.js";
import { TemplateResult } from "./TemplateResult.js";
import { VersionedFileInfo } from "../fs/VersionedFileInfo.js";
import { SourceFile } from "../sourceCode/SourceFile.js";

export default async function defaultTemplate(
  args: TemplateArgs,
  config: CodespinConfig
): Promise<TemplateResult> {
  const prompt =
    args.generatedFiles.length === 0
      ? (args.outPath
          ? printLine(
              `Generate source code for the file "${relativePath(
                args.outPath,
                args.workingDir
              )}" based on the following instructions (enclosed between "-----").`,
              true
            )
          : "") +
        (args.outPath ? printLine("-----", true) : "") +
        printLine(
          printPrompt(args.promptWithLineNumbers, args.prompt, false),
          args.outPath ? false : true
        ) +
        (args.outPath ? printLine("-----", true) : "") +
        printIncludeFiles(args.includes, args.workingDir, false) +
        printFileTemplate(args, config)
      : // This is a continuation
        // In included files, we'll exclude previously generated files
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
        printLine(
          printPrompt(args.promptWithLineNumbers, args.prompt, false),
          args.outPath ? false : true
        ) +
        (args.outPath ? printLine("-----", true) : "") +
        printIncludeFiles(
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

function printPrompt(
  prompt: string,
  promptWithLineNumbers: string,
  useLineNumbers: boolean
) {
  return printLine(useLineNumbers ? promptWithLineNumbers : prompt, true);
}

function relativePath(filePath: string, workingDir: string) {
  return "./" + path.relative(workingDir, filePath);
}

function printFileTemplate(args: TemplateArgs, config: CodespinConfig) {
  const tmpl = `
  Respond with just the code (but exclude invocation examples etc) in the following format:

  File path:./some/path/greet.ts
  \`\`\`
  export function greet() {
    console.log("hello, world!");
  }
  \`\`\`

  If there are multiple files to be generated (as in "some/path/lorem.ts" and "some/path/ipsum.ts" in the example below), you should repeat blocks like this:

  File path:./some/path/lorem.ts
  \`\`\`
  export function printLorem() {
    console.log("lorem!");
  }
  \`\`\`

  File path:./some/path/ipsum.ts
  \`\`\`
  export function printIpsum() {
    console.log("ipsum!");
  }
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
          ? "Including relevant files below with line numbers added:"
          : "Including relevant files below:",
        true
      ) +
      includes
        .map((file) => {
          if (file.type === "diff") {
            const text =
              // Print the contents first
              printLine(
                `Contents of the file ${relativePath(file.path, workingDir)}:`
              ) +
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
                printLine(
                  `Contents of the file ${relativePath(file.path, workingDir)}:`
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

function printGeneratedFiles(generatedFiles: SourceFile[], workingDir: string) {
  if (generatedFiles.length === 0) {
    return "";
  } else {
    const text =
      printLine(
        "The following files have already been fixed, and do not need to be re-generated.",
        true
      ) +
      generatedFiles
        .map((file) => {
          if (file.contents && file.contents.trim().length > 0) {
            const text =
              printLine(
                `Contents of the file ${relativePath(file.path, workingDir)}:`
              ) +
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
