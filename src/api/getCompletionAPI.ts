import { exception } from "../exception.js";
import { completion as openaiCompletion } from "./openai/completion.js";
import { CompletionOptions } from "./CompletionOptions.js";
import { CompletionResult } from "./CompletionResult.js";

export type CompletionFunc = (
  prompt: string,
  configDirFromArgs: string | undefined,
  options: CompletionOptions
) => Promise<CompletionResult>;

export function getCompletionAPI(name: string): CompletionFunc {
  if (name === "openai") {
    return openaiCompletion;
  } else {
    exception("Only openai is supported as of now.");
  }
}
