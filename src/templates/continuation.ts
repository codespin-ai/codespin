import { CodespinConfig } from "../settings/CodespinConfig.js";
import { TemplateResult } from "../templating/getTemplate.js";
import { trimWhitespace } from "../templating/trimWhitespace.js";
import { ContinuationTemplateArgs } from "./ContinuationTemplateArgs.js";

export default async function continuation(
  args: ContinuationTemplateArgs,
  config: CodespinConfig
): Promise<TemplateResult> {
  return {
    prompt: trimWhitespace(
      `
        The following prompt was used to generate code (enclosed within $START_PROMPT$ and $END_PROMPT$):
        $START_PROMPT$
        ${args.prompt}
        $END_PROMPT$

        However, the output was too long and exceeded the maximum length. As a result, the following incomplete output was produced (shown after the "-----"). 

        Please continue generating the code starting from where it was cut off. That is, start with the next character.
        The idea is to concatenate the new output with the existing incomplete output to form the complete result.

        -----
        ${args.incompleteOutput}
      `
    ),
  };
}
