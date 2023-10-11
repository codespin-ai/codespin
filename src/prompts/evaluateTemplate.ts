import { promises as fs } from "fs";

export type TemplateArgs = {
  prompt: string;
  promptWithLineNumbers: string;
  previousPrompt: string | undefined;
  previousPromptWithLineNumbers: string | undefined;
  promptDiff: string | undefined;
  files: FileContent[];
  sourceFile: FileContent | undefined;
  multi: boolean | undefined;
};

export type FileContent = {
  name: string;
  contents: string;
  contentsWithLineNumbers: string;
  previousContents: string | undefined;
  previousContentsWithLineNumbers: string | undefined;
  hasDifferences: boolean;
};

export async function evaluateTemplate(
  templatePath: string,
  args: TemplateArgs
): Promise<string> {
  try {
    const template = await import(templatePath);
    const result = await template.default(args);
    return result;
  } catch (error: any) {
    throw new Error(`Failed to evaluate the template: ${error.message}`);
  }
}
