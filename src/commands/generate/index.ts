import path from "path";
import { CodeSpinContext } from "../../CodeSpinContext.js";
import { getLoggers, writeDebug } from "../../console.js";
import { setDebugFlag } from "../../debugMode.js";
import {
  CannotMergeDiffResponseError,
  MaxMultiQueryError,
  MaxTokensError,
  CLIParameterError,
  UnknownFinishReasonError,
} from "../../errors.js";
import { writeFilesToDisk } from "../../fs/writeFilesToDisk.js";
import { writeToFile } from "../../fs/writeToFile.js";
import { BuildPromptArgs, buildPrompt } from "../../prompts/buildPrompt.js";
import { convertPromptToMessage } from "../../prompts/convertPromptToMessage.js";
import {
  convertMessageFileFormat,
  loadMessagesFromFile,
} from "../../prompts/loadMessagesFromFile.js";
import { readPromptSettings } from "../../prompts/readPromptSettings.js";
import { MessagesArg } from "../../prompts/types.js";
import { validateMaxInputMessagesLength } from "../../safety/validateMaxInputLength.js";
import { getModel } from "../../settings/getModel.js";
import { readCodeSpinConfig } from "../../settings/readCodeSpinConfig.js";
import { GeneratedSourceFile } from "../../sourceCode/GeneratedSourceFile.js";
import { SourceFile } from "../../sourceCode/SourceFile.js";
import defaultTemplate, {
  TemplateArgs,
  TemplateResult,
} from "../../templates/default.js";
import { getCustomTemplate } from "../../templating/getCustomTemplate.js";
import { getGeneratedFiles } from "./getGeneratedFiles.js";
import { getOutPath } from "./getOutPath.js";
import { VersionedFileInfo } from "../../fs/VersionedFileInfo.js";
import {
  CompletionInputMessage,
  CompletionOptions,
  fileBlockParser,
  getAPI,
  StreamingFileParseResult,
} from "libllm";
import { getLLMConfigLoaders } from "../../settings/getLLMConfigLoaders.js";
import { getFilePathPrefix } from "../../settings/parsing.js";

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
  xmlCodeBlockElement?: string;
  images?: string[];
  messages?: string;
  messagesJson?: MessagesArg;
  reloadConfig?: boolean;
  reloadProviderConfig?: boolean;
  responseCallback?: (text: string) => Promise<void>;
  responseStreamCallback?: (text: string) => void;
  fileResultStreamCallback?: (data: StreamingFileParseResult) => void;
  promptCallback?: (
    prompt: string,
    files: VersionedFileInfo[]
  ) => Promise<void>;
  parseCallback?: (files: GeneratedSourceFile[]) => Promise<void>;
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
  responses: string[];
};

export type GenerateResult =
  | PromptResult
  | SavedFilesResult
  | FilesResult
  | UnparsedResult;

export async function generate(
  args: GenerateArgs,
  context: CodeSpinContext
): Promise<GenerateResult> {
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

  const maxInput = args.maxInput ?? config.maxInput;

  const promptFilePath = args.promptFile
    ? await path.resolve(context.workingDir, args.promptFile)
    : undefined;

  const promptSettings = promptFilePath
    ? await readPromptSettings(promptFilePath)
    : undefined;

  const model = getModel(
    [args.model, promptSettings?.model, config.model],
    config
  );

  const xmlCodeBlockElement =
    args.xmlCodeBlockElement ?? config.xmlCodeBlockElement;

  const maxTokens = args.maxTokens ?? promptSettings?.maxTokens;

  const outPath = await getOutPath(
    args.out,
    promptFilePath,
    promptSettings,
    context.workingDir
  );

  // Load messages or convert prompt to message
  let messages: CompletionInputMessage[] = [];

  if (args.messagesJson) {
    // Convert provided messages JSON directly
    messages = await convertMessageFileFormat(
      args.messagesJson,
      context.workingDir
    );
  } else if (args.messages) {
    // Load messages from JSON file
    const messagesPath = path.resolve(context.workingDir, args.messages);
    messages = await loadMessagesFromFile(messagesPath, context.workingDir);
  } else if (args.prompt || args.promptFile) {
    // Convert traditional prompt to message
    const templateFunc = args.template
      ? (await getCustomTemplate<TemplateArgs, TemplateResult>(
          args.template,
          args.config,
          context.workingDir
        )) ?? defaultTemplate
      : defaultTemplate;

    const templateArgs = {
      outPath,
      promptSettings,
      generatedFiles: [],
      customArgs: args.customArgs,
      workingDir: context.workingDir,
      debug: args.debug,
      xmlCodeBlockElement,
    };

    const buildPromptArgs: BuildPromptArgs = {
      exclude: args.exclude ?? [],
      include: args.include ?? [],
      prompt: args.prompt,
      promptFile: args.promptFile,
      spec: args.spec,
      customConfigDir: args.config,
    };

    const {
      templateResult: { prompt: evaluatedPrompt },
      includes: filesInPrompt,
    } = await buildPrompt(
      buildPromptArgs,
      templateFunc,
      templateArgs,
      config,
      context
    );

    if (args.promptCallback) {
      await args.promptCallback(evaluatedPrompt, filesInPrompt);
    }

    // Handle prompt printing/saving
    if (args.printPrompt || typeof args.writePrompt !== "undefined") {
      if (typeof args.writePrompt !== "undefined") {
        await writeToFile(args.writePrompt, evaluatedPrompt, false);
      }

      return {
        type: "prompt",
        prompt: evaluatedPrompt,
        filePath: args.writePrompt ? args.writePrompt : undefined,
      };
    }

    // Convert prompt to message
    const message = await convertPromptToMessage(
      evaluatedPrompt,
      args.images,
      context.workingDir
    );
    messages = [message];
  } else {
    throw new CLIParameterError(
      "Must specify one of: --messages, --messagesJson, or --prompt/--prompt-file"
    );
  }

  // Validate total input length
  validateMaxInputMessagesLength(messages, maxInput);

  let cancelCompletion: (() => void) | undefined;

  function generateCommandCancel() {
    if (cancelCompletion) {
      cancelCompletion();
    }
  }

  if (args.cancelCallback) {
    args.cancelCallback(generateCommandCancel);
  }

  const completionAPI = getAPI(
    model.provider,
    getLLMConfigLoaders(args.config, context.workingDir),
    getLoggers()
  );

  const completionOptions: CompletionOptions = {
    model,
    maxTokens,
    reloadConfig: args.reloadProviderConfig,
    responseStreamCallback: args.responseStreamCallback,
    fileResultStreamCallback: args.fileResultStreamCallback,
    cancelCallback: (cancel) => {
      cancelCompletion = cancel;
    },
  };

  let continuationCount = 0;

  const generatedFiles: {
    [path: string]: string;
  } = {};

  const allResponses: string[] = [];

  while (continuationCount <= (args.multi ?? 0)) {
    continuationCount++;

    writeDebug("--- MESSAGES ---");
    writeDebug(JSON.stringify(messages, null, 2));

    const completionResult = await completionAPI.completion(
      messages,
      completionOptions,
      args.reloadProviderConfig
    );

    if (
      completionResult.finishReason === "STOP" ||
      completionResult.finishReason === "MAX_TOKENS"
    ) {
      allResponses.push(completionResult.message);

      const newlyGeneratedFiles = await fileBlockParser(
        completionResult.message,
        getFilePathPrefix(config),
        xmlCodeBlockElement
      );

      if (newlyGeneratedFiles.length === 0) {
        if (args.responseCallback) {
          await args.responseCallback(
            allResponses.join("\n---CONTINUING---\n") +
              "\nERROR: FILE_LENGTH_EXCEEDS_MAX_TOKENS"
          );
        }

        throw new MaxTokensError();
      }

      updateFiles(generatedFiles, newlyGeneratedFiles);

      if (completionResult.finishReason === "STOP") {
        if (args.responseCallback) {
          await args.responseCallback(
            allResponses.join("\n---CONTINUING---\n")
          );
        }

        const files = toSourceFileList(generatedFiles);

        if (args.parseCallback) {
          const generatedFilesDetail = await getGeneratedFiles(
            files,
            context.workingDir
          );
          await args.parseCallback(generatedFilesDetail);
        }

        if (args.parse ?? true) {
          if (args.write) {
            await writeFilesToDisk(
              args.outDir || context.workingDir,
              files,
              args.exec,
              context.workingDir
            );
            return {
              type: "saved",
              files,
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
            responses: allResponses,
          };
        }
      } else if (completionResult.finishReason === "MAX_TOKENS") {
        if (args.multi === 0) {
          if (args.responseCallback) {
            await args.responseCallback(
              allResponses.join("\n---CONTINUING---\n") + "\nERROR: MAX_TOKENS"
            );
          }

          throw new MaxTokensError();
        }
        if (args.parser !== "file-block") {
          throw new CannotMergeDiffResponseError();
        }
      }
    } else {
      throw new UnknownFinishReasonError(completionResult.finishReason);
    }
  }

  if (args.responseCallback) {
    await args.responseCallback(
      allResponses.join("\n---CONTINUING---\n") + "\nERROR: MAX_MULTI_QUERY"
    );
  }

  throw new MaxMultiQueryError();
}

function updateFiles(
  files: { [path: string]: string },
  newFiles: SourceFile[]
) {
  for (const file of newFiles) {
    files[file.path] = file.content;
  }
}

function toSourceFileList(files: { [path: string]: string }): SourceFile[] {
  return Object.keys(files).map((x) => ({
    path: x,
    content: files[x],
  }));
}
