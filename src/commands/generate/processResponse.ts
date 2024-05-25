import { SuccessfulCompletionResult } from "../../api/CompletionResult.js";
import { exception } from "../../exception.js";
import { writeFilesToDisk } from "../../fs/writeFilesToDisk.js";
import { PromptSettings } from "../../prompts/readPromptSettings.js";
import { ParseFunc } from "../../responseParsing/ParseFunc.js";
import { ResponseParsers } from "../../responseParsing/ResponseParsers.js";
import { diffParser } from "../../responseParsing/diffParser.js";
import { fileBlockParser } from "../../responseParsing/fileBlockParser.js";
import { CodespinConfig } from "../../settings/CodespinConfig.js";
import { GeneratedSourceFile } from "../../sourceCode/GeneratedSourceFile.js";
import { SourceFile } from "../../sourceCode/SourceFile.js";
import { getGeneratedFiles } from "./getGeneratedFiles.js";

export type ProcessResponseArgs = {
  completionResult: SuccessfulCompletionResult;
  parser: string | undefined;
  promptSettings: PromptSettings | undefined;
  responseParser: ResponseParsers;
  workingDir: string;
  config: CodespinConfig;
  write: boolean;
  outDir: string | undefined;
  exec: string | undefined;
  parseCallback?: (files: GeneratedSourceFile[]) => void;
  mustParse: boolean | undefined;
};

export type ProcessResponseResult =
  | {
      type: "saved";
      files: SourceFile[];
    }
  | {
      type: "files";
      files: SourceFile[];
    }
  | {
      type: "unparsed";
      text: string;
    };

export async function processResponse(
  args: ProcessResponseArgs
): Promise<ProcessResponseResult> {
  if (args.mustParse) {
    // Do we have a custom response parser?
    const customParser = args.parser || args.promptSettings?.parser;

    const parseFunc: ParseFunc = customParser
      ? (await import(customParser)).default
      : args.responseParser === "file-block"
      ? fileBlockParser
      : args.responseParser === "diff"
      ? diffParser
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
  } else {
    return {
      type: "unparsed",
      text: args.completionResult.message,
    };
  }
}
