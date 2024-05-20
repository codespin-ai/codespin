import { VersionedFileInfo } from "../../fs/VersionedFileInfo.js";
import { readPrompt } from "../../prompts/readPrompt.js";
import { PromptSettings } from "../../prompts/readPromptSettings.js";
import { CodespinConfig } from "../../settings/CodespinConfig.js";
import { evalSpec } from "../../specs/evalSpec.js";
import { TemplateArgs } from "../../templates/TemplateArgs.js";
import { TemplateResult, getTemplate } from "../../templating/getTemplate.js";
import { addLineNumbers } from "../../text/addLineNumbers.js";
import { getOutPath } from "./getOutPath.js";

export type EvaluatePromptArgs = {
  out: string | undefined;
  promptFilePath: string | undefined;
  prompt: string | undefined;
  template: string;
  customConfigDir: string | undefined;
  workingDir: string;
  spec: string | undefined;
  config: CodespinConfig;
  promptSettings: PromptSettings | undefined;
  templateArgs: string[] | undefined;
  includes: VersionedFileInfo[];
  debug: boolean;
};

export async function evaluatePrompt(
  args: EvaluatePromptArgs
): Promise<TemplateResult> {
  const outPath = await getOutPath(
    args.out,
    args.promptFilePath,
    args.promptSettings,
    args.workingDir
  );

  const templateFunc = await getTemplate<TemplateArgs>(
    args.template,
    args.customConfigDir,
    args.workingDir
  );

  const basicPrompt = await readPrompt(
    args.promptFilePath,
    args.prompt,
    args.workingDir
  );

  // If the spec option is specified, evaluate the spec
  const prompt = args.spec
    ? await evalSpec(basicPrompt, args.spec, args.workingDir, args.config)
    : basicPrompt;

  const promptWithLineNumbers = addLineNumbers(prompt);

  const generateCodeTemplateArgs: TemplateArgs = {
    prompt,
    promptWithLineNumbers,
    include: args.includes,
    outPath,
    promptSettings: args.promptSettings,
    templateArgs: args.templateArgs,
    workingDir: args.workingDir,
    debug: args.debug,
  };

  return await templateFunc(generateCodeTemplateArgs, args.config);
}
