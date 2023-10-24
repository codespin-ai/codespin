import path from "path";
import { CompletionOptions } from "../api/CompletionOptions.js";
import { getCompletionAPI } from "../api/getCompletionAPI.js";
import { getVersionedFileInfo } from "../fs/getFileContent.js";
import { resolveProjectFilePath } from "../fs/resolveProjectFilePath.js";
import { pathExists } from "../fs/pathExists.js";
import { writeFilesToDisk } from "../fs/writeFilesToDisk.js";
import { writeToFile } from "../fs/writeToFile.js";
import { evaluateTemplate } from "../prompts/evaluateTemplate.js";
import { extractCode } from "../prompts/extractCode.js";
import { getPrompt } from "../prompts/getPrompt.js";
import {
  PromptSettings,
  readPromptSettings,
} from "../prompts/readPromptSettings.js";
import { readConfig } from "../settings/readConfig.js";
import { getDeclarations } from "../sourceCode/getDeclarations.js";
import { getTemplatePath } from "../templating/getTemplatePath.js";
import { writeToConsole } from "../writeToConsole.js";
import { resolveWildcardPaths } from "../fs/resolveWildcards.js";
import { exception } from "../exception.js";
import { VersionedFileInfo } from "../fs/VersionedFileInfo.js";
import { BasicFileInfo } from "../fs/BasicFileInfo.js";

export type GenerateArgs = {
  promptFile: string | undefined;
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
  single: boolean | undefined;
  parser: string | undefined;
  parse: boolean | undefined;
  go: boolean | undefined;
  maxDeclare: number | undefined;
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

  const configFile = args.config || "codespin.json";

  const config = (await pathExists(configFile))
    ? await readConfig(configFile)
    : undefined;

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
  };

  const sourceFilePath = await getSourceFilePath(promptFilePath, args.single);
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
    maxDeclare
  );

  const templatePath = await getTemplatePath(
    args.template,
    args.go ? "plain.mjs" : "default.mjs"
  );

  const {
    prompt,
    promptWithLineNumbers,
    previousPrompt,
    previousPromptWithLineNumbers,
    promptDiff,
  } = await getPrompt(promptFilePath, args.prompt, args.baseDir);

  const evaluatedPrompt = await evaluateTemplate(templatePath, {
    prompt,
    promptWithLineNumbers,
    previousPrompt,
    previousPromptWithLineNumbers,
    promptDiff,
    include: includes,
    sourceFile: sourceFileContent,
    single: args.single,
    targetFilePath: sourceFilePath,
    declare: declarations,
    promptSettings,
    templateArgs: args.templateArgs,
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

  const completionResult = await completion(evaluatedPrompt, completionOptions);

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
          args.baseDir || process.cwd(),
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
    ? await Promise.all(
        (promptSettings?.include || []).map(async (x) =>
          resolveProjectFilePath(x, path.dirname(promptFilePath))
        )
      )
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
  ).filter((x) => x.contents || x.previousContents);
}

async function getIncludedDeclarations(
  declarationFilePaths: string[],
  api: string,
  sourceFilePath: string | undefined,
  promptFilePath: string | undefined,
  promptSettings: PromptSettings | undefined,
  completionOptions: CompletionOptions,
  maxDeclare: number
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
    return await getDeclarations(declarations, api, completionOptions);
  } else {
    return [];
  }
}

// Get the source file, if it's a single file code-gen.
// Single file prompts have a source.ext.prompt.md extension.
async function getSourceFilePath(
  promptFilePath: string | undefined,
  single: boolean | undefined
): Promise<string | undefined> {
  const sourceFilePath = await (async () => {
    if (promptFilePath !== undefined) {
      return single === false
        ? undefined
        : single === true || /\.[a-zA-Z0-9]+\.prompt\.md$/.test(promptFilePath)
        ? promptFilePath.replace(/\.prompt\.md$/, "")
        : undefined;
    }
    return undefined;
  })();

  return sourceFilePath ? path.resolve(sourceFilePath) : undefined;
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
