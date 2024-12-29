import * as libllm from "libllm";
import { getLoggers } from "../console.js";
import { ProviderError } from "../errors.js";

export async function getProviderForModel(
  model: string,
  configDir: string,
  globalConfigDir: string | undefined
) {
  const anthropic = libllm.getAPI(
    "anthropic",
    configDir,
    globalConfigDir,
    getLoggers()
  );

  const openai = libllm.getAPI(
    "openai",
    configDir,
    globalConfigDir,
    getLoggers()
  );

  for (const provider of [anthropic, openai]) {
    if ((await provider.getModels()).find((x) => x.key === model)) {
      return provider;
    }
  }

  throw new ProviderError(`Model ${model} not found in any provider`);
}
