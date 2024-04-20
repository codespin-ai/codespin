import { readFile } from "fs/promises";
import path from "path";
import { CodespinContext } from "../CodeSpinContext.js";
import { CompletionOptions } from "../api/CompletionOptions.js";
import { getCompletionAPI } from "../api/getCompletionAPI.js";
import { writeDebug } from "../console.js";
import { setDebugFlag } from "../debugMode.js";
import { exception } from "../exception.js";
import { BasicFileInfo } from "../fs/BasicFileInfo.js";
import { VersionedFileInfo } from "../fs/VersionedFileInfo.js";
import { VersionedPath } from "../fs/VersionedPath.js";
import { getVersionedFileInfo } from "../fs/getFileContent.js";
import { getVersionedPath } from "../fs/getVersionedPath.js";
import { pathExists } from "../fs/pathExists.js";
import { resolvePathInProject } from "../fs/resolvePath.js";
import { resolveWildcardPaths } from "../fs/resolveWildcards.js";
import { writeFilesToDisk } from "../fs/writeFilesToDisk.js";
import { writeToFile } from "../fs/writeToFile.js";
import { readPrompt } from "../prompts/readPrompt.js";
import {
  PromptSettings,
  readPromptSettings,
} from "../prompts/readPromptSettings.js";
import { getApiAndModel } from "../settings/getApiAndModel.js";
import { readCodespinConfig } from "../settings/readCodespinConfig.js";
import { GeneratedSourceFile } from "../sourceCode/GeneratedSourceFile.js";
import { SourceFile } from "../sourceCode/SourceFile.js";
import { getDeclarations } from "../sourceCode/getDeclarations.js";
import { evalSpec } from "../specs/evalSpec.js";
import { TemplateArgs } from "../templates/TemplateArgs.js";
import { getTemplate } from "../templating/getTemplate.js";
import { addLineNumbers } from "../text/addLineNumbers.js";
import { CodespinConfig } from "../settings/CodespinConfig.js";
import { fileBlockParser } from "../responseParsing/fileBlockParser.js";
import { diffParser } from "../responseParsing/diffParser.js";
import { ParseFunc } from "../responseParsing/ParseFunc.js";
import { noOutputParser } from "../responseParsing/noOutputParser.js";

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
  declare?: string[];
  outDir?: string;
  parser?: string;
  parse?: boolean;
  go?: boolean;
  maxDeclare?: number;
  spec?: string;
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
  const declarationsFromCLI = await Promise.all(
    (args.declare || []).map((x) => path.resolve(context.workingDir, x))
  );

  const mustParse = args.parse ?? (args.go ? false : true);

  const config = await readCodespinConfig(args.config, context.workingDir);

  const promptSettings = promptFilePath
    ? await readPromptSettings(promptFilePath)
    : undefined;

  const [api, model] = getApiAndModel(
    [args.model, promptSettings?.model, config.model],
    config
  );

  const maxTokens =
    args.maxTokens ?? promptSettings?.maxTokens ?? config?.maxTokens;
  const maxDeclare =
    args.maxDeclare ?? promptSettings?.maxDeclare ?? config?.maxDeclare ?? 30;

  let cancelCompletion: (() => void) | undefined;

  const completionOptions: CompletionOptions = {
    model,
    maxTokens,
    responseStreamCallback: args.responseStreamCallback,
    responseCallback: args.responseCallback,
    cancelCallback: (cancel) => {
      cancelCompletion = cancel;
    },
  };

  const includes = await getIncludedFiles(
    includesFromCLI,
    excludesFromCLI,
    promptFilePath,
    promptSettings,
    context.workingDir
  );

  const declarations = await getIncludedDeclarations(
    declarationsFromCLI,
    api,
    promptFilePath,
    promptSettings,
    completionOptions,
    maxDeclare,
    args.config,
    context.workingDir,
    config
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
    declare: declarations,
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

  writeDebug("--- PROMPT ---");
  writeDebug(evaluatedPrompt);

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

  function generateCommandCancel() {
    if (cancelCompletion) {
      cancelCompletion();
    }
  }

  if (args.cancelCallback) {
    args.cancelCallback(generateCommandCancel);
  }

  const completion = getCompletionAPI(api);

  const completionResult = await completion(
    evaluatedPrompt,
    args.config,
    completionOptions,
    context.workingDir
  );

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
        args.parseCallback(
          await Promise.all(
            files.map(async (file) => {
              return {
                path: file.path,
                original: (await pathExists(
                  path.resolve(context.workingDir, file.path)
                ))
                  ? await readFile(
                      path.resolve(context.workingDir, file.path)
                    ).toString()
                  : undefined,
                generated: file.contents,
              };
            })
          )
        );
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
    if (completionResult.error.code === "length") {
      throw new Error(
        "Ran out of tokens. Increase token size by specifying the --max-tokens argument."
      );
    } else {
      throw new Error(
        `${completionResult.error.code}: ${completionResult.error.message}`
      );
    }
  }
}

function removeDuplicates<T>(
  arr: T[],
  getStringToCompare: (x: T) => string
): T[] {
  const uniqueElements = new Map<string, T>();

  arr.forEach((element) => {
    const comparisonString = getStringToCompare(element);
    if (!uniqueElements.has(comparisonString)) {
      uniqueElements.set(comparisonString, element);
    }
  });

  return Array.from(uniqueElements.values());
}

async function getIncludedFiles(
  includesFromCLI: VersionedPath[],
  excludesFromCLI: string[],
  promptFilePath: string | undefined,
  promptSettings: PromptSettings | undefined,
  workingDir: string
): Promise<VersionedFileInfo[]> {
  const includesFromPrompt = promptFilePath
    ? await Promise.all(
        (promptSettings?.include || []).map(async (x) =>
          getVersionedPath(x, path.dirname(promptFilePath), true, workingDir)
        )
      )
    : [];

  const allPaths = includesFromCLI.concat(includesFromPrompt);

  const pathsWithWildcards: VersionedPath[] = (
    await Promise.all(
      allPaths.map(async (x) =>
        x.path.includes("*")
          ? (
              await resolveWildcardPaths(x.path)
            ).map((f) => ({
              path: f,
              version: x.version,
            }))
          : x
      )
    )
  ).flat();

  const validFiles = removeDuplicates(
    pathsWithWildcards.filter((x) => !excludesFromCLI.includes(x.path)),
    (x) => x.path
  );

  const fileInfoList = await Promise.all(
    validFiles.map((x) => getVersionedFileInfo(x, workingDir))
  );

  return fileInfoList;
}

async function getIncludedDeclarations(
  declarationsFromCLI: string[],
  api: string,
  promptFilePath: string | undefined,
  promptSettings: PromptSettings | undefined,
  completionOptions: CompletionOptions,
  maxDeclare: number,
  customConfigDir: string | undefined,
  workingDir: string,
  config: CodespinConfig
): Promise<BasicFileInfo[]> {
  const declarationsFromPrompt = promptFilePath
    ? await Promise.all(
        (promptSettings?.declare || []).map(async (x) =>
          resolvePathInProject(x, path.dirname(promptFilePath), workingDir)
        )
      )
    : [];

  const allPaths = declarationsFromPrompt.concat(declarationsFromCLI);

  const pathsWithWildcards: string[] = (
    await Promise.all(
      allPaths.map(async (x) =>
        x.includes("*") ? await resolveWildcardPaths(x) : x
      )
    )
  ).flat();

  const filePaths = removeDuplicates(pathsWithWildcards, (x) => x);

  if (filePaths.length > maxDeclare) {
    exception(
      `The number of declaration files exceeded ${maxDeclare}. Set the --max-declare parameter.`
    );
  }

  if (filePaths.length) {
    return await getDeclarations(
      filePaths,
      api,
      customConfigDir,
      completionOptions,
      workingDir,
      config
    );
  } else {
    return [];
  }
}

// If the out is mentioned in the CLI it's relative to the working dir.
// If it's mentioned in prompt front-matter, it is relative to the prompt file's directory.
async function getOutPath(
  outFromCLI: string | undefined,
  promptFilePath: string | undefined,
  promptSettings: PromptSettings | undefined,
  workingDir: string
): Promise<string | undefined> {
  return outFromCLI
    ? path.resolve(workingDir, outFromCLI)
    : promptFilePath && promptSettings && promptSettings.out
    ? (() => {
        const dirOfPromptFile = path.dirname(promptFilePath);
        const outPath = path.resolve(dirOfPromptFile, promptSettings.out);
        return outPath;
      })()
    : undefined;
}
