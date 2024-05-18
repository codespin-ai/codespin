import { promises as fs } from "fs";
import { CodespinContext } from "../CodeSpinContext.js";
import { setDebugFlag } from "../debugMode.js";
import { writeFilesToDisk } from "../fs/writeFilesToDisk.js";
import { readCodespinConfig } from "../settings/readCodespinConfig.js";
import { FilesResult, SavedFilesResult } from "./generate/index.js";
import { ParseFunc } from "../responseParsing/ParseFunc.js";
import { diffParser } from "../responseParsing/diffParser.js";
import { fileBlockParser } from "../responseParsing/fileBlockParser.js";
import { exception } from "../exception.js";

export type ParseArgs = {
  file: string;
  write?: boolean;
  exec?: string;
  config?: string;
  outDir?: string;
  debug?: boolean;
  responseParser?: string;
};

export type ParseResult = SavedFilesResult | FilesResult;

export async function parse(
  args: ParseArgs,
  context: CodespinContext
): Promise<ParseResult> {
  if (args.debug) {
    setDebugFlag();
  }

  const config = await readCodespinConfig(args.config, context.workingDir);

  if (config.debug) {
    setDebugFlag();
  }

  const llmResponse = await fs.readFile(args.file, "utf-8");
  const parseFunc: ParseFunc =
    args.responseParser === "diff"
      ? diffParser
      : args.responseParser === "file-block" ||
        args.responseParser === undefined
      ? fileBlockParser
      : exception(`Unknown response parser ${args.responseParser}`);

  const files = await parseFunc(llmResponse, context.workingDir, config);

  if (args.write) {
    const extractResult = await writeFilesToDisk(
      args.outDir || context.workingDir,
      files,
      args.exec,
      context.workingDir
    );
    const generatedFiles = extractResult.filter((x) => x.generated);
    const skippedFiles = extractResult.filter((x) => !x.generated);

    return {
      type: "saved",
      generatedFiles,
      skippedFiles,
    };
  } else {
    return {
      type: "files",
      files,
    };
  }
}
