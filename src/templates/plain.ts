import { CodespinConfig } from "../settings/CodespinConfig.js";

export default async function declarations(
  args: { prompt: string },
  config: CodespinConfig
) {
  return args.prompt;
}
