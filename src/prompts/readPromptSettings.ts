import { promises as fs } from "fs";

export type PromptSettings = {
  model?: string;
  maxTokens?: number;
  template?: string;
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

    const frontMatterJSON = JSON.parse(frontMatterMatch[1]);
    return frontMatterJSON as PromptSettings;
  } catch (error) {
    console.error(`Error reading front matter from ${filePath}:`, error);
    throw error;
  }
}
