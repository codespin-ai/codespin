export type DeclarationsTemplateArgs = {
  filePath: string;
  sourceCode: string;
};

export async function evaluateDeclarationsTemplate(
  templatePath: string,
  args: DeclarationsTemplateArgs
): Promise<string> {
  try {
    const template = await import(templatePath);
    const result = await template.default(args);
    return result;
  } catch (error: any) {
    throw new Error(`Failed to evaluate the template: ${error.message}`);
  }
}
