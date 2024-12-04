import { CodeSpinContext } from "../../CodeSpinContext.js";
import { setDebugFlag } from "../../debugMode.js";
import { TemplateError } from "../../errors.js";
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
  reloadConfig?: boolean;
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

  const config = await readCodeSpinConfig(args.config, context.workingDir, args.reloadConfig);

  if (config.debug) {
    setDebugFlag();
  }

  const buildPromptArgs: BuildPromptArgs = {
    exclude: args.exclude ?? [],
    include: args.include ?? [],
    prompt: args.prompt,
    promptFile: args.promptFile,
    spec: args.spec,
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
        : exception(new TemplateError(`Unknown tempalte ${args.template}.`)))
    : exception(new TemplateError(`Unknown tempalte ${args.template}.`));

  const result = await buildPrompt(
    buildPromptArgs,
    templateFunc,
    templateArgs,
    config,
    context
  );

  return { prompt: result.templateResult.prompt };
}
