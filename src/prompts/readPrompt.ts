import { readFile } from "fs/promises";
import { exception } from "../exception.js";
import { processPrompt } from "./processPrompt.js";

export async function readPrompt(
  promptFile: string | undefined,
  textPrompt: string | undefined,
  workingDir: string
): Promise<string> {
  if (promptFile) {
    const promptFileContents = await readFile(promptFile, "utf-8");

    const prompt = await processPrompt(
      promptFileContents,
      promptFile,
      workingDir
    );

    return prompt;
  } else if (textPrompt !== undefined) {
    const prompt = await processPrompt(textPrompt, undefined, workingDir);
    return prompt;
  } else {
    exception(
      "The prompt file must be specified, or otherwise specify a prompt inline with '-p'. See 'codespin generate help'."
    );
  }
}
