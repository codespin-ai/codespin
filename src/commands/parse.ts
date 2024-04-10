import { promises as fs } from "fs";
import { CodespinContext } from "../CodeSpinContext.js";
import { setDebugFlag } from "../debugMode.js";
import { writeFilesToDisk } from "../fs/writeFilesToDisk.js";
import { extractCode } from "../prompts/extractCode.js";
import { SourceFile } from "../sourceCode/SourceFile.js";
import { FilesResult, SavedFilesResult } from "./generate.js";

export type ParseArgs = {
  file: string;
  write?: boolean;
  exec?: string;
  config?: string;
  outDir?: string;
  debug?: boolean;
};

export type ParseResult = SavedFilesResult | FilesResult;

export async function parse(
  args: ParseArgs,
  context: CodespinContext
): Promise<ParseResult> {
  if (args.debug) {
    setDebugFlag();
  }

  const llmResponse = await fs.readFile(args.file, "utf-8");
  const files = extractCode(llmResponse);

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
