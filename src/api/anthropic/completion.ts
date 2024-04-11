// Import necessary modules and types
import Anthropic from "@anthropic-ai/sdk";
import { writeDebug } from "../../console.js";
import { readConfig } from "../../settings/readConfig.js";
import { CompletionOptions } from "../CompletionOptions.js";
import { CompletionResult } from "../CompletionResult.js";

type AnthropicConfig = {
  apiKey: string;
};

let ANTHROPIC_API_KEY: string | undefined;
let configLoaded = false; // Track if the config has already been loaded

// Function to load the configuration from a file or environment variables
async function loadConfigIfRequired(
  codespinDir: string | undefined,
  workingDir: string
) {
  if (!configLoaded) {
    const anthropicConfig = await readConfig<AnthropicConfig>(
      "anthropic.json",
      codespinDir,
      workingDir
    );
    // Environment variables have higher priority
    ANTHROPIC_API_KEY =
      process.env.ANTHROPIC_API_KEY ?? anthropicConfig?.apiKey;
  }
  configLoaded = true;
}

// Main completion function using the Anthropic SDK
export async function completion(
  prompt: string,
  codespinDir: string | undefined,
  options: CompletionOptions,
  workingDir: string
): Promise<CompletionResult> {
  await loadConfigIfRequired(codespinDir, workingDir);

  if (!ANTHROPIC_API_KEY) {
    return {
      ok: false,
      error: {
        code: "missing_api_key",
        message: "ANTHROPIC_API_KEY is not set in the environment variables.",
      },
    };
  }

  writeDebug(`ANTHROPIC: model=${options.model}`);
  if (options.maxTokens) {
    writeDebug(`ANTHROPIC: maxTokens=${options.maxTokens}`);
  }

  const anthropic = new Anthropic({
    apiKey: ANTHROPIC_API_KEY,
  });

  let responseText = "";

  const stream = anthropic.messages.stream({
    model: options.model,
    max_tokens: options.maxTokens || 4096,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  if (options.cancelCallback) {
    options.cancelCallback(() => {
      stream.abort();
    });
  }

  stream.on("text", (text) => {
    responseText += text;
    if (options.responseStreamCallback) {
      options.responseStreamCallback(text);
    }
  });

  await stream.finalMessage();

  if (options.responseCallback) {
    options.responseCallback(responseText);
  }

  writeDebug("---ANTHROPIC RESPONSE---");
  writeDebug(responseText);

  return { ok: true, message: responseText };
}
