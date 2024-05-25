import { CodespinConfig } from "../settings/CodespinConfig.js";
import { PlainTemplateArgs } from "./PlainTemplateArgs.js";
import { PlainTemplateResult } from "./PlainTemplateResult.js";

export default async function plainTemplate(
  args: PlainTemplateArgs,
  config: CodespinConfig
): Promise<PlainTemplateResult> {
  return { prompt: args.prompt };
}
