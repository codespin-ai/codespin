import { readFile } from "fs/promises";
import { exception } from "../exception.js";
import { addLineNumbers } from "../text/addLineNumbers.js";
import { processPrompt } from "./processPrompt.js";

export async function readPrompt(
  promptFile: string | undefined,
  textPrompt: string | undefined,
  baseDir: string | undefined
): Promise<{
  prompt: string;
  promptWithLineNumbers: string;
}> {
  if (promptFile) {
    const promptFileContents = await readFile(promptFile, "utf-8");

    const prompt = await processPrompt(promptFileContents, promptFile, baseDir);
    const promptWithLineNumbers = addLineNumbers(prompt);

    return {
      prompt,
      promptWithLineNumbers,
    };
  } else if (textPrompt) {
    const prompt = await processPrompt(textPrompt, undefined, baseDir);
    const promptWithLineNumbers = addLineNumbers(prompt);
    return {
      prompt,
      promptWithLineNumbers,
    };
  } else {
    exception(
      "The prompt file must be specified, or otherwise specify a prompt inline with '-p'. See 'codespin generate help'."
    );
  }
}
