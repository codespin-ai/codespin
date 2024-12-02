import { readFile } from "fs/promises";

import { ParameterError } from "../errors.js";
import { processPrompt } from "./processPrompt.js";

export async function readPrompt(
  promptFile: string | undefined,
  textPrompt: string | undefined,
  workingDir: string
): Promise<string> {
  if (promptFile) {
    const promptFileContent = await readFile(promptFile, "utf-8");

    const prompt = await processPrompt(
      promptFileContent,
      promptFile,
      workingDir
    );

    return prompt;
  } else if (textPrompt !== undefined) {
    const prompt = await processPrompt(textPrompt, undefined, workingDir);
    return prompt;
  } else {
    throw new ParameterError("The promptFile argument was not supplied.");
  }
}
