import { CodespinConfig } from "../settings/CodespinConfig.js";
import { TemplateResult } from "../templating/getTemplate.js";

export default async function plain(
  args: { prompt: string },
  config: CodespinConfig
): Promise<TemplateResult> {
  return { prompt: args.prompt };
}
