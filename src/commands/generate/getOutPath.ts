import path from "path";
import { PromptSettings } from "../../prompts/readPromptSettings.js";

// If the out is mentioned in the CLI it's relative to the working dir.
// If it's mentioned in prompt front-matter, it is relative to the prompt file's directory.
export async function getOutPath(
  outFromCLI: string | undefined,
  promptFilePath: string | undefined,
  promptSettings: PromptSettings | undefined,
  workingDir: string
): Promise<string | undefined> {
  return outFromCLI
    ? path.resolve(workingDir, outFromCLI)
    : promptFilePath && promptSettings && promptSettings.out
    ? (() => {
        const dirOfPromptFile = path.dirname(promptFilePath);
        const outPath = path.resolve(dirOfPromptFile, promptSettings.out);
        return outPath;
      })()
    : undefined;
}
