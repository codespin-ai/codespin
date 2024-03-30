// Import necessary modules and types
import Anthropic from "@anthropic-ai/sdk";
import { writeToConsole } from "../../console.js";
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

  const anthropic = new Anthropic({
    apiKey: ANTHROPIC_API_KEY,
  });

  try {
    let responseText = "";

    const stream = anthropic.messages.stream({
      model: options.model || "claude-3-haiku",
      max_tokens: options.maxTokens || 1024,
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

    if (options.debug) {
      writeToConsole("---ANTHROPIC RESPONSE---");
      writeToConsole(responseText);
    }

    return { ok: true, message: responseText };
  } catch (error: any) {
    return {
      ok: false,
      error: {
        code: "sdk_error",
        message:
          error.message ||
          "An error occurred during the Anthropic SDK operation.",
      },
    };
  }
}
