// Import necessary modules and types
import Anthropic from "@anthropic-ai/sdk";
import { writeDebug } from "../../console.js";
import { readConfig } from "../../settings/readConfig.js";
import { CompletionOptions } from "../CompletionOptions.js";
import { CompletionResult } from "../CompletionResult.js";
import { CompletionInputMessage } from "../types.js";

type AnthropicConfig = {
  apiKey: string;
};

let ANTHROPIC_API_KEY: string | undefined;
let configLoaded = false; // Track if the config has already been loaded

// Function to load the configuration from a file or environment variables
async function loadConfigIfRequired(
  customConfigDir: string | undefined,
  workingDir: string
) {
  if (!configLoaded) {
    const anthropicConfig = await readConfig<AnthropicConfig>(
      "anthropic.json",
      customConfigDir,
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
  messages: CompletionInputMessage[],
  customConfigDir: string | undefined,
  options: CompletionOptions,
  workingDir: string
): Promise<CompletionResult> {
  await loadConfigIfRequired(customConfigDir, workingDir);

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
    max_tokens: options.maxTokens ?? 4000,
    messages: messages,
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

  const fullMessage = await stream.finalMessage();

  writeDebug("---ANTHROPIC RESPONSE---");
  writeDebug(responseText);

  return {
    ok: true,
    message: responseText,
    finishReason:
      fullMessage.stop_reason === "max_tokens" ? "MAX_TOKENS" : "STOP",
  };
}
