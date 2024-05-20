import { CodespinContext } from "../../CodeSpinContext.js";
import { SuccessfulCompletionResult } from "../../api/CompletionResult.js";
import { exception } from "../../exception.js";
import { writeFilesToDisk } from "../../fs/writeFilesToDisk.js";
import { PromptSettings } from "../../prompts/readPromptSettings.js";
import { ParseFunc } from "../../responseParsing/ParseFunc.js";
import { diffParser } from "../../responseParsing/diffParser.js";
import { fileBlockParser } from "../../responseParsing/fileBlockParser.js";
import { noOutputParser } from "../../responseParsing/noOutputParser.js";
import { CodespinConfig } from "../../settings/CodespinConfig.js";
import { GeneratedSourceFile } from "../../sourceCode/GeneratedSourceFile.js";
import { getGeneratedFiles } from "./getGeneratedFiles.js";

export type ProcessResponseArgs = {
  completionResult: SuccessfulCompletionResult;
  parser: string | undefined;
  promptSettings: PromptSettings | undefined;
  responseParser: string | undefined;
  workingDir: string;
  config: CodespinConfig;
  write: boolean;
  outDir: string | undefined;
  exec: string | undefined;
  parseCallback?: (files: GeneratedSourceFile[]) => void;
};
export async function processResponse(args: ProcessResponseArgs) {
  // Do we have a custom response parser?
  const customParser = args.parser || args.promptSettings?.parser;

  const parseFunc: ParseFunc = customParser
    ? (await import(customParser)).default
    : args.responseParser === "file-block"
    ? fileBlockParser
    : args.responseParser === "diff"
    ? diffParser
    : args.responseParser === "no-output"
    ? noOutputParser
    : exception(`Unknown response parser ${args.responseParser}.`);

  const files = await parseFunc(
    args.completionResult.message,
    args.workingDir,
    args.config
  );

  if (args.parseCallback) {
    const generatedFilesDetail = await getGeneratedFiles(
      files,
      args.workingDir
    );
    args.parseCallback(generatedFilesDetail);
  }

  if (args.write) {
    const savedFiles = await writeFilesToDisk(
      args.outDir || args.workingDir,
      files,
      args.exec,
      args.workingDir
    );
    return {
      type: "saved" as const,
      files: savedFiles,
    };
  } else {
    return {
      type: "files" as const,
      files,
    };
  }
}
