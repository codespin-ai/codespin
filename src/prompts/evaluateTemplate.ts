import { promises as fs } from "fs";
import Handlebars from "handlebars";

export async function evaluateTemplate(
  templatePath: string,
  args: any
): Promise<string> {
  try {
    // 1. Read the template file
    const templateStr = await fs.readFile(templatePath, "utf-8");

    // 2. Compile the template with Handlebars
    const template = Handlebars.compile(templateStr);

    // 3. Evaluate the template with the provided args
    const result = template(args);

    return result;
  } catch (error: any) {
    throw new Error(`Failed to evaluate the template: ${error.message}`);
  }
}
