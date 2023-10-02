import { evaluateTemplate } from "../prompts/evaluateTemplate.js";
import { readFileContents } from "../fs/readFileContents.js";
import { getDiff } from "../git/getDiff.js";
import { completion as openaiCompletion } from "../api/openai/completion.js";
import { readPromptSettings } from "../prompts/readPromptSettings.js";
import { promises as fs } from "fs";
import { CommandResult } from "./CommandResult.js";
import { writeToFile } from "../fs/writeToFile.js";
import { join } from "path";
import { fileExists } from "../fs/fileExists.js";
import * as url from "url";
import { isCommitted } from "../git/isCommitted.js";
import { execCommand } from "../process/execCommand.js";
import { readConfig } from "../settings/readConfig.js";

type GenerateArgs = {
  promptFile: string;
  api?: string;
  model?: string;
  maxTokens?: number;
  write?: boolean;
  writePrompt?: string;
  template?: string;
  debug?: boolean;
  exec?: string;
  config?: string;
};

export async function generate(args: GenerateArgs): Promise<CommandResult> {
  const config = await readConfig(args.config || "codespin.json");

  const codeFile = args.promptFile.replace(".prompt.md", "");
  const codeFileExists = await fs
    .stat(codeFile)
    .then(() => true)
    .catch(() => false);

  if (!args.promptFile.endsWith(".prompt.md")) {
    return {
      success: false,
      message:
        "Invalid prompt file name. Prompt files should end with .prompt.md.",
    };
  }

  const isWrite = codeFileExists && (await isCommitted(args.promptFile));

  const promptSettings = await readPromptSettings(args.promptFile);

  const defaultTemplateDir =
    args.template ||
    promptSettings?.template ||
    config.template ||
    "codespin/templates/default";

  const __filename = url.fileURLToPath(import.meta.url);
  const fallbackTemplateDir = join(__filename, "../../../templates/default");

  let templatePath: string;

  if (isWrite) {
    templatePath = args.write
      ? `${defaultTemplateDir}/regenerate-write.md`
      : `${defaultTemplateDir}/regenerate.md`;

    if (!(await fileExists(templatePath))) {
      templatePath = args.write
        ? `${fallbackTemplateDir}/regenerate-write.md`
        : `${fallbackTemplateDir}/regenerate.md`;
    }
  } else {
    templatePath = args.write
      ? `${defaultTemplateDir}/generate-write.md`
      : `${defaultTemplateDir}/generate.md`;

    if (!(await fileExists(templatePath))) {
      templatePath = args.write
        ? `${fallbackTemplateDir}/generate-write.md`
        : `${fallbackTemplateDir}/generate.md`;
    }
  }

  const codegenPrompt = await readFileContents(args.promptFile, isWrite);

  let templateArgs: any = {
    codeFile,
    codegenPrompt,
  };

  if (isWrite) {
    const promptDiff = await getDiff(args.promptFile);
    if (!promptDiff) {
      return { success: false, message: "Prompt hasn't changed." };
    }
    const codeFileContents = await readFileContents(codeFile, true);
    templateArgs = {
      ...templateArgs,
      codeFileContents,
      promptDiff,
    };
  }

  const evaluatedPrompt = await evaluateTemplate(templatePath, templateArgs);

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
    args.debug,
    false
  );

  if (completionResult.success) {
    const code = completionResult.files[0].contents;
    if (args.write) {
      await fs.writeFile(codeFile, code);
      if (args.exec) {
        await execCommand(args.exec, [codeFile]);
      }
    } else {
      console.log(code);
    }
    return { success: true, message: `Generated ${codeFile}.` };
  }
  return {
    success: false,
    message: `${completionResult.error.code}: ${completionResult.error.message}`,
  };
}
