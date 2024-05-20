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
        The following prompt (enclosed within "=========") was used to generate code:
        =========
        ${args.prompt}
        =========

        However, the output was too long and got cut off abruptly. And an incomplete output was produced. 
        The incomplete output is enclosed below between =========.
        =========
        ${args.incompleteOutput}
        =========
        ^^^^ Incomplete content.

        You should resume generating the code starting from where it was cut off.
        The idea is to concatenate the content you will now generate with the previous incomplete output.
        Taken together, it should follow the rules set in the original prompt - be precise.

        Meaning, you must complete the code blocks with no other commentary.
      `
    ),
  };
}
