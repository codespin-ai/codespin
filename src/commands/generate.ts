import path from "path";
import { CompletionOptions } from "../api/CompletionOptions.js";
import { getCompletionAPI } from "../api/getCompletionAPI.js";
import { writeToConsole } from "../console.js";
import { exception } from "../exception.js";
import { BasicFileInfo } from "../fs/BasicFileInfo.js";
import { VersionedFileInfo } from "../fs/VersionedFileInfo.js";
import { getVersionedFileInfo } from "../fs/getFileContent.js";
import { pathExists } from "../fs/pathExists.js";
import { resolvePath } from "../fs/resolvePath.js";
import { resolvePathsInPrompt } from "../fs/resolvePathsInPrompt.js";
import { resolveWildcardPaths } from "../fs/resolveWildcards.js";
import { getWorkingDir } from "../fs/workingDir.js";
import { writeFilesToDisk } from "../fs/writeFilesToDisk.js";
import { writeToFile } from "../fs/writeToFile.js";
import { extractCode } from "../prompts/extractCode.js";
import { readPrompt } from "../prompts/readPrompt.js";
import {
  PromptSettings,
  readPromptSettings,
} from "../prompts/readPromptSettings.js";
import { readCodespinConfig } from "../settings/readCodespinConfig.js";
import { getDeclarations } from "../sourceCode/getDeclarations.js";
import { getTemplate } from "../templating/getTemplate.js";

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
  outDir: string | undefined;
  parser: string | undefined;
  parse: boolean | undefined;
  go: boolean | undefined;
  maxDeclare: number | undefined;
  apiVersion: string | undefined;
  dataCallback?: (data: string) => void;
};

export async function generate(args: GenerateArgs): Promise<void> {
  // Convert everything to absolute paths
  const promptFilePath = args.promptFile
    ? await resolvePath(args.promptFile)
    : undefined;

  const includesFromCLI = await Promise.all(
    (args.include || []).map((x) => resolvePath(x))
  );
  const excludesFromCLI = await Promise.all(
    (args.exclude || []).map((x) => resolvePath(x))
  );
  const declarationsFromCLI = await Promise.all(
    (args.declare || []).map((x) => resolvePath(x))
  );

  const sourceFromCLI = args.source
    ? await resolvePath(args.source)
    : undefined;

  const mustParse = args.parse ?? (args.go ? false : true);

  const config = await readCodespinConfig(args.config);

  const promptSettings = promptFilePath
    ? await readPromptSettings(promptFilePath)
    : undefined;

  const sourceFilePath = await getSourceFilePath(
    sourceFromCLI,
    promptFilePath,
    promptSettings
  );

  const api = args.api || "openai";
  const model = args.model || promptSettings?.model || config?.model;
  const apiVersion = args.apiVersion;
  const maxTokens =
    args.maxTokens ?? promptSettings?.maxTokens ?? config?.maxTokens;
  const maxDeclare =
    args.maxDeclare ?? promptSettings?.maxDeclare ?? config?.maxDeclare ?? 30;

  const completionOptions: CompletionOptions = {
    model,
    maxTokens,
    debug: args.debug,
    dataCallback: args.dataCallback,
    apiVersion,
  };

  const sourceFileContent = await getSourceFileContent(
    sourceFilePath,
    excludesFromCLI
  );

  const includes = await getIncludedFiles(
    includesFromCLI,
    excludesFromCLI,
    sourceFilePath,
    promptFilePath,
    promptSettings
  );

  const declarations = await getIncludedDeclarations(
    declarationsFromCLI,
    api,
    sourceFilePath,
    promptFilePath,
    promptSettings,
    completionOptions,
    maxDeclare,
    args.config
  );

  const templateFunc = await getTemplate(
    args.template,
    args.go ? "plain" : "default",
    args.config
  );

  const { prompt, promptWithLineNumbers } = await readPrompt(
    promptFilePath,
    args.prompt
  );

  const evaluatedPrompt = await templateFunc({
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
          args.outDir || getWorkingDir(),
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

// If the source is mentioned in the CLI it's relative to the working dir.
// If it's mentioned in prompt front-matter, it is relative to the prompt file's directory.
async function getSourceFilePath(
  sourceFromCLI: string | undefined,
  promptFilePath: string | undefined,
  promptSettings: PromptSettings | undefined
): Promise<string | undefined> {
  return sourceFromCLI
    ? resolvePath(sourceFromCLI)
    : promptFilePath && promptSettings && promptSettings.source
    ? (() => {
        const dirOfPromptFile = path.dirname(promptFilePath);
        const sourcePath = path.resolve(dirOfPromptFile, promptSettings.source);
        return sourcePath;
      })()
    : undefined;
}

async function getIncludedFiles(
  includesFromCLI: string[],
  excludesFromCLI: string[],
  sourceFilePath: string | undefined,
  promptFilePath: string | undefined,
  promptSettings: PromptSettings | undefined
): Promise<VersionedFileInfo[]> {
  const pathsFromPrompt = promptFilePath
    ? (
        await Promise.all(
          (promptSettings?.include || [])
            .map(async (x) =>
              resolvePathsInPrompt(path.dirname(promptFilePath), x)
            )
            .filter((x) => x !== undefined)
        )
      ).filter((x) => x !== undefined)
    : [];

  const validFiles = pathsFromPrompt
    .concat(includesFromCLI)
    .filter((x) => !excludesFromCLI.includes(x));

  const filePaths = removeDuplicates(
    (
      await Promise.all(
        validFiles.map(async (x) =>
          x.includes("*") ? await resolveWildcardPaths(x) : x
        )
      )
    ).flat()
  ).filter((x) => x !== sourceFilePath);

  const fileContentList = await Promise.all(
    filePaths.map(getVersionedFileInfo)
  );

  return (
    fileContentList.filter(
      (x) => typeof x !== "undefined"
    ) as VersionedFileInfo[]
  ).filter((x) => x.contents);
}

async function getIncludedDeclarations(
  declarationsFromCLI: string[],
  api: string,
  sourceFilePath: string | undefined,
  promptFilePath: string | undefined,
  promptSettings: PromptSettings | undefined,
  completionOptions: CompletionOptions,
  maxDeclare: number,
  codespinDir: string | undefined
): Promise<BasicFileInfo[]> {
  const pathsFromPrompt = promptFilePath
    ? await Promise.all(
        (promptSettings?.declare || []).map(async (x) =>
          resolvePathsInPrompt(path.dirname(promptFilePath), x)
        )
      )
    : [];

  const allFiles = pathsFromPrompt.concat(declarationsFromCLI);

  const filePaths = removeDuplicates(
    (
      await Promise.all(
        allFiles.map(async (x) =>
          x.includes("*") ? await resolveWildcardPaths(x) : x
        )
      )
    ).flat()
  ).filter((x) => x !== sourceFilePath);

  if (filePaths.length > maxDeclare) {
    exception(
      `The number of declaration files exceeded ${maxDeclare}. Set the --max-declare parameter.`
    );
  }

  if (filePaths.length) {
    return await getDeclarations(
      filePaths,
      api,
      codespinDir,
      completionOptions
    );
  } else {
    return [];
  }
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
