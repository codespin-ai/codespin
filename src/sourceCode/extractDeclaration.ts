import { readFile } from "fs/promises";
import { completion as openAICompletion } from "../api/openai/completion.js";
import { GenerateArgs } from "../commands/generate.js";
import { exception } from "../exception.js";
import { evaluateDeclarationsTemplate } from "../prompts/evaluateDeclarationTemplate.js";
import { PromptSettings } from "../prompts/readPromptSettings.js";
import { CodeSpinConfig } from "../settings/CodeSpinConfig.js";
import { getTemplatePath } from "../templating/getTemplatePath.js";

export async function extractDeclaration(
  filePath: string,
  args: GenerateArgs,
  promptSettings: PromptSettings | undefined,
  config: CodeSpinConfig | undefined
): Promise<string> {
  const model = args.model || promptSettings?.model || config?.model;

  const maxTokens =
    args.maxTokens || promptSettings?.maxTokens || config?.maxTokens;

  const sourceCode = await readFile(filePath, "utf-8");

  const templatePath = await getTemplatePath(
    undefined,
    "declarations.mjs",
    "declarations.js"
  );

  const evaluatedPrompt = await evaluateDeclarationsTemplate(templatePath, {
    filePath,
    sourceCode,
  });

  const completionResult = await openAICompletion(
    evaluatedPrompt,
    model,
    maxTokens,
    args.debug
  );

  return completionResult.ok
    ? completionResult.files[0].contents
    : exception(`Unable to generate declarations for ${filePath}`);
}
