import { promises as fs } from "fs";
import Handlebars from "handlebars";

export type TemplateArgs = {
  prompt: string;
  promptWithLineNumbers: string;
  previousPrompt: string;
  previousPromptWithLineNumbers: string;
  promptDiff: string;
  files: FileContent[];
};

export type FileContent = {
  name: string;
  contents: string;
  contentsWithLineNumbers: string;
  previousContents: string;
  previousContentsWithLineNumbers: string;
};

export async function evaluateTemplate(
  templatePath: string,
  args: any
): Promise<string> {
  try {
    // 1. Read the template file
    const templateStr = await fs.readFile(templatePath, "utf-8");

    // 2. Compile the template with Handlebars
    const template = Handlebars.compile(templateStr, { noEscape: true });

    // 3. Evaluate the template with the provided args
    const result = template(args);

    return result;
  } catch (error: any) {
    throw new Error(`Failed to evaluate the template: ${error.message}`);
  }
}
