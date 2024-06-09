import path from "path";
import { CodeSpinContext } from "../CodeSpinContext.js";
import { getIncludedFiles } from "../commands/generate/getIncludedFiles.js";
import { exception } from "../exception.js";
import { VersionedFileInfo } from "../fs/VersionedFileInfo.js";
import { VersionedPath } from "../fs/VersionedPath.js";
import { getVersionedPath } from "../fs/getVersionedPath.js";
import { CodeSpinConfig } from "../settings/CodeSpinConfig.js";
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

// Utility type to infer the argument type of a function and exclude specific properties
type ExcludeProps<T, K extends keyof any> = Omit<T, K>;

// Utility type to infer the argument type of TFunc and exclude specific properties
type InferTemplateArgs<TFunc> = TFunc extends (
  args: infer T,
  config: CodeSpinConfig,
  context: CodeSpinContext
) => Promise<FormatterTemplateResult>
  ? ExcludeProps<T, "prompt" | "includes">
  : never;

export async function buildPrompt<
  TFunc extends (
    args: any,
    config: CodeSpinConfig,
    context: CodeSpinContext
  ) => Promise<FormatterTemplateResult>
>(
  args: BuildPromptArgs,
  config: CodeSpinConfig,
  context: CodeSpinContext,
  templateFunc: TFunc,
  templateArgs: InferTemplateArgs<TFunc>
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

  const fullTemplateArgs = {
    ...templateArgs,
    prompt,
    includes,
  };

  const templateResult = await templateFunc(fullTemplateArgs, config, context);

  return {
    prompt: templateResult.prompt,
    includes,
  };
}
