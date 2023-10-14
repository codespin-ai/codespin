import { exception } from "../exception.js";
import { completion as openaiCompletion } from "./openai/completion.js";

export function getCompletionAPI(name: string) {
  if (name === "openai") {
    return openaiCompletion;
  } else {
    exception("Only openai is supported as of now.");
  }
}
