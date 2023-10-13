import { promises as fs } from "fs";
import { join, resolve } from "path";
import * as url from "url";
import { completion as openaiCompletion } from "../api/openai/completion.js";
import { exception } from "../exception.js";
import { getFileContent } from "../files/getFileContent.js";
import { extractFilesToDisk } from "../fs/extractFilesToDisk.js";
import { pathExists } from "../fs/pathExists.js";
import { writeToFile } from "../fs/writeToFile.js";
import { getDiff } from "../git/getDiff.js";
import { getFileFromCommit } from "../git/getFileFromCommit.js";
import { isCommitted } from "../git/isCommitted.js";
import { FileContent, evaluateTemplate } from "../prompts/evaluateTemplate.js";
import {
  PromptSettings,
  readPromptSettings,
} from "../prompts/readPromptSettings.js";
import { removeFrontMatter } from "../prompts/removeFrontMatter.js";
import { readConfig } from "../settings/readConfig.js";
import { getDeclarations } from "../sourceCode/getDeclarations.js";
import { addLineNumbers } from "../text/addLineNumbers.js";
import { writeToConsole } from "../writeToConsole.js";
import { CodeSpinConfig } from "../settings/CodeSpinConfig.js";
import { getTemplatePath } from "../templating/getTemplatePath.js";

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

  const targetFilePath = await getTargetFilePath(args);
  const sourceFile = await getSourceFile(targetFilePath, args);

  const includedFiles = await getIncludedFiles(args, promptSettings);
  const declarations = await getIncludedDeclarations(
    args,
    promptSettings,
    config
  );

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
  } = await getPrompt(args);

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

  const model = args.model || promptSettings?.model || config?.model;

  const maxTokens =
    args.maxTokens || promptSettings?.maxTokens || config?.maxTokens;

  if (args.api !== "openai") {
    throw new Error(
      "Invalid API specified. Only 'openai' is supported currently."
    );
  }

  const completionResult = await openaiCompletion(
    evaluatedPrompt,
    model,
    maxTokens,
    args.debug
  );

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
  const filesToInclude = removeDuplicates(
    (promptSettings?.include || []).concat(args.include || [])
  ).filter((x) => !(args.exclude || []).includes(x));

  const includedFilesOrNothing = await Promise.all(
    filesToInclude.map(getFileContent)
  );

  return (
    includedFilesOrNothing.filter(
      (x) => typeof x !== "undefined"
    ) as FileContent[]
  ).filter((x) => x.contents || x.previousContents);
}

async function getIncludedDeclarations(
  args: GenerateArgs,
  promptSettings: PromptSettings | undefined,
  config: CodeSpinConfig | undefined
): Promise<{ name: string; declarations: string }[]> {
  const declarationsToInclude = removeDuplicates(
    (promptSettings?.declare || []).concat(args.declare || [])
  );

  if (declarationsToInclude.length) {
    if (!(await pathExists("codespin/declarations"))) {
      exception(
        `The path codespin/declarations was not found. Have you done "codespin init"?`
      );
    }
    return await Promise.all(
      declarationsToInclude.map(async (file) => {
        const declarations = await getDeclarations(
          file,
          args,
          promptSettings,
          config
        );
        return {
          name: file,
          declarations,
        };
      })
    );
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

async function getPrompt(args: GenerateArgs): Promise<{
  prompt: string;
  promptWithLineNumbers: string;
  previousPrompt: string | undefined;
  previousPromptWithLineNumbers: string | undefined;
  promptDiff: string | undefined;
}> {
  // Prompt file contents without frontMatter.
  const prompt = args.promptFile
    ? removeFrontMatter(await fs.readFile(args.promptFile, "utf-8"))
    : args.prompt ||
      exception(
        "The prompt file must be specified. See 'codespin generate help'."
      );

  const promptWithLineNumbers = addLineNumbers(prompt);

  const isPromptFileCommitted = args.promptFile
    ? await isCommitted(args.promptFile)
    : false;

  const { previousPrompt, previousPromptWithLineNumbers, promptDiff } =
    isPromptFileCommitted
      ? await (async () => {
          if (args.promptFile) {
            const fileFromCommit = await getFileFromCommit(args.promptFile);
            const previousPrompt =
              fileFromCommit !== undefined
                ? removeFrontMatter(fileFromCommit)
                : undefined;
            const previousPromptWithLineNumbers =
              previousPrompt !== undefined
                ? addLineNumbers(previousPrompt)
                : undefined;
            const promptDiff =
              previousPrompt !== undefined
                ? await getDiff(prompt, previousPrompt, args.promptFile)
                : undefined;
            return {
              previousPrompt,
              previousPromptWithLineNumbers,
              promptDiff,
            };
          } else {
            exception("invariant exception: missing prompt file");
          }
        })()
      : {
          previousPrompt: "",
          previousPromptWithLineNumbers: "",
          promptDiff: "",
        };
  return {
    prompt,
    promptWithLineNumbers,
    previousPrompt,
    previousPromptWithLineNumbers,
    promptDiff,
  };
}
