import { exception } from "../exception.js";
import { CodespinConfig } from "../settings/CodespinConfig.js";
import { TemplateResult } from "../templating/getTemplate.js";
import { ContinuationTemplateArgs } from "./ContinuationTemplateArgs.js";

export default async function continuation(
  args: ContinuationTemplateArgs,
  config: CodespinConfig
): Promise<TemplateResult> {
  // TODO: Implement
  return exception("TODO: implement");
}
