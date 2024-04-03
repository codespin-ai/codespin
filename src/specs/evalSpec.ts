import fs from "fs/promises";
import path from "path";
import { removeFrontMatter } from "../prompts/removeFrontMatter.js";

export async function evalSpec(
  prompt: string,
  spec: string,
  workingDir: string
): Promise<string> {
  const specFilePath = path.join(workingDir, spec);
  const specContent = await fs.readFile(specFilePath, "utf-8");
  const specContentWithoutFrontMatter = spec.endsWith(".md")
    ? removeFrontMatter(specContent)
    : specContent;
  const effectivePrompt = specContentWithoutFrontMatter.replace(
    /{prompt}/g,
    prompt
  );
  return effectivePrompt;
}
