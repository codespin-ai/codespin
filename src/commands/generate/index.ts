import { readFile } from "fs/promises";
import path from "path";
import { CodespinContext } from "../../CodeSpinContext.js";
import { CompletionOptions } from "../../api/CompletionOptions.js";
import { getCompletionAPI } from "../../api/getCompletionAPI.js";
import { writeDebug } from "../../console.js";
import { setDebugFlag } from "../../debugMode.js";
import { exception } from "../../exception.js";
import { VersionedPath } from "../../fs/VersionedPath.js";
import { getVersionedPath } from "../../fs/getVersionedPath.js";
import { pathExists } from "../../fs/pathExists.js";
import { writeFilesToDisk } from "../../fs/writeFilesToDisk.js";
import { writeToFile } from "../../fs/writeToFile.js";
import { readPrompt } from "../../prompts/readPrompt.js";
import { readPromptSettings } from "../../prompts/readPromptSettings.js";
import { ParseFunc } from "../../responseParsing/ParseFunc.js";
import { diffParser } from "../../responseParsing/diffParser.js";
import { fileBlockParser } from "../../responseParsing/fileBlockParser.js";
import { noOutputParser } from "../../responseParsing/noOutputParser.js";
import { getApiAndModel } from "../../settings/getApiAndModel.js";
import { readCodespinConfig } from "../../settings/readCodespinConfig.js";
import { GeneratedSourceFile } from "../../sourceCode/GeneratedSourceFile.js";
import { SourceFile } from "../../sourceCode/SourceFile.js";
import { evalSpec } from "../../specs/evalSpec.js";
import { TemplateArgs } from "../../templates/TemplateArgs.js";
import { getTemplate } from "../../templating/getTemplate.js";
import { addLineNumbers } from "../../text/addLineNumbers.js";
import { getIncludedFiles } from "./getIncludedFiles.js";
import { getOutPath } from "./getOutPath.js";
import { getGeneratedFiles } from "./getGeneratedFiles.js";
import { callCompletion } from "./callCompletion.js";

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
  generatedFiles: {
    generated: boolean;
    file: string;
  }[];
  skippedFiles: {
    generated: boolean;
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

  const templateFunc = await getTemplate<TemplateArgs>(
    args.template ?? (args.go ? "plain" : "default"),
    args.config,
    context.workingDir
  );

  const basicPrompt = await readPrompt(
    promptFilePath,
    args.prompt,
    context.workingDir
  );

  // If the spec option is specified, evaluate the spec
  const prompt = args.spec
    ? await evalSpec(basicPrompt, args.spec, context.workingDir, config)
    : basicPrompt;

  const promptWithLineNumbers = addLineNumbers(prompt);

  const outPath = await getOutPath(
    args.out,
    promptFilePath,
    promptSettings,
    context.workingDir
  );

  const generateCodeTemplateArgs: TemplateArgs = {
    prompt,
    promptWithLineNumbers,
    include: includes,
    outPath,
    promptSettings,
    templateArgs: args.templateArgs,
    workingDir: context.workingDir,
    debug: args.debug,
  };

  const { prompt: evaluatedPrompt, responseParser } = await templateFunc(
    generateCodeTemplateArgs,
    config
  );

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

  const multi = args.multi ?? promptSettings?.multi ?? config.multi ?? 4;

  const completionResult = await callCompletion({
    api,
    customConfigDir: args.config,
    evaluatedPrompt,
    maxTokens,
    model,
    config,
    workingDir: context.workingDir,
    cancelCallback: args.cancelCallback,
    responseCallback: args.responseCallback,
    responseStreamCallback: args.responseStreamCallback,
  });

  if (completionResult.ok) {
    if (mustParse) {
      // Do we have a custom response parser?
      const customParser = args.parser || promptSettings?.parser;

      const parseFunc: ParseFunc = customParser
        ? (await import(customParser)).default
        : responseParser === "file-block"
        ? fileBlockParser
        : responseParser === "diff"
        ? diffParser
        : responseParser === "no-output"
        ? noOutputParser
        : exception(`Unknown response parser ${responseParser}.`);

      const files: SourceFile[] = await parseFunc(
        completionResult.message,
        context.workingDir,
        config
      );

      if (args.parseCallback) {
        const generatedFilesDetail = await getGeneratedFiles(files, context);
        args.parseCallback(generatedFilesDetail);
      }

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
