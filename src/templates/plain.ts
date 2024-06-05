import { CodeSpinConfig } from "../settings/CodeSpinConfig.js";
import { PlainTemplateArgs } from "./PlainTemplateArgs.js";
import { PlainTemplateResult } from "./PlainTemplateResult.js";

export default async function plainTemplate(
  args: PlainTemplateArgs,
  config: CodeSpinConfig
): Promise<PlainTemplateResult> {
  return { prompt: args.prompt };
}
