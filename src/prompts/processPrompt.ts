import { includeDirective } from "./includeDirective.js";
import { execDirective } from "./execDirective.js";
import { removeFrontMatter } from "./removeFrontMatter.js";
import { stdinDirective } from "./stdinDirective.js";

export async function processPrompt(
  contents: string,
  filePath: string | undefined,
  baseDir: string | undefined,
  promptFileIsCurrent: boolean
): Promise<string> {
  return await stdinDirective(
    await execDirective(
      await includeDirective(
        removeFrontMatter(contents),
        filePath,
        baseDir ?? "",
        promptFileIsCurrent
      ),
      filePath,
      baseDir
    )
  );
}
