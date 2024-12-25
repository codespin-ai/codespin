import fs from "fs/promises";
import path from "path";
import { removeFrontMatter } from "../prompts/removeFrontMatter.js";
import { CodeSpinConfig } from "../settings/CodeSpinConfig.js";
import { getPromptRegex } from "../settings/parsing.js";

export async function evalSpec(
  prompt: string,
  spec: string,
  workingDir: string,
  config: CodeSpinConfig
): Promise<string> {
  const specFilePath = path.resolve(workingDir, spec);
  const specContent = await fs.readFile(specFilePath, "utf-8");
  const specContentWithoutFrontMatter = spec.endsWith(".md")
    ? removeFrontMatter(specContent)
    : specContent;
  const effectivePrompt = specContentWithoutFrontMatter.replace(
    getPromptRegex(config),
    prompt
  );
  return effectivePrompt;
}
