import { resolve } from "path";
import { getCompletionAPI } from "../api/getCompletionAPI.js";
import { getFileContent } from "../files/getFileContent.js";
import { extractFilesToDisk } from "../fs/extractFilesToDisk.js";
import { pathExists } from "../fs/pathExists.js";
import { writeToFile } from "../fs/writeToFile.js";
import { FileContent, evaluateTemplate } from "../prompts/evaluateTemplate.js";
import { getPrompt } from "../prompts/getPrompt.js";
import {
  PromptSettings,
  readPromptSettings,
} from "../prompts/readPromptSettings.js";
import { readConfig } from "../settings/readConfig.js";
import { getDeclarations } from "../sourceCode/getDeclarations.js";
import { getTemplatePath } from "../templating/getTemplatePath.js";
import { writeToConsole } from "../writeToConsole.js";

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
  debug: boolean | undefined;
  exec: string | undefined;
  config: string | undefined;
  include: string[] | undefined;
  exclude: string[] | undefined;
  declare: string[] | undefined;
  baseDir: string | undefined;
  multi: boolean | undefined;
};

export async function generate(args: GenerateArgs): Promise<void> {
  const configFile = resolve(args.config || "codespin.json");

  const config = (await pathExists(configFile))
    ? await readConfig(configFile)
    : undefined;

  const promptSettings = args.promptFile
    ? await readPromptSettings(args.promptFile)
    : {};

  const api = args.api || "openai";
  const model = args.model || promptSettings?.model || config?.model;
  const maxTokens =
    args.maxTokens || promptSettings?.maxTokens || config?.maxTokens;

  const targetFilePath = await getTargetFilePath(args);
  const sourceFile = await getSourceFile(targetFilePath, args);

  const includedFiles = await getIncludedFiles(args, promptSettings);
  const declarations = await getIncludedDeclarations(args, api, promptSettings);

  const templatePath = await getTemplatePath(
    args.template,
    "default.mjs",
    "default.js"
  );

  const {
    prompt,
    promptWithLineNumbers,
    previousPrompt,
    previousPromptWithLineNumbers,
    promptDiff,
  } = await getPrompt(args.promptFile, args.prompt);

  const evaluatedPrompt = await evaluateTemplate(templatePath, {
    prompt,
    promptWithLineNumbers,
    previousPrompt,
    previousPromptWithLineNumbers,
    promptDiff,
    files: includedFiles,
    sourceFile,
    multi: args.multi,
    targetFilePath,
    declarations,
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

  const completionArgs = {
    model,
    maxTokens,
    debug: args.debug,
  };

  const completionResult = await completion(evaluatedPrompt, completionArgs);

  if (completionResult.ok) {
    if (args.write) {
      const extractResult = await extractFilesToDisk(
        args.baseDir || process.cwd(),
        completionResult,
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
      for (const file of completionResult.files) {
        const header = `FILE: ${file.path}`;
        writeToConsole(header);
        writeToConsole("-".repeat(header.length));
        writeToConsole(file.contents);
        writeToConsole();
      }
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
  args: GenerateArgs,
  promptSettings: PromptSettings | undefined
): Promise<FileContent[]> {
  // Remove dupes, and
  // then remove files which have been explicitly excluded
  const files = removeDuplicates(
    (promptSettings?.include || []).concat(args.include || [])
  ).filter((x) => !(args.exclude || []).includes(x));

  const fileContentList = await Promise.all(
    files.map(getFileContent)
  );

  return (
    fileContentList.filter(
      (x) => typeof x !== "undefined"
    ) as FileContent[]
  ).filter((x) => x.contents || x.previousContents);
}

async function getIncludedDeclarations(
  args: GenerateArgs,
  api: string,
  promptSettings: PromptSettings | undefined
): Promise<{ name: string; declarations: string }[]> {
  const declarations = removeDuplicates(
    (promptSettings?.declare || []).concat(args.declare || [])
  );
  if (declarations.length) {
    return await getDeclarations(declarations, api, args);
  } else {
    return [];
  }
}

// Get the source file, if it's a single file code-gen.
// Single file prompts have a source.ext.prompt.md extension.
async function getTargetFilePath(
  args: GenerateArgs
): Promise<string | undefined> {
  return await (async () => {
    if (
      args.promptFile !== undefined &&
      /\.[a-zA-Z0-9]+\.prompt\.md$/.test(args.promptFile)
    ) {
      if (!args.multi) {
        const sourceFileName = args.promptFile.replace(/\.prompt\.md$/, "");
        return sourceFileName;
      }
    }
    return undefined;
  })();
}

async function getSourceFile(
  targetFilePath: string | undefined,
  args: GenerateArgs
): Promise<FileContent | undefined> {
  // Check if this file isn't excluded explicitly
  return targetFilePath &&
    (await pathExists(targetFilePath)) &&
    !(args.exclude || []).includes(targetFilePath)
    ? await getFileContent(targetFilePath)
    : undefined;
}
