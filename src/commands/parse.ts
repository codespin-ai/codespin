import { promises as fs } from "fs";
import { CodeSpinContext } from "../types.js";
import { setDebugFlag } from "../debugMode.js";
import { writeFilesToDisk } from "../fs/writeFilesToDisk.js";
import { readCodeSpinConfig } from "../settings/readCodeSpinConfig.js";
import { FilesResult, SavedFilesResult } from "./generate/index.js";
import * as libllm from "libllm";

export type ParseArgs = {
  file: string;
  write?: boolean;
  exec?: string;
  config?: string;
  outDir?: string;
  debug?: boolean;
  responseParser?: string;
  reloadConfig?: boolean;
  filePathPrefix?: string;
  xmlCodeBlockElement?: string;
};

export type ParseResult = SavedFilesResult | FilesResult;

export async function parse(
  args: ParseArgs,
  context: CodeSpinContext
): Promise<ParseResult> {
  if (args.debug) {
    setDebugFlag();
  }

  const config = await readCodeSpinConfig(
    args.config,
    context.workingDir,
    args.reloadConfig
  );

  if (config.debug) {
    setDebugFlag();
  }

  const llmResponse = await fs.readFile(args.file, "utf-8");
  const parseFunc = libllm.parsing.fileBlockParser;

  const files = await parseFunc(
    llmResponse,
    args.filePathPrefix ?? "File path:",
    args.xmlCodeBlockElement
  );

  if (args.write) {
    const savedFiles = await writeFilesToDisk(
      args.outDir || context.workingDir,
      files,
      args.exec,
      context.workingDir
    );
    return {
      type: "saved",
      files: savedFiles,
    };
  } else {
    return {
      type: "files",
      files,
    };
  }
}
