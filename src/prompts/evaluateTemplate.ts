import { BasicFileInfo } from "../fs/BasicFileInfo.js";
import { VersionedFileInfo } from "../fs/VersionedFileInfo.js";

export type TemplateArgs = {
  prompt: string;
  promptWithLineNumbers: string;
  previousPrompt: string | undefined;
  previousPromptWithLineNumbers: string | undefined;
  promptDiff: string | undefined;
  include: VersionedFileInfo[];
  declare: BasicFileInfo[];
  sourceFile: VersionedFileInfo | undefined;
  targetFilePath: string | undefined;
  single: boolean | undefined;
  promptSettings: unknown;
  templateArgs: string[] | undefined;
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
