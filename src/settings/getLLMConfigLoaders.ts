import { readNonEmptyConfig } from "./readConfig.js";
import * as libllm from "libllm";

export function getLLMConfigLoaders(
  customConfigDir: string | undefined,
  workingDir: string
) {
  async function getOpenAIConfigLoader() {
    return (
      await readNonEmptyConfig<libllm.OpenAIConfig>(
        "openai.json",
        customConfigDir,
        workingDir
      )
    ).config;
  }

  async function getAnthropicConfigLoader() {
    return (
      await readNonEmptyConfig<libllm.AnthropicConfig>(
        "anthropic.json",
        customConfigDir,
        workingDir
      )
    ).config;
  }

  return {
    openAI: getOpenAIConfigLoader,
    anthropic: getAnthropicConfigLoader,
  };
}
