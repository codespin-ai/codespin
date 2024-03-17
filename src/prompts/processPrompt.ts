import { includeDirective } from "./includeDirective.js";
import { execDirective } from "./execDirective.js";
import { removeFrontMatter } from "./removeFrontMatter.js";
import { stdinDirective } from "./stdinDirective.js";

export async function processPrompt(
  contents: string,
  filePath: string | undefined,
  baseDir: string | undefined
): Promise<string> {
  return await stdinDirective(
    await execDirective(
      await includeDirective(removeFrontMatter(contents), filePath, baseDir),
      filePath,
      baseDir
    )
  );
}
