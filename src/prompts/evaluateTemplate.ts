import { promises as fs } from "fs";

async function evaluateTemplate(
  templatePath: string,
  args: any
): Promise<string> {
  try {
    // 1. Read the template file
    const template = await fs.readFile(templatePath, "utf-8");

    // 2. Replace placeholders with the actual values using regex and reduce
    const result = template
      .match(/\$[a-zA-Z0-9_]+\$/g)
      ?.reduce((acc, placeholder) => {
        const strippedPlaceholder = placeholder.slice(1, -1);
        if (args[strippedPlaceholder]) {
          return acc.replace(placeholder, args[strippedPlaceholder]);
        }
        return acc;
      }, template);

    return result || template;
  } catch (error: any) {
    throw new Error(`Failed to evaluate the template: ${error.message}`);
  }
}

export { evaluateTemplate };
