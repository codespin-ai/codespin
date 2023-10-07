import { promises as fs } from "fs";
import TOML from "@iarna/toml";

export type PromptSettings = {
  model?: string;
  maxTokens?: number;
  template?: string;
  include?: string | string[];
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

    // Try to parse as JSON first
    try {
      const frontMatterJSON = JSON.parse(frontMatter);
      return frontMatterJSON as PromptSettings;
    } catch (jsonError) {
      // If JSON parsing fails, try to parse as TOML
      try {
        const frontMatterTOML = TOML.parse(frontMatter);
        return frontMatterTOML as PromptSettings;
      } catch (tomlError) {
        // If TOML parsing also fails, throw an error
        throw new Error(
          `Invalid front-matter format. Neither JSON nor TOML could be parsed.`
        );
      }
    }
  } catch (error) {
    console.error(`Error reading front matter from ${filePath}:`, error);
    throw error;
  }
}
