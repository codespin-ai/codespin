import fs from "fs/promises";
import path from "path";
import { removeFrontMatter } from "../prompts/removeFrontMatter.js";
import { getPromptRegex } from "../responseParsing/markers.js";
import { CodespinConfig } from "../settings/CodespinConfig.js";

export async function evalSpec(
  prompt: string,
  spec: string,
  workingDir: string,
  config: CodespinConfig
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
