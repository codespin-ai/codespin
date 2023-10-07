import { promises as fs } from "fs";
import { dirname, join, resolve } from "path";
import { completion as openaiCompletion } from "../api/openai/completion.js";
import { extractFilesToDisk } from "../fs/extractFilesToDisk.js";
import { writeToFile } from "../fs/writeToFile.js";
import { getDiff } from "../git/getDiff.js";
import { getFileFromCommit } from "../git/getFileFromCommit.js";
import { isCommitted } from "../git/isCommitted.js";
import { FileContent, evaluateTemplate } from "../prompts/evaluateTemplate.js";
import { readPromptSettings } from "../prompts/readPromptSettings.js";
import { removeFrontMatter } from "../prompts/removeFrontMatter.js";
import { readConfig } from "../settings/readConfig.js";
import { addLineNumbers } from "../text/addLineNumbers.js";
import { pathExists } from "../fs/pathExists.js";
import { isGitRepo } from "../git/isGitRepo.js";

export type GenerateArgs = {
  promptFile: string;
  api: string | undefined;
  model: string | undefined;
  maxTokens: number | undefined;
  write: boolean | undefined;
  writePrompt: string | undefined;
  template: string | undefined;
  debug: boolean | undefined;
  exec: string | undefined;
  config: string | undefined;
  include: string[] | undefined;
  baseDir: string | undefined;
};

export async function generate(args: GenerateArgs): Promise<void> {
  const configFile = resolve(args.config || "codespin.json");

  const config = (await pathExists(configFile))
    ? await readConfig(configFile)
    : undefined;

  const promptFileDir = dirname(args.promptFile);

  const promptSettings = await readPromptSettings(args.promptFile);

  const filesToInclude = removeDuplicates(promptSettings?.include || []).concat(
    args.include || []
  );

  const includedFilesOrNothing = await Promise.all(
    filesToInclude.map(async (inc) => {
      if (await pathExists(inc)) {
        const contents = await fs.readFile(inc, "utf-8");
        const previousContents = isGitRepo()
          ? await getFileFromCommit(inc)
          : undefined;
        return {
          name: inc,
          contents,
          contentsWithLineNumbers: addLineNumbers(contents),
          previousContents,
          previousContentsWithLineNumbers: previousContents
            ? addLineNumbers(previousContents)
            : undefined,
          hasDifferences: contents === previousContents,
        };
      } else {
        return undefined;
      }
    })
  );

  const includedFiles = (
    includedFilesOrNothing.filter(
      (x) => typeof x !== "undefined"
    ) as FileContent[]
  ).filter((x) => x.contents || x.previousContents);

  // Prompt file contents without frontMatter.
  const prompt = removeFrontMatter(await fs.readFile(args.promptFile, "utf-8"));
  const promptWithLineNumbers = addLineNumbers(prompt);

  const isPromptFileCommitted = await isCommitted(args.promptFile);

  const { previousPrompt, previousPromptWithLineNumbers, promptDiff } =
    isPromptFileCommitted
      ? await (async () => {
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
              ? await getDiff(prompt, previousPrompt)
              : undefined;
          return {
            previousPrompt,
            previousPromptWithLineNumbers,
            promptDiff,
          };
        })()
      : {
          previousPrompt: "",
          previousPromptWithLineNumbers: "",
          promptDiff: "",
        };

  // If the template is not provided, we'll use generate.md
  // For template resolution, first we check relative to the current path.
  // If not found, we'll check in the codespin/templates directory.
  const templateName = args.template || "generate.md";

  const templatePath = (await pathExists(templateName))
    ? resolve(templateName)
    : (await pathExists(resolve("codespin/templates", templateName)))
    ? resolve("codespin/templates", templateName)
    : undefined;

  if (!templatePath) {
    throw new Error(
      `The template ${templatePath} was not found. Have you done 'codespin init'?`
    );
  }

  const evaluatedPrompt = await evaluateTemplate(templatePath, {
    prompt,
    promptWithLineNumbers,
    previousPrompt,
    previousPromptWithLineNumbers,
    promptDiff,
    files: includedFiles,
  });

  if (args.debug) {
    console.log("--- PROMPT ---");
    console.log(evaluatedPrompt);
  }

  if (typeof args.writePrompt !== "undefined") {
    if (!args.writePrompt) {
      throw new Error(`Specify a file path for the --write-prompt parameter.`);
    }
    await writeToFile(args.writePrompt, evaluatedPrompt);
    console.log(`Wrote prompt to ${args.writePrompt}`);
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
    const code = completionResult.files[0].contents;
    if (args.write) {
      const extractResult = await extractFilesToDisk(
        args.baseDir || promptFileDir,
        completionResult,
        args.exec
      );
      const generatedFiles = extractResult.filter((x) => x.generated);
      const skippedFiles = extractResult.filter((x) => !x.generated);

      if (generatedFiles.length) {
        console.log(`Generated ${generatedFiles.map((x) => x.file).join(", ")}.`);
      }
      if (skippedFiles.length) {
        console.log(`Skipped ${skippedFiles.map((x) => x.file).join(", ")}.`);
      }
    } else {
      console.log(code);
    }
  } else {
    throw new Error(
      `${completionResult.error.code}: ${completionResult.error.message}`
    );
  }
}

function removeDuplicates(arr: string[]): string[] {
  return [...new Set(arr)];
}
