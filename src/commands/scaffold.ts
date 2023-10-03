import { evaluateTemplate } from "../prompts/evaluateTemplate.js";
import { completion as openaiCompletion } from "../api/openai/completion.js";
import { readPromptSettings } from "../prompts/readPromptSettings.js";
import { promises as fs } from "fs";
import { CommandResult } from "./CommandResult.js";
import { writeToFile } from "../fs/writeToFile.js";
import { dirname, join } from "path";
import { fileExists } from "../fs/fileExists.js";
import * as url from "url";
import { ensureDirectoryExists } from "../fs/ensureDirectoryExists.js";
import { execCommand } from "../process/execCommand.js";
import { readConfig } from "../settings/readConfig.js";
import { removeFrontMatter } from "../prompts/removeFrontMatter.js";

type ScaffoldArgs = {
  scaffoldPromptFile: string;
  api?: string;
  model?: string;
  maxTokens?: number;
  write?: boolean;
  writePrompt?: string;
  template?: string;
  debug?: boolean;
  fileList?: string;
  exec?: string;
  config?: string;
};

export async function scaffold(args: ScaffoldArgs): Promise<CommandResult> {
  const config = await readConfig(args.config || "codespin.json");

  const scaffoldPromptFileDir = dirname(args.scaffoldPromptFile);
  if (args.fileList) {
    const fileListJsonToParse = await fs.readFile(args.fileList, "utf-8");
    const fileList = JSON.parse(fileListJsonToParse);
    await extractFilesToDisk(scaffoldPromptFileDir, fileList, args.exec);
    return { success: true };
  } else {
    if (!args.scaffoldPromptFile.endsWith(".prompt.md")) {
      return {
        success: false,
        message:
          "Invalid prompt file name. Prompt files should end with .prompt.md.",
      };
    }

    const promptSettings = await readPromptSettings(args.scaffoldPromptFile);

    const templateDir = join(
      "codespin/templates/",
      args.template ||
        promptSettings?.template ||
        config.template ||
        "codespin/templates/default"
    );

    const __filename = url.fileURLToPath(import.meta.url);
    const fallbackTemplateDir = join(__filename, "../../../templates/default");

    let templatePath = join(templateDir, "scaffold.md");

    if (!(await fileExists(templatePath))) {
      templatePath = join(fallbackTemplateDir, "scaffold.md");
    }

    const codegenPrompt = removeFrontMatter(
      await fs.readFile(args.scaffoldPromptFile, "utf-8")
    );

    let templateArgs: any = {
      codegenPrompt,
    };

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
      args.debug
    );

    if (completionResult.success) {
      if (args.write) {
        await extractFilesToDisk(
          scaffoldPromptFileDir,
          completionResult,
          args.exec
        );
      } else {
        for (const file of completionResult.files) {
          console.log(file.name);
          console.log(file.contents);
        }
      }

      return {
        success: true,
        message: `Generated ${completionResult.files.length} files.`,
      };
    }
    return {
      success: false,
      message: `${completionResult.error.code}: ${completionResult.error.message}`,
    };
  }
}

async function extractFilesToDisk(
  scaffoldPromptFileDir: string,
  data: {
    files: { name: string; contents: string }[];
  },
  exec: string | undefined
) {
  for (const file of data.files) {
    const generatedFilePath = join(scaffoldPromptFileDir, file.name);
    if (!(await fileExists(generatedFilePath))) {
      await ensureDirectoryExists(generatedFilePath);
      await fs.writeFile(generatedFilePath, file.contents);

      if (exec) {
        await execCommand(exec, [generatedFilePath]);
      }
    } else {
      console.log(`Skipped ${file.name} since it exists.`);
    }
  }
}
