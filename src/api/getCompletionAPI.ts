import { exception } from "../exception.js";
import { completion as openaiCompletion } from "./openai/completion.js";
import { completion as anthropicCompletion } from "./anthropic/completion.js";
import { CompletionOptions } from "./CompletionOptions.js";
import { CompletionResult } from "./CompletionResult.js";
import { CompletionInputMessage } from "./types.js";

export type CompletionFunc = (
  messages: CompletionInputMessage[],
  customConfigDir: string | undefined,
  options: CompletionOptions,
  workingDir: string
) => Promise<CompletionResult>;

export function getCompletionAPI(name: string): CompletionFunc {
  if (name === "openai") {
    return openaiCompletion;
  } else if (name === "anthropic") {
    return anthropicCompletion;
  } else {
    exception("Only openai is supported as of now.");
  }
}
