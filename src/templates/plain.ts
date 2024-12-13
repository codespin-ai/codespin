import { CodeSpinConfig } from "../settings/CodeSpinConfig.js";

export type PlainTemplateArgs = {
  prompt: string;
};

export type PlainTemplateResult = {
  prompt: string;
};

export default async function plainTemplate(
  args: PlainTemplateArgs,
  config: CodeSpinConfig
): Promise<PlainTemplateResult> {
  return { prompt: args.prompt };
}
