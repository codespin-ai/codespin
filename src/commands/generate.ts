import path from "path";
import { CompletionOptions } from "../api/CompletionOptions.js";
import { getCompletionAPI } from "../api/getCompletionAPI.js";
import { writeToConsole } from "../console.js";
import { exception } from "../exception.js";
import { BasicFileInfo } from "../fs/BasicFileInfo.js";
import { VersionedFileInfo } from "../fs/VersionedFileInfo.js";
import { getVersionedFileInfo } from "../fs/getFileContent.js";
import { resolvePath } from "../fs/resolvePath.js";
import { resolveWildcardPaths } from "../fs/resolveWildcards.js";

import { writeFilesToDisk } from "../fs/writeFilesToDisk.js";
import { writeToFile } from "../fs/writeToFile.js";
import { extractCode } from "../prompts/extractCode.js";
import { readPrompt } from "../prompts/readPrompt.js";
import {
  PromptSettings,
  readPromptSettings,
} from "../prompts/readPromptSettings.js";
import { readCodespinConfig } from "../settings/readCodespinConfig.js";
import { SourceFile } from "../sourceCode/SourceFile.js";
import { getDeclarations } from "../sourceCode/getDeclarations.js";
import { TemplateArgs } from "../templating/TemplateArgs.js";
import { getTemplate } from "../templating/getTemplate.js";
import { getVersionedPath } from "../fs/getVersionedPath.js";
import { VersionedPath } from "../fs/VersionedPath.js";
import { CodespinContext } from "../CodeSpinContext.js";

export type GenerateArgs = {
  promptFile: string | undefined;
  out: string | undefined;
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
  responseCallback?: (text: string) => void;
  responseStreamCallback?: (text: string) => void;
  promptCallback?: (prompt: string) => void;
  parseCallback?: (files: SourceFile[]) => void;
};

export async function generate(
  args: GenerateArgs,
  context: CodespinContext
): Promise<void> {
  // Convert everything to absolute paths
  const promptFilePath = args.promptFile
    ? await resolvePath(
        args.promptFile,
        context.workingDir,
        false,
        context.workingDir
      )
    : undefined;

  const includesFromCLI: VersionedPath[] = await Promise.all(
    (args.include || []).map((x) =>
      getVersionedPath(x, context.workingDir, false, context.workingDir)
    )
  );
  const excludesFromCLI = await Promise.all(
    (args.exclude || []).map((x) =>
      resolvePath(x, context.workingDir, false, context.workingDir)
    )
  );
  const declarationsFromCLI = await Promise.all(
    (args.declare || []).map((x) =>
      resolvePath(x, context.workingDir, false, context.workingDir)
    )
  );

  const mustParse = args.parse ?? (args.go ? false : true);

  const config = await readCodespinConfig(args.config, context.workingDir);

  const promptSettings = promptFilePath
    ? await readPromptSettings(promptFilePath)
    : undefined;

  const api = args.api || "openai";
  const model = args.model || promptSettings?.model || config?.model;
  const maxTokens =
    args.maxTokens ?? promptSettings?.maxTokens ?? config?.maxTokens;
  const maxDeclare =
    args.maxDeclare ?? promptSettings?.maxDeclare ?? config?.maxDeclare ?? 30;

  const completionOptions: CompletionOptions = {
    model,
    maxTokens,
    debug: args.debug,
    responseStreamCallback: args.responseStreamCallback,
    responseCallback: args.responseCallback,
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
    context.workingDir
  );

  const templateFunc = await getTemplate<TemplateArgs>(
    args.template,
    args.go ? "plain" : "default",
    args.config,
    context.workingDir
  );

  const { prompt, promptWithLineNumbers } = await readPrompt(
    promptFilePath,
    args.prompt,
    context.workingDir
  );

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
  };

  const evaluatedPrompt = await templateFunc(generateCodeTemplateArgs);

  if (args.promptCallback) {
    args.promptCallback(evaluatedPrompt);
  }

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
    completionOptions,
    context.workingDir
  );

  if (completionResult.ok) {
    if (mustParse) {
      // Do we have a custom response parser?
      const customParser = args.parser || promptSettings?.parser;
      const parseFunc = customParser
        ? (await import(customParser)).default
        : extractCode;

      const files: SourceFile[] = parseFunc(completionResult.message);

      if (args.parseCallback) {
        args.parseCallback(files);
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
  codespinDir: string | undefined,
  workingDir: string
): Promise<BasicFileInfo[]> {
  const declarationsFromPrompt = promptFilePath
    ? await Promise.all(
        (promptSettings?.declare || []).map(async (x) =>
          resolvePath(x, path.dirname(promptFilePath), true, workingDir)
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
      codespinDir,
      completionOptions,
      workingDir
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
    ? resolvePath(outFromCLI, workingDir, false, workingDir)
    : promptFilePath && promptSettings && promptSettings.out
    ? (() => {
        const dirOfPromptFile = path.dirname(promptFilePath);
        const outPath = path.resolve(dirOfPromptFile, promptSettings.out);
        return outPath;
      })()
    : undefined;
}
