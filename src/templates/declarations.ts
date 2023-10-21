import path from "path";
import { DeclarationsTemplateArgs } from "../prompts/evaluateDeclarationTemplate.js";

export default async function declarations(args: DeclarationsTemplateArgs) {
  return (
    printLine(
      `I'd like you to extract the declarations/signatures of all classes, functions, methods, types, constants etc which are exported (or exposed to outside) from the following code. Ignore everything private.`,
      true
    ) +
    printLine(`${relativePath(args.filePath)}:`) +
    printLine("```") +
    args.sourceCode +
    printLine("```", true) +
    printLine("Output declarations in the following format:", true) +
    printLine(`$START_FILE_CONTENTS:${relativePath(args.filePath)}$`) +
    printLine(
      `....extracted declarations/signatures from ${relativePath(
        args.filePath
      )}  go here....`
    ) +
    printLine(`$END_FILE_CONTENTS:${relativePath(args.filePath)}$`, true) +
    printLine(
      "Print only the declarations as described above, and no other text."
    )
  );
}

function relativePath(filePath: string) {
  return "./" +  path.relative(process.cwd(), filePath);
}

function printLine(line: string, addBlankLine = false): string {
  return line + (!line.endsWith("\n") ? "\n" : "") + (addBlankLine ? "\n" : "");
}
