import * as openAI from "./openai/completion.js";
import * as anthropic from "./anthropic/completion.js";
import { CompletionOptions } from "./CompletionOptions.js";
import { CompletionResult } from "./CompletionResult.js";
import { CompletionInputMessage } from "./types.js";
import { InvalidProviderError } from "../errors.js";

export type CompletionFunc = (
  messages: CompletionInputMessage[],
  customConfigDir: string | undefined,
  options: CompletionOptions,
  workingDir: string
) => Promise<CompletionResult>;

export type CompletionAPI = {
  completion: CompletionFunc;
  reloadConfig: (
    customConfigDir: string | undefined,
    workingDir: string
  ) => Promise<void>;
};

export function getCompletionAPI(name: string): CompletionAPI {
  if (name === "openai") {
    return openAI;
  } else if (name === "anthropic") {
    return anthropic;
  } else {
    throw new InvalidProviderError();
  }
}
