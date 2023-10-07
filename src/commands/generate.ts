import { promises as fs } from "fs";
import { dirname, join, resolve } from "path";
import { completion as openaiCompletion } from "../api/openai/completion.js";
import { extractFilesToDisk } from "../fs/extractFilesToDisk.js";
import { findFileInDirOrParents } from "../fs/findFileInDirOrParents.js";
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

export type GenerateArgs = {
  promptFile: string;
  api: string | undefined;
  model: string | undefined;
  maxTokens: number | undefined;
  write: boolean | undefined;
  writePrompt: string | undefined;
  template: string;
  debug: boolean | undefined;
  exec: string | undefined;
  config: string | undefined;
  include: string[] | undefined;
  baseDir: string | undefined;
};

export async function generate(args: GenerateArgs): Promise<void> {
  const projectRoot = await findFileInDirOrParents(
    process.cwd(),
    "codespin.json"
  );

  const configFile = resolve(args.config || "codespin.json");

  const config = (await pathExists(configFile))
    ? await readConfig(configFile)
    : undefined;

  const includedFiles = await (args.include || []).reduce(async (acc, inc) => {
    const contents = await fs.readFile(inc, "utf-8");
    const previousContents = await getFileFromCommit(inc);
    (await acc)[inc] = {
      name: inc,
      contents,
      contentsWithLineNumbers: addLineNumbers(contents),
      previousContents,
      previousContentsWithLineNumbers: addLineNumbers(previousContents),
    };
    return acc;
  }, Promise.resolve({}) as Promise<Record<string, FileContent>>);

  const promptFileDir = dirname(args.promptFile);

  const promptSettings = await readPromptSettings(args.promptFile);

  // Prompt file contents without frontMatter.
  const prompt = removeFrontMatter(await fs.readFile(args.promptFile, "utf-8"));
  const promptWithLineNumbers = addLineNumbers(prompt);

  const isPromptFileCommitted = await isCommitted(args.promptFile);

  const { previousPrompt, previousPromptWithLineNumbers, promptDiff } =
    isPromptFileCommitted
      ? await (async () => {
          const previousPrompt = removeFrontMatter(
            await getFileFromCommit(args.promptFile)
          );
          const previousPromptWithLineNumbers = addLineNumbers(previousPrompt);
          const promptDiff = await getDiff(prompt, previousPrompt);
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

  // For template resolution, first we check relative to the current path.
  // If not found, we'll check in the codespin/templates directory.
  const templatePath = (await pathExists(args.template))
    ? resolve(args.template)
    : (await pathExists(resolve("codespin/templates", args.template)))
    ? resolve("codespin/templates", args.template)
    : undefined;

  if (!templatePath) {
    throw new Error(`The template ${args.template} was not found.`);
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
      console.log(
        `Generated ${extractResult
          .filter((x) => x.generated)
          .join(", ")}. Skipped ${extractResult
          .filter((x) => !x.generated)
          .join(", ")}.`
      );
    } else {
      console.log(code);
    }
  } else {
    throw new Error(
      `${completionResult.error.code}: ${completionResult.error.message}`
    );
  }
}
