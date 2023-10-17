export type TemplateArgs = {
  prompt: string;
  promptWithLineNumbers: string;
  previousPrompt: string | undefined;
  previousPromptWithLineNumbers: string | undefined;
  promptDiff: string | undefined;
  files: FileContent[];
  declarations: {
    path: string;
    declarations: string;
  }[];
  sourceFile: FileContent | undefined;
  targetFilePath: string | undefined;
  multi: boolean | undefined;
  promptSettings: unknown;
  templateArgs: string[] | undefined;
};

export type FileContent = {
  path: string;
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
