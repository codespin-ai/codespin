import { promises as fs } from "fs";
import { CodespinContext } from "../CodeSpinContext.js";
import { CompletionOptions } from "../api/CompletionOptions.js";
import { getCompletionAPI } from "../api/getCompletionAPI.js";
import { getTemplate } from "../templating/getTemplate.js";
import { extractFromCodeBlock } from "../prompts/extractFromCodeBlock.js";
import { writeToConsole } from "../console.js";
import { readCodespinConfig } from "../settings/readCodespinConfig.js";
import { getApiAndModel } from "../settings/getApiAndModel.js";
import path from "path";

export type DependenciesArgs = {
  file: string;
  config: string | undefined;
  api: string | undefined;
  model: string | undefined;
  maxTokens: number | undefined;
  debug: boolean | undefined;
};

export type Dependency = {
  dependency: string;
  filePath: string;
  isProjectFile: boolean;
};

export async function deps(
  args: DependenciesArgs,
  context: CodespinContext
): Promise<Dependency[]> {
  const config = await readCodespinConfig(args.config, context.workingDir);

  const [apiFromAlias, modelFromAlias] = args.model
    ? getApiAndModel(args.model, config)
    : [undefined, undefined];

  const api = args.api || apiFromAlias || "openai";

  const model = modelFromAlias || args.model || config?.model;
  const sourceCode = await fs.readFile(
    path.resolve(context.workingDir, args.file),
    "utf-8"
  );

  const templateFunc = await getTemplate(
    undefined,
    "dependencies",
    args.config,
    context.workingDir
  );

  const evaluatedPrompt = await templateFunc({
    filePath: args.file,
    sourceCode,
    workingDir: context.workingDir,
  });

  const completionOptions: CompletionOptions = {
    model,
    maxTokens: args.maxTokens,
    debug: args.debug,
  };

  if (args.debug) {
    writeToConsole("--- PROMPT ---");
    writeToConsole(evaluatedPrompt);
  }

  const completion = getCompletionAPI(api);

  const completionResult = await completion(
    evaluatedPrompt,
    args.config,
    completionOptions,
    context.workingDir
  );

  if (completionResult.ok) {
    return JSON.parse(extractFromCodeBlock(completionResult.message).contents);
  } else {
    throw new Error(
      `${completionResult.error.code}: ${completionResult.error.message}`
    );
  }
}
