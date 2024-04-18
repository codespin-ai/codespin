import path from "path";
import { DeclarationsTemplateArgs } from "./DeclarationsTemplateArgs.js";
import { CodespinConfig } from "../settings/CodespinConfig.js";

export default async function declarations(
  args: DeclarationsTemplateArgs,
  config: CodespinConfig
) {
  return (
    printLine(
      `I'd like you to extract the declarations/signatures of all classes, functions, methods, types, constants etc which are exported (or exposed to outside) from the following code. Ignore everything private.`,
      true
    ) +
    printLine(`${relativePath(args.filePath, args.workingDir)}:`) +
    printLine("```") +
    args.sourceCode +
    printLine("```", true) +
    printLine("Output declarations in the following format:", true) +
    printLine(
      `$START_FILE_CONTENTS:${relativePath(args.filePath, args.workingDir)}$`
    ) +
    printLine(
      `<extracted declarations/signatures from ${relativePath(
        args.filePath,
        args.workingDir
      )}>`
    ) +
    printLine(
      `$END_FILE_CONTENTS:${relativePath(args.filePath, args.workingDir)}$`,
      true
    ) +
    printLine(
      "Print only the declarations as described above, and no other text."
    )
  );
}

function relativePath(filePath: string, workingDir: string) {
  return "./" + path.relative(workingDir, filePath);
}

function printLine(line: string, addBlankLine = false): string {
  return line + (!line.endsWith("\n") ? "\n" : "") + (addBlankLine ? "\n" : "");
}
