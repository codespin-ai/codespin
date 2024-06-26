import { promises as fs } from "fs";
import * as yaml from "js-yaml";

export type PromptSettings = {
  out?: string;
  model?: string;
  maxTokens?: number;
  template?: string;
  include?: string[];
  parser?: string;
  multi?: number;
};

export async function readPromptSettings(
  filePath: string
): Promise<PromptSettings | undefined> {
  const fileContent = await fs.readFile(filePath, "utf-8");
  const frontMatterMatch = fileContent.match(/---\n([\s\S]*?)\n---/);

  if (!frontMatterMatch) {
    return undefined;
  }

  const frontMatter = frontMatterMatch[1];

  // Parse as YAML
  const frontMatterYAML = yaml.load(frontMatter);
  if (typeof (frontMatterYAML as any).include === "string") {
    (frontMatterYAML as any).include = [(frontMatterYAML as any).include];
  }
  return frontMatterYAML as PromptSettings;
}
