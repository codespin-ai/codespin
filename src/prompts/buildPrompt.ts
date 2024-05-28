import path from "path";
import { CodespinContext } from "../CodeSpinContext.js";
import { getIncludedFiles } from "../commands/generate/getIncludedFiles.js";
import { exception } from "../exception.js";
import { VersionedFileInfo } from "../fs/VersionedFileInfo.js";
import { VersionedPath } from "../fs/VersionedPath.js";
import { getVersionedPath } from "../fs/getVersionedPath.js";
import { CodespinConfig } from "../settings/CodespinConfig.js";
import { evalSpec } from "../specs/evalSpec.js";
import { FormatterTemplateArgs } from "../templates/FormatterTemplateArgs.js";
import { FormatterTemplateResult } from "../templates/FormatterTemplateResult.js";
import filesTemplate from "../templates/files.js";
import { getCustomTemplate } from "../templating/getCustomTemplate.js";
import { readPrompt } from "./readPrompt.js";
import { readPromptSettings } from "./readPromptSettings.js";

export type BuildPromptArgs = {
  prompt: string | undefined;
  promptFile: string | undefined;
  template: string;
  include: string[];
  exclude: string[];
  spec: string | undefined;
  customConfigDir: string | undefined;
};

export type BuildPromptResult = {
  prompt: string;
  includes: VersionedFileInfo[];
};

export async function buildPrompt(
  args: BuildPromptArgs,
  config: CodespinConfig,
  context: CodespinContext
): Promise<BuildPromptResult> {
  // Convert everything to absolute paths
  const promptFilePath = args.promptFile
    ? await path.resolve(context.workingDir, args.promptFile)
    : undefined;

  const promptSettings = promptFilePath
    ? await readPromptSettings(promptFilePath)
    : undefined;

  const includesFromCLI: VersionedPath[] = await Promise.all(
    (args.include || []).map((x) =>
      getVersionedPath(x, context.workingDir, false, context.workingDir)
    )
  );

  const excludesFromCLI = await Promise.all(
    (args.exclude || []).map((x) => path.resolve(context.workingDir, x))
  );

  const includes = await getIncludedFiles(
    includesFromCLI,
    excludesFromCLI,
    promptFilePath,
    promptSettings,
    context.workingDir
  );

  const basicPrompt = await readPrompt(
    promptFilePath,
    args.prompt,
    context.workingDir
  );

  const prompt = args.spec
    ? await evalSpec(basicPrompt, args.spec, context.workingDir, config)
    : basicPrompt;

  const templateArgs: FormatterTemplateArgs = {
    prompt,
    includes,
    workingDir: context.workingDir,
  };

  const templateFunc =
    (await getCustomTemplate<FormatterTemplateArgs, FormatterTemplateResult>(
      args.template,
      args.customConfigDir,
      context.workingDir
    )) ??
    (args.template === "files"
      ? filesTemplate
      : exception(`Unknown template ${args.template}.`));

  const templateResult = await templateFunc(templateArgs, config, context);

  return {
    prompt: templateResult.prompt,
    includes,
  };
}
