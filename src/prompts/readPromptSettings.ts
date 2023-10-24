import { promises as fs } from "fs";
import * as yaml from "js-yaml";

export type PromptSettings = {
  model?: string;
  maxTokens?: number;
  maxDeclare?: number;
  template?: string;
  include?: string[];
  declare?: string[];
  parser?: string;
};

export async function readPromptSettings(
  filePath: string
): Promise<PromptSettings | undefined> {
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    const frontMatterMatch = fileContent.match(/---\n([\s\S]*?)\n---/);

    if (!frontMatterMatch) {
      return undefined;
    }

    const frontMatter = frontMatterMatch[1];

    // Parse as YAML
    try {
      const frontMatterYAML = yaml.load(frontMatter);
      if (typeof (frontMatterYAML as any).include === "string") {
        (frontMatterYAML as any).include = [(frontMatterYAML as any).include];
      }
      return frontMatterYAML as PromptSettings;
    } catch (yamlError) {
      // If YAML parsing fails, throw an error
      throw new Error(`Invalid front-matter format. YAML could not be parsed.`);
    }
  } catch (error) {
    console.error(`Error reading front matter from ${filePath}:`, error);
    throw error;
  }
}
