import path from "path";
import { TemplateArgs } from "../templating/TemplateArgs.js";
import { VersionedFileInfo } from "../fs/VersionedFileInfo.js";

type UndefinedToNever<T> = T extends undefined ? never : T;

type WithRequired<T, K extends keyof T> = Omit<T, K> & {
  [P in K]-?: UndefinedToNever<T[P]>;
};

export default async function generate(args: TemplateArgs): Promise<string> {
  return (
    (args.targetFilePath
      ? printLine(
          `Generate source code for the file "${relativePath(
            args.targetFilePath,
            args.workingDir
          )}" based on the following instructions (enclosed between "-----").`,
          true
        )
      : "") +
    (args.targetFilePath ? printLine("-----", true) : "") +
    printLine(printPrompt(args, false), args.targetFilePath ? false : true) +
    (args.targetFilePath ? printLine("-----", true) : "") +
    (argsHasSourceFile(args) ? printSourceFile(args, false) : "") +
    printDeclarations(args) +
    printIncludeFiles(args, false) +
    printFileTemplate(args)
  );
}

function argsHasSourceFile(
  args: TemplateArgs
): args is WithRequired<TemplateArgs, "sourceFile"> {
  return args.sourceFile !== undefined;
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
  const filePath = args.targetFilePath
    ? relativePath(args.targetFilePath, args.workingDir)
    : "./some/path/filename.ext";
  const tmpl = `
  Respond with just the code (but exclude invocation examples etc) in the following format:

  $START_FILE_CONTENTS:${filePath}$
  import a from "./a";
  function somethingSomething() {
    //....
  }
  $END_FILE_CONTENTS:${filePath}$
  `;

  return printLine(fixTemplateWhitespace(tmpl), true);
}

function printSourceFile(
  args: WithRequired<TemplateArgs, "sourceFile">,
  useLineNumbers: boolean
) {
  const fileContent = getContentFromVersionedFile(
    args.sourceFile,
    args.version,
    useLineNumbers
  );
  if (fileContent && fileContent.trim().length > 0) {
    const text =
      printLine(
        `Here is the current code for ${relativePath(
          args.sourceFile.path,
          args.workingDir
        )}${useLineNumbers ? " with line numbers" : ""}`
      ) +
      printLine("```") +
      printLine(fileContent) +
      printLine("") +
      printLine("```", true);
    return text;
  } else {
    return "";
  }
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
        "Including some relevant files to help you understand the context better:",
        true
      ) +
      args.include
        .map((file) => {
          const fileContent = getContentFromVersionedFile(
            file,
            args.version,
            useLineNumbers
          );
          if (fileContent && fileContent.trim().length > 0) {
            const text =
              printLine(
                `Contents of the file ${relativePath(
                  file.path,
                  args.workingDir
                )}:`
              ) +
              printLine("```") +
              printLine(fileContent) +
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

function getContentFromVersionedFile(
  sourceFile: VersionedFileInfo,
  version: "current" | "HEAD",
  useLineNumbers: boolean
): string | undefined {
  return version === "HEAD"
    ? useLineNumbers
      ? sourceFile.previousContentsWithLineNumbers
      : sourceFile.previousContents
    : useLineNumbers
    ? sourceFile.contentsWithLineNumbers
    : sourceFile.contents;
}
