import path from "path";
import { TemplateArgs } from "../prompts/evaluateTemplate.js";

type UndefinedToNever<T> = T extends undefined ? never : T;

type WithRequired<T, K extends keyof T> = Omit<T, K> & {
  [P in K]-?: UndefinedToNever<T[P]>;
};

export default async function generate(args: TemplateArgs): Promise<string> {
  if (args.promptDiff) {
    return withPromptDiff(args);
  } else {
    return withoutPromptDiff(args);
  }
}

function argsHasPreviousPrompt(
  args: TemplateArgs
): args is WithRequired<
  TemplateArgs,
  "previousPrompt" | "previousPromptWithLineNumbers"
> {
  return args.previousPrompt !== undefined;
}

function argsHasSourceFile(
  args: TemplateArgs
): args is WithRequired<TemplateArgs, "sourceFile"> {
  return args.sourceFile !== undefined;
}

function withPromptDiff(args: TemplateArgs) {
  if (
    argsHasSourceFile(args) &&
    argsHasPreviousPrompt(args) &&
    args.sourceFile.previousContents
  ) {
    const argsWithSource: WithRequired<TemplateArgs, "sourceFile"> = args;

    return (
      printLine(
        `The following prompt (with line numbers added) was used to generate source code for the file "${relativePath(
          args.sourceFile?.path
        )}" provided later.`,
        true
      ) +
      printPreviousPrompt(args, true) +
      printSourceFile(argsWithSource, false, true) +
      printDeclarations(args) +
      printIncludeFiles(args, false, false) +
      printLine(
        `But now I'm making the following changes to the original prompt. The diff of the prompt is given below.`,
        true
      ) +
      printPromptDiff(args) +
      printLine(
        "Based on the changes to the prompt, regenerate the source code. Retain the original code and structure wherever possible."
      ) +
      printFileTemplate(args)
    );
  } else {
    return (
      (args.targetFilePath
        ? printLine(
            `From the following prompt (enclosed between "-----"), generate source code for the file "${relativePath(
              args.targetFilePath
            )}".`,
            true
          )
        : "") +
      (args.targetFilePath ? printLine("-----", true) : "") +
      printPrompt(args, args.targetFilePath ? false : true) +
      (args.targetFilePath ? printLine("-----", true) : "") +
      printDeclarations(args) +
      printIncludeFiles(args, false, false) +
      printFileTemplate(args)
    );
  }
}

function withoutPromptDiff(args: TemplateArgs) {
  return (
    (args.targetFilePath
      ? printLine(
          `From the following prompt (enclosed between "-----"), generate source code for the file "${relativePath(
            args.targetFilePath
          )}".`,
          true
        )
      : "") +
    (args.targetFilePath ? printLine("-----", true) : "") +
    printPrompt(args, args.targetFilePath ? false : true) +
    (args.targetFilePath ? printLine("-----", true) : "") +
    printDeclarations(args) +
    printIncludeFiles(args, false, false) +
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

function relativePath(filePath: string) {
  return path.relative(process.cwd(), filePath);
}

function printPreviousPrompt(
  args: WithRequired<
    TemplateArgs,
    "previousPrompt" | "previousPromptWithLineNumbers"
  >,
  useLineNumbers: boolean
) {
  return printLine(
    useLineNumbers ? args.previousPromptWithLineNumbers : args.previousPrompt,
    true
  );
}

function printPromptDiff(args: TemplateArgs): string {
  return printLine(args.promptDiff as string, true);
}

function printFileTemplate(args: TemplateArgs) {
  const filePath = args.targetFilePath
    ? relativePath(args.targetFilePath)
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
  useLineNumbers: boolean,
  usePrevious: boolean
) {
  const text =
    printLine(
      usePrevious
        ? `Here is the previous code for ${relativePath(args.sourceFile.path)}${
            useLineNumbers ? " with line numbers" : ""
          }`
        : `Here is the code for ${relativePath(args.sourceFile.path)}${
            useLineNumbers ? " with line numbers" : ""
          }`
    ) +
    printLine("```") +
    printLine(
      usePrevious
        ? useLineNumbers
          ? args.sourceFile.previousContentsWithLineNumbers
          : args.sourceFile.previousContents
        : useLineNumbers
        ? args.sourceFile.contentsWithLineNumbers
        : args.sourceFile.contents
    ) +
    printLine("") +
    printLine("```", true);
  return text;
}

function printDeclarations(args: TemplateArgs) {
  if (args.declarations.length === 0) {
    return "";
  } else {
    const text =
      printLine(
        "I'm also adding relevant declarations for external dependencies so that you understand the code better.",
        true
      ) +
      args.declarations
        .map(
          (file) =>
            printLine(`Declarations for ${relativePath(file.path)}:`) +
            printLine("```") +
            printLine(file.declarations) +
            printLine("```", true)
        )
        .join("\n");
    return text;
  }
}

function printIncludeFiles(
  args: TemplateArgs,
  useLineNumbers: boolean,
  usePrevious: boolean
) {
  if (args.files.length === 0) {
    return "";
  } else {
    const text =
      "Additionally, I've added some relevant external files to help you understand the context better.\n\n" +
      args.files
        .map(
          (file) =>
            printLine(`Contents of the file ${relativePath(file.path)}:`) +
            printLine("```") +
            printLine(
              usePrevious
                ? useLineNumbers
                  ? file.previousContentsWithLineNumbers
                  : file.previousContents
                : useLineNumbers
                ? file.contentsWithLineNumbers
                : file.contents
            ) +
            printLine("```", true)
        )
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
