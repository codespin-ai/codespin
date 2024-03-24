import { writeToConsole } from "../../console.js";
import { readConfig } from "../../settings/readConfig.js";
import { CompletionOptions } from "../CompletionOptions.js";
import { CompletionResult } from "../CompletionResult.js";

type AnthropicConfig = {
  apiKey: string;
  apiVersion: string;
};

type CompletionRequest = {
  model: string;
  messages: {
    role: "user" | "system" | "assistant";
    content: string;
  }[];
  temperature: number;
  max_tokens?: number;
};

type ValidResponse = {
  type: "message";
  content: {
    text: string;
    type: string;
  }[];
  id: string;
  model: string;
  role: string;
  stop_reason: string;
  stop_sequence: null | string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
};
type ErrorResponse = {
  type: "error";
  error: {
    type: string;
    message: string;
  };
};

type CompletionResponse = ValidResponse | ErrorResponse;

let ANTHROPIC_API_KEY: string | undefined;
let ANTHROPIC_API_VERSION: string | undefined;
let configLoaded = false; // Track if the config has already been loaded

async function loadConfigIfRequired(codespinDir: string | undefined) {
  if (!configLoaded) {
    const anthropicConfig = await readConfig<AnthropicConfig>(
      "anthropic.json",
      codespinDir
    );
    // Environment variables have higher priority
    ANTHROPIC_API_KEY =
      process.env.ANTHROPIC_API_KEY ?? anthropicConfig?.apiKey;

    ANTHROPIC_API_VERSION =
      process.env.ANTHROPIC_API_VERSION ?? anthropicConfig?.apiVersion;
  }
  configLoaded = true;
}

export async function completion(
  prompt: string,
  codespinDir: string | undefined,
  options: CompletionOptions
): Promise<CompletionResult> {
  const model = options.model || "claude-3-haiku";
  const maxTokens = options.maxTokens;
  const debug = Boolean(options.debug);

  await loadConfigIfRequired(codespinDir);

  if (debug) {
    writeToConsole(`ANTHROPIC: model=${model}`);
    writeToConsole(`ANTHROPIC: maxTokens=${maxTokens}`);
  }

  // Check if the API key is available
  if (!ANTHROPIC_API_KEY) {
    return {
      ok: false,
      error: {
        code: "missing_api_key",
        message: "ANTHROPIC_API_KEY is not set in the environment variables.",
      },
    };
  } else {
    const anthropicCompletionsEndpoint =
      "https://api.anthropic.com/v1/messages";

    try {
      const headers: { [key: string]: string } = {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version":
          options.apiVersion ?? ANTHROPIC_API_VERSION ?? "2023-06-01",
      };

      const body: CompletionRequest = {
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0,
      };

      if (maxTokens) {
        body.max_tokens = maxTokens;
      }

      const response = await fetch(anthropicCompletionsEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (response.body && options.dataCallback) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          options.dataCallback(chunk);
        }
      }

      // Parse the response as JSON
      const data = (await response.json()) as CompletionResponse;

      // If the debug parameter is set, stringify and print the response from Anthropic.
      if (debug) {
        writeToConsole("---ANTHROPIC RESPONSE---");
        writeToConsole(JSON.stringify({ data }));
      }

      // Check if the response has an error
      if (data.type === "error") {
        return {
          ok: false,
          error: {
            code: data.error.type,
            message: data.error.message,
          },
        };
      }

      // If the stop reason isn't "stop", return an error
      if (data.stop_reason !== "end_turn") {
        return {
          ok: false,
          error: {
            code: `unknown_stop_reason`,
            message: `Unknown stop reason ${data.stop_reason}`,
          },
        };
      }

      const message = data.content[0].text;
      return { ok: true, message };
    } catch (error: any) {
      // If an error occurs during the fetch, return an error
      return {
        ok: false,
        error: {
          code: "fetch_error",
          message:
            error.message || "An error occurred while fetching the completion.",
        },
      };
    }
  }
}
