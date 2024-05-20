import path from "path";
import { CodespinContext } from "../../CodeSpinContext.js";
import { setDebugFlag } from "../../debugMode.js";
import { VersionedPath } from "../../fs/VersionedPath.js";
import { getVersionedPath } from "../../fs/getVersionedPath.js";
import { writeToFile } from "../../fs/writeToFile.js";
import { readPromptSettings } from "../../prompts/readPromptSettings.js";
import { getApiAndModel } from "../../settings/getApiAndModel.js";
import { readCodespinConfig } from "../../settings/readCodespinConfig.js";
import { GeneratedSourceFile } from "../../sourceCode/GeneratedSourceFile.js";
import { SourceFile } from "../../sourceCode/SourceFile.js";
import { callCompletion } from "./callCompletion.js";
import { evaluatePrompt } from "./evaluatePrompt.js";
import { getIncludedFiles } from "./getIncludedFiles.js";
import { processResponse } from "./processResponse.js";

export type GenerateArgs = {
  promptFile?: string;
  out?: string;
  prompt?: string;
  model?: string;
  maxTokens?: number;
  write?: boolean;
  printPrompt?: boolean;
  writePrompt?: string;
  template?: string;
  templateArgs?: string[];
  debug?: boolean;
  exec?: string;
  config?: string;
  include?: string[];
  exclude?: string[];
  outDir?: string;
  parser?: string;
  parse?: boolean;
  go?: boolean;
  spec?: string;
  multi?: number;
  responseCallback?: (text: string) => void;
  responseStreamCallback?: (text: string) => void;
  promptCallback?: (prompt: string) => void;
  parseCallback?: (files: GeneratedSourceFile[]) => void;
  cancelCallback?: (cancel: () => void) => void;
};

export type PromptResult = {
  type: "prompt";
  prompt: string;
  filePath: string | undefined;
};

export type SavedFilesResult = {
  type: "saved";
  files: {
    file: string;
  }[];
};

export type FilesResult = {
  type: "files";
  files: SourceFile[];
};

export type UnparsedResult = {
  type: "unparsed";
  text: string;
};

export type GenerateResult =
  | PromptResult
  | SavedFilesResult
  | FilesResult
  | UnparsedResult;

export async function generate(
  args: GenerateArgs,
  context: CodespinContext
): Promise<GenerateResult> {
  if (args.debug) {
    setDebugFlag();
  }

  // Convert everything to absolute paths
  const promptFilePath = args.promptFile
    ? await path.resolve(context.workingDir, args.promptFile)
    : undefined;

  const includesFromCLI: VersionedPath[] = await Promise.all(
    (args.include || []).map((x) =>
      getVersionedPath(x, context.workingDir, false, context.workingDir)
    )
  );
  const excludesFromCLI = await Promise.all(
    (args.exclude || []).map((x) => path.resolve(context.workingDir, x))
  );

  const mustParse = args.parse ?? (args.go ? false : true);

  const config = await readCodespinConfig(args.config, context.workingDir);

  if (config.debug) {
    setDebugFlag();
  }

  const promptSettings = promptFilePath
    ? await readPromptSettings(promptFilePath)
    : undefined;

  const [api, model] = getApiAndModel(
    [args.model, promptSettings?.model, config.model],
    config
  );

  const maxTokens =
    args.maxTokens ?? promptSettings?.maxTokens ?? config?.maxTokens;

  const includes = await getIncludedFiles(
    includesFromCLI,
    excludesFromCLI,
    promptFilePath,
    promptSettings,
    context.workingDir
  );

  const template = args.template ?? (args.go ? "plain" : "default");

  const { prompt: evaluatedPrompt, responseParser } = await evaluatePrompt({
    config,
    customConfigDir: args.config,
    debug: args.debug ?? false,
    includes,
    out: args.out,
    prompt: args.prompt,
    promptFilePath,
    promptSettings,
    spec: args.spec,
    template,
    templateArgs: args.templateArgs,
    workingDir: context.workingDir,
  });

  if (args.promptCallback) {
    args.promptCallback(evaluatedPrompt);
  }

  if (args.printPrompt || typeof args.writePrompt !== "undefined") {
    if (typeof args.writePrompt !== "undefined") {
      // If --write-prompt is specified but no file is mentioned
      if (!args.writePrompt) {
        throw new Error(
          `Specify a file path for the --write-prompt parameter.`
        );
      }
      await writeToFile(args.writePrompt, evaluatedPrompt, false);
    }

    return {
      type: "prompt",
      prompt: evaluatedPrompt,
      filePath: args.writePrompt ? args.writePrompt : undefined,
    };
  }

  const multi = args.multi ?? promptSettings?.multi ?? config.multi ?? 0;

  const completionResult = await callCompletion({
    api,
    customConfigDir: args.config,
    evaluatedPrompt,
    maxTokens,
    model,
    config,
    multi,
    workingDir: context.workingDir,
    cancelCallback: args.cancelCallback,
    responseCallback: args.responseCallback,
    responseStreamCallback: args.responseStreamCallback,
  });

  if (completionResult.ok) {
    if (mustParse) {
      return await processResponse({
        completionResult,
        config,
        parser: responseParser,
        promptSettings,
        responseParser,
        workingDir: context.workingDir,
        exec: args.exec,
        outDir: args.outDir,
        write: args.write ?? false,
      });
    } else {
      return {
        type: "unparsed",
        text: completionResult.message,
      };
    }
  } else {
    throw new Error(
      `${completionResult.error.code}: ${completionResult.error.message}`
    );
  }
}
