import { CodeSpinContext } from "../../CodeSpinContext.js";
import { setDebugFlag } from "../../debugMode.js";
import { exception } from "../../exception.js";
import { BuildPromptArgs, buildPrompt } from "../../prompts/buildPrompt.js";
import { readCodeSpinConfig } from "../../settings/readCodeSpinConfig.js";
import { FormatterTemplateArgs } from "../../templates/FormatterTemplateArgs.js";
import filesTemplate from "../../templates/files.js";
import { getCustomTemplate } from "../../templating/getCustomTemplate.js";

export type FormatPromptArgs = {
  promptFile?: string;
  prompt?: string;
  template?: string;
  debug?: boolean;
  config?: string;
  include?: string[];
  exclude?: string[];
  spec?: string;
};

export type FormatPromptResult = {
  prompt: string;
};

export async function formatPrompt(
  args: FormatPromptArgs,
  context: CodeSpinContext
): Promise<FormatPromptResult> {
  if (args.debug) {
    setDebugFlag();
  }

  const config = await readCodeSpinConfig(args.config, context.workingDir);

  if (config.debug) {
    setDebugFlag();
  }

  const buildPromptArgs: BuildPromptArgs = {
    exclude: args.exclude ?? [],
    include: args.include ?? [],
    prompt: args.prompt,
    promptFile: args.promptFile,
    spec: args.spec,
    template: args.template ?? "files",
    customConfigDir: args.config,
  };

  const templateArgs = {
    workingDir: context.workingDir,
  };

  const templateFunc = args.template
    ? (await getCustomTemplate<FormatterTemplateArgs, FormatterTemplateArgs>(
        args.template,
        args.config,
        context.workingDir
      )) ??
      (args.template === "files"
        ? filesTemplate
        : exception(`Unknown template ${args.template}.`))
    : exception(`Unknown template ${args.template}.`);

  const result = await buildPrompt(
    buildPromptArgs,
    config,
    context,
    templateFunc,
    templateArgs
  );

  return result;
}
