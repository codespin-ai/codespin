import { evaluateTemplate } from "../prompts/evaluateTemplate.js";
import { getDiff } from "../git/getDiff.js";
import { completion as openaiCompletion } from "../api/openai/completion.js";
import { readPromptSettings } from "../prompts/readPromptSettings.js";
import { promises as fs } from "fs";
import { CommandResult } from "./CommandResult.js";
import { writeToFile } from "../fs/writeToFile.js";
import { dirname, join } from "path";
import { fileExists } from "../fs/fileExists.js";
import * as url from "url";
import { isCommitted } from "../git/isCommitted.js";
import { execCommand } from "../process/execCommand.js";
import { readConfig } from "../settings/readConfig.js";
import { addLineNumbers } from "../text/addLineNumbers.js";
import { removeFrontMatter } from "../prompts/removeFrontMatter.js";
import { extractFilesToDisk } from "../fs/extractFilesToDisk.js";
import { getFileFromCommit } from "../git/getFileFromCommit.js";
import { findFileInDirOrParents } from "../fs/findFileInDirOrParents.js";

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
  modify: boolean | undefined;
  include: string | string[] | undefined;
};

export async function generate(args: GenerateArgs): Promise<CommandResult> {
  const projectRoot = findFileInDirOrParents(process.cwd(), "codespin.json");

  if (!projectRoot) {
    console.error(
      "The file codespin.json was not found in this project. Have you run 'codespin init' at the root of the project?"
    );
    return { success: false };
  }

  const config = await readConfig(args.config || "codespin.json");

  const includedFiles = args.include
    ? Array.isArray(args.include)
      ? args.include
      : [args.include]
    : [];

  const includedFilesContents = await includedFiles.reduce(async (acc, inc) => {
    const fileContents = addLineNumbers(await fs.readFile(inc, "utf-8"));
    (await acc)[inc] = fileContents;
    return acc;
  }, Promise.resolve({}) as Promise<Record<string, string>>);

  const promptFileDir = dirname(args.promptFile);

  const promptSettings = await readPromptSettings(args.promptFile);

  // Prompt file contents without frontMatter.
  const promptFileContents = removeFrontMatter(
    await fs.readFile(args.promptFile, "utf-8")
  );
  const promptFileContentsWithLineNumbers = addLineNumbers(promptFileContents);

  const isPromptFileCommitted = await isCommitted(args.promptFile);

  const promptDiff = isPromptFileCommitted
    ? await (async () => {
        const promptFileContentsFromCommit = removeFrontMatter(
          await getFileFromCommit(args.promptFile)
        );
        return await getDiff(promptFileContents, promptFileContentsFromCommit);
      })()
    : "";

  const templatePath = join("codespin/templates", args.template);

  const evaluatedPrompt = await evaluateTemplate(args.template, {
    prompt: promptFileContentsWithLineNumbers,
    promptDiff,
    includedFiles,
  });

  if (args.debug) {
    console.log("--- PROMPT ---");
    console.log(evaluatedPrompt);
  }

  if (args.writePrompt) {
    await writeToFile(args.writePrompt, evaluatedPrompt);
    return { success: true };
  }

  if (args.api !== "openai") {
    return {
      success: false,
      message: "Invalid API specified. Only 'openai' is supported.",
    };
  }

  const model = args.model || config.model || promptSettings?.model;
  const maxTokens =
    args.maxTokens || config.maxTokens || promptSettings?.maxTokens;

  const completionResult = await openaiCompletion(
    evaluatedPrompt,
    model,
    maxTokens,
    args.debug
  );

  if (completionResult.success) {
    const code = completionResult.files[0].contents;
    if (args.write) {
      const extractResult = await extractFilesToDisk(
        promptFileDir,
        completionResult,
        args.exec
      );
      return {
        success: true,
        message: `Generated ${extractResult
          .filter((x) => x.generated)
          .join(", ")}. Skipped ${extractResult
          .filter((x) => !x.generated)
          .join(", ")}.`,
      };
    } else {
      return { success: true, message: code };
    }
  }
  return {
    success: false,
    message: `${completionResult.error.code}: ${completionResult.error.message}`,
  };
}
