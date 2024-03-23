import path from "path";
import { CompletionOptions } from "../api/CompletionOptions.js";
import { getCompletionAPI } from "../api/getCompletionAPI.js";
import { writeToConsole } from "../console.js";
import { exception } from "../exception.js";
import { BasicFileInfo } from "../fs/BasicFileInfo.js";
import { VersionedFileInfo } from "../fs/VersionedFileInfo.js";
import { getVersionedFileInfo } from "../fs/getFileContent.js";
import { pathExists } from "../fs/pathExists.js";
import { resolveProjectFilePath } from "../fs/resolveProjectFilePath.js";
import { resolveWildcardPaths } from "../fs/resolveWildcards.js";
import { getWorkingDir } from "../fs/workingDir.js";
import { writeFilesToDisk } from "../fs/writeFilesToDisk.js";
import { writeToFile } from "../fs/writeToFile.js";
import { evalTemplate } from "../prompts/evalTemplate.js";
import { extractCode } from "../prompts/extractCode.js";
import { readPrompt } from "../prompts/readPrompt.js";
import {
  PromptSettings,
  readPromptSettings,
} from "../prompts/readPromptSettings.js";
import { readConfig } from "../settings/readConfig.js";
import { getDeclarations } from "../sourceCode/getDeclarations.js";
import { getTemplatePath } from "../templating/getTemplatePath.js";

export type GenerateArgs = {
  promptFile: string | undefined;
  source: string | undefined;
  version: "current" | "HEAD" | undefined;
  prompt: string | undefined;
  api: string | undefined;
  model: string | undefined;
  maxTokens: number | undefined;
  write: boolean | undefined;
  printPrompt: boolean | undefined;
  writePrompt: string | undefined;
  template: string | undefined;
  templateArgs: string[] | undefined;
  debug: boolean | undefined;
  exec: string | undefined;
  config: string | undefined;
  include: string[] | undefined;
  exclude: string[] | undefined;
  declare: string[] | undefined;
  baseDir: string | undefined;
  parser: string | undefined;
  parse: boolean | undefined;
  go: boolean | undefined;
  maxDeclare: number | undefined;
  dataCallback?: (data: string) => void;
};

export async function generate(args: GenerateArgs): Promise<void> {
  // Convert everything to absolute paths
  const promptFilePath = args.promptFile
    ? path.resolve(args.promptFile)
    : undefined;

  const includedFilePaths = (args.include || []).map((x) => path.resolve(x));
  const excludedFilePaths = (args.exclude || []).map((x) => path.resolve(x));
  const declarationFilePaths = (args.declare || []).map((x) => path.resolve(x));

  const mustParse = args.parse ?? (args.go ? false : true);

  const config = await readConfig(args.config);

  const promptSettings = promptFilePath
    ? await readPromptSettings(promptFilePath)
    : {};

  const api = args.api || "openai";
  const model = args.model || promptSettings?.model || config?.model;
  const maxTokens =
    args.maxTokens ?? promptSettings?.maxTokens ?? config?.maxTokens;

  const maxDeclare =
    args.maxDeclare ?? promptSettings?.maxDeclare ?? config?.maxDeclare ?? 30;

  const completionOptions = {
    model,
    maxTokens,
    debug: args.debug,
    dataCallback: args.dataCallback,
  };

  const sourceFilePath = await getSourceFilePath(
    promptFilePath,
    promptSettings,
    args
  );

  const sourceFileContent = await getSourceFileContent(
    sourceFilePath,
    excludedFilePaths
  );

  const includes = await getIncludedFiles(
    includedFilePaths,
    excludedFilePaths,
    sourceFilePath,
    promptFilePath,
    promptSettings
  );

  const declarations = await getIncludedDeclarations(
    declarationFilePaths,
    api,
    sourceFilePath,
    promptFilePath,
    promptSettings,
    completionOptions,
    maxDeclare,
    args.config
  );

  const templatePath = await getTemplatePath(
    args.template,
    args.go ? "plain.mjs" : "default.mjs",
    args.config
  );

  const { prompt, promptWithLineNumbers } = await readPrompt(
    promptFilePath,
    args.prompt,
    args.baseDir
  );

  const evaluatedPrompt = await evalTemplate(templatePath, {
    prompt,
    promptWithLineNumbers,
    include: includes,
    sourceFile: sourceFileContent,
    targetFilePath: sourceFilePath,
    declare: declarations,
    promptSettings,
    templateArgs: args.templateArgs,
    version: args.version ?? "current",
    workingDir: getWorkingDir(),
  });

  if (args.debug) {
    writeToConsole("--- PROMPT ---");
    writeToConsole(evaluatedPrompt);
  }

  if (args.printPrompt || typeof args.writePrompt !== "undefined") {
    if (args.printPrompt) {
      writeToConsole(evaluatedPrompt);
    }

    if (typeof args.writePrompt !== "undefined") {
      // If --write-prompt is specified but no file is mentioned
      if (!args.writePrompt) {
        throw new Error(
          `Specify a file path for the --write-prompt parameter.`
        );
      }

      await writeToFile(args.writePrompt, evaluatedPrompt, false);
      writeToConsole(`Wrote prompt to ${args.writePrompt}`);
    }

    return;
  }

  const completion = getCompletionAPI(api);

  const completionResult = await completion(
    evaluatedPrompt,
    args.config,
    completionOptions
  );

  if (completionResult.ok) {
    if (mustParse) {
      // Do we have a custom response parser?
      const customParser = args.parser || promptSettings?.parser;
      const parseFunc = customParser
        ? (await import(customParser)).default
        : extractCode;

      const files = parseFunc(completionResult.message);

      if (args.write) {
        const extractResult = await writeFilesToDisk(
          args.baseDir || getWorkingDir(),
          files,
          args.exec
        );
        const generatedFiles = extractResult.filter((x) => x.generated);
        const skippedFiles = extractResult.filter((x) => !x.generated);

        if (generatedFiles.length) {
          writeToConsole(
            `Generated ${generatedFiles.map((x) => x.file).join(", ")}.`
          );
        }
        if (skippedFiles.length) {
          writeToConsole(
            `Skipped ${skippedFiles.map((x) => x.file).join(", ")}.`
          );
        }
      } else {
        for (const file of files) {
          const header = `FILE: ${file.path}`;
          writeToConsole(header);
          writeToConsole("-".repeat(header.length));
          writeToConsole(file.contents);
          writeToConsole();
        }
      }
    } else {
      writeToConsole(completionResult.message);
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

function removeDuplicates(arr: string[]): string[] {
  return [...new Set(arr)];
}

async function getIncludedFiles(
  includedFilePaths: string[],
  excludedFilePaths: string[],
  sourceFilePath: string | undefined,
  promptFilePath: string | undefined,
  promptSettings: PromptSettings | undefined
): Promise<VersionedFileInfo[]> {
  const pathsForPromptSettingsIncludes = promptFilePath
    ? (
        await Promise.all(
          (promptSettings?.include || [])
            .map(async (x) =>
              resolveProjectFilePath(x, path.dirname(promptFilePath))
            )
            .filter((x) => x !== undefined)
        )
      ).filter((x) => x !== undefined)
    : [];

  const validFiles = pathsForPromptSettingsIncludes
    .concat(includedFilePaths)
    .filter((x) => !excludedFilePaths.includes(x));

  const files = removeDuplicates(
    (
      await Promise.all(
        validFiles.map(async (x) =>
          x.includes("*") ? await resolveWildcardPaths(x) : x
        )
      )
    ).flat()
  ).filter((x) => x !== sourceFilePath);

  const fileContentList = await Promise.all(files.map(getVersionedFileInfo));

  return (
    fileContentList.filter(
      (x) => typeof x !== "undefined"
    ) as VersionedFileInfo[]
  ).filter((x) => x.contents);
}

async function getIncludedDeclarations(
  declarationFilePaths: string[],
  api: string,
  sourceFilePath: string | undefined,
  promptFilePath: string | undefined,
  promptSettings: PromptSettings | undefined,
  completionOptions: CompletionOptions,
  maxDeclare: number,
  configDirFromArgs: string | undefined
): Promise<BasicFileInfo[]> {
  const pathsForPromptSettingsDeclarations = promptFilePath
    ? await Promise.all(
        (promptSettings?.declare || []).map(async (x) =>
          resolveProjectFilePath(x, path.dirname(promptFilePath))
        )
      )
    : [];

  const allFiles =
    pathsForPromptSettingsDeclarations.concat(declarationFilePaths);

  const declarations = removeDuplicates(
    (
      await Promise.all(
        allFiles.map(async (x) =>
          x.includes("*") ? await resolveWildcardPaths(x) : x
        )
      )
    ).flat()
  ).filter((x) => x !== sourceFilePath);

  if (declarations.length > maxDeclare) {
    exception(
      `The number of declaration files exceeded ${maxDeclare}. Set the --max-declare parameter.`
    );
  }

  if (declarations.length) {
    return await getDeclarations(
      declarations,
      api,
      configDirFromArgs,
      completionOptions
    );
  } else {
    return [];
  }
}

// If the source is mentioned in the CLI it's relative to the working dir.
// If it's mentioned in prompt front-matter, it is relative to the prompt file's directory.
function getSourceFilePath(
  promptFilePath: string | undefined,
  promptSettings: PromptSettings | undefined,
  args: GenerateArgs
): string | undefined {
  return args.source
    ? path.resolve(args.source)
    : promptFilePath && promptSettings && promptSettings.source
    ? (() => {
        const dirOfPromptFile = path.dirname(promptFilePath);
        const sourcePath = path.join(dirOfPromptFile, promptSettings.source);
        return path.resolve(sourcePath);
      })()
    : undefined;
}

async function getSourceFileContent(
  sourceFilePath: string | undefined,
  excludedFilePaths: string[]
): Promise<VersionedFileInfo | undefined> {
  // Check if this file isn't excluded explicitly
  return sourceFilePath &&
    (await pathExists(sourceFilePath)) &&
    !excludedFilePaths.includes(sourceFilePath)
    ? await getVersionedFileInfo(sourceFilePath)
    : undefined;
}
