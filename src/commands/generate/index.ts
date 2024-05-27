import path from "path";
import { CodespinContext } from "../../CodeSpinContext.js";
import { CompletionOptions } from "../../api/CompletionOptions.js";
import { getCompletionAPI } from "../../api/getCompletionAPI.js";
import { writeDebug } from "../../console.js";
import { setDebugFlag } from "../../debugMode.js";
import { exception } from "../../exception.js";
import { VersionedPath } from "../../fs/VersionedPath.js";
import { getVersionedPath } from "../../fs/getVersionedPath.js";
import { writeFilesToDisk } from "../../fs/writeFilesToDisk.js";
import { writeToFile } from "../../fs/writeToFile.js";
import { readPrompt } from "../../prompts/readPrompt.js";
import { readPromptSettings } from "../../prompts/readPromptSettings.js";
import { fileBlockParser } from "../../responseParsing/fileBlockParser.js";
import { validateMaxInputLength } from "../../safety/validateMaxInputLength.js";
import { getApiAndModel } from "../../settings/getApiAndModel.js";
import { readCodespinConfig } from "../../settings/readCodespinConfig.js";
import { GeneratedSourceFile } from "../../sourceCode/GeneratedSourceFile.js";
import { SourceFile } from "../../sourceCode/SourceFile.js";
import { evalSpec } from "../../specs/evalSpec.js";
import { TemplateArgs } from "../../templates/TemplateArgs.js";
import { TemplateResult } from "../../templates/TemplateResult.js";
import defaultTemplate from "../../templates/default.js";
import { getCustomTemplate } from "../../templating/getCustomTemplate.js";
import { addLineNumbers } from "../../text/addLineNumbers.js";
import { getGeneratedFiles } from "./getGeneratedFiles.js";
import { getIncludedFiles } from "./getIncludedFiles.js";
import { getOutPath } from "./getOutPath.js";
import diffTemplate from "../../templates/diff.js";
import { diffParser } from "../../responseParsing/diffParser.js";

export type GenerateArgs = {
  promptFile?: string;
  out?: string;
  prompt?: string;
  model?: string;
  maxInput?: number;
  maxTokens?: number;
  write?: boolean;
  printPrompt?: boolean;
  writePrompt?: string;
  template?: string;
  customArgs?: string[];
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
  files: SourceFile[];
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

  const config = await readCodespinConfig(args.config, context.workingDir);

  // This is in bytes
  const maxInput = args.maxInput ?? config.maxInput;

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

  const outPath = await getOutPath(
    args.out,
    promptFilePath,
    promptSettings,
    context.workingDir
  );

  const templateFunc = args.template
    ? (await getCustomTemplate<TemplateArgs, TemplateResult>(
        args.template,
        args.config,
        context.workingDir
      )) ?? args.template === "diff"
      ? diffTemplate
      : defaultTemplate
    : defaultTemplate;

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

  const templateArgs: TemplateArgs = {
    prompt,
    promptWithLineNumbers,
    includes,
    outPath,
    promptSettings,
    generatedFiles: [],
    customArgs: args.customArgs,
    workingDir: context.workingDir,
    debug: args.debug,
  };

  const { prompt: evaluatedPrompt, responseParser } = await templateFunc(
    templateArgs,
    config
  );

  if (args.promptCallback) {
    args.promptCallback(evaluatedPrompt);
  }

  // No files to be generated. Just print/save the prompt.
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

  // Hit the LLM.
  else {
    const multi =
      args.multi && responseParser === "file-block" ? args.multi : 0;

    let cancelCompletion: (() => void) | undefined;

    function generateCommandCancel() {
      if (cancelCompletion) {
        cancelCompletion();
      }
    }

    if (args.cancelCallback) {
      args.cancelCallback(generateCommandCancel);
    }

    const completion = getCompletionAPI(api);

    const completionOptions: CompletionOptions = {
      model,
      maxTokens,
      responseStreamCallback: args.responseStreamCallback,
      cancelCallback: (cancel) => {
        cancelCompletion = cancel;
      },
    };

    let continuationCount = 0;

    const generatedFiles: {
      [path: string]: string;
    } = {};

    const allResponses: string[] = [];

    while (continuationCount <= multi) {
      continuationCount++;

      const messageToLLM = {
        role: "user" as const,
        content:
          continuationCount === 0
            ? evaluatedPrompt
            : (
                await templateFunc(
                  {
                    ...templateArgs,
                    generatedFiles: toSourceFileList(generatedFiles),
                  },
                  config
                )
              ).prompt,
      };

      writeDebug("--- PROMPT ---");
      writeDebug(messageToLLM.content);

      validateMaxInputLength(messageToLLM.content, maxInput);

      const completionResult = await completion(
        [messageToLLM],
        args.config,
        completionOptions,
        context.workingDir
      );

      if (completionResult.ok) {
        if (
          completionResult.finishReason === "STOP" ||
          completionResult.finishReason === "MAX_TOKENS"
        ) {
          allResponses.push(completionResult.message);

          const newlyGeneratedFiles = await (responseParser === "diff"
            ? diffParser
            : fileBlockParser)(
            completionResult.message,
            context.workingDir,
            config
          );

          if (newlyGeneratedFiles.length === 0) {
            if (args.responseCallback) {
              args.responseCallback(
                allResponses.join("\n---CONTINUING---\n") +
                  "\nERROR: FILE_LENGTH_EXCEEDS_MAX_TOKENS"
              );
            }

            return exception(
              `FILE_LENGTH_EXCEEDS_MAX_TOKENS: The length of a single file exceeded max tokens and cannot be retried. Try increasing max tokens if possible or split the file.`
            );
          }

          updateFiles(generatedFiles, newlyGeneratedFiles);

          if (completionResult.finishReason === "STOP") {
            if (args.responseCallback) {
              args.responseCallback(allResponses.join("\n---CONTINUING---\n"));
            }

            const files = toSourceFileList(generatedFiles);

            if (args.parseCallback) {
              const generatedFilesDetail = await getGeneratedFiles(
                files,
                context.workingDir
              );
              args.parseCallback(generatedFilesDetail);
            }

            if (args.write) {
              await writeFilesToDisk(
                args.outDir || context.workingDir,
                files,
                args.exec,
                context.workingDir
              );
              return {
                type: "saved" as const,
                files,
              };
            } else {
              return {
                type: "files" as const,
                files,
              };
            }
          } else if (completionResult.finishReason === "MAX_TOKENS") {
            if (multi === 0) {
              if (args.responseCallback) {
                args.responseCallback(
                  allResponses.join("\n---CONTINUING---\n") +
                    "\nERROR: MAX_TOKENS"
                );
              }

              return exception(
                `MAX_TOKENS: Maximum number of tokens exceeded and the multi-step param (--multi) is set to zero.`
              );
            }
            if (responseParser !== "file-block") {
              return exception(
                `CANNOT_MERGE_DIFF_RESPONSE: Diff responses cannot be merged. Remove the diff flag.`
              );
            }
          }
        } else {
          return exception(
            `UNKNOWN_FINISH_REASON: ${completionResult.finishReason}`
          );
        }
      } else {
        return exception(
          `${completionResult.error.code}: ${completionResult.error.message}`
        );
      }
    }

    if (args.responseCallback) {
      args.responseCallback(
        allResponses.join("\n---CONTINUING---\n") + "\nERROR: MAX_MULTI_QUERY"
      );
    }

    return exception(`MAX_MULTI_QUERY: Maximum number of LLM calls exceeded.`);
  }
}

function updateFiles(
  files: { [path: string]: string },
  newFiles: SourceFile[]
) {
  for (const file of newFiles) {
    files[file.path] = file.contents;
  }
}

function toSourceFileList(files: { [path: string]: string }): SourceFile[] {
  return Object.keys(files).map((x) => ({
    path: x,
    contents: files[x],
  }));
}
