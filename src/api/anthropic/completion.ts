import * as fs from "fs/promises";
import * as path from "path";
import { writeToConsole } from "../../console.js";
import { pathExists } from "../../fs/pathExists.js";
import { getCodespinConfigDir } from "../../settings/getCodespinConfigDir.js";
import { CompletionOptions } from "../CompletionOptions.js";
import { CompletionResult } from "../CompletionResult.js";

type AnthropicCompletionResponse = {
  error?: {
    code: string;
    message: string;
  };
  choices: {
    message: {
      content: string;
    };
    finish_reason: string;
  }[];
};

let ANTHROPIC_API_KEY: string | undefined;
let configLoaded = false; // Track if the config has already been loaded

async function loadConfigIfRequired(configDirFromArgs: string | undefined) {
  if (!configLoaded) {
    // Environment variables have higher priority
    ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    if (!ANTHROPIC_API_KEY) {
      const codespinConfigDir = await getCodespinConfigDir(
        configDirFromArgs,
        true
      );

      if (codespinConfigDir) {
        const anthropicConfigPath = path.join(codespinConfigDir, "anthropic.json");

        if (await pathExists(anthropicConfigPath)) {
          const anthropicConfigFile = await fs.readFile(anthropicConfigPath, "utf8");
          const anthropicConfig = JSON.parse(anthropicConfigFile);

          ANTHROPIC_API_KEY = ANTHROPIC_API_KEY || anthropicConfig.apiKey;
        }
      }
    }
  }
  configLoaded = true;
}

export async function completion(
  prompt: string,
  configDirFromArgs: string | undefined,
  options: CompletionOptions
): Promise<CompletionResult> {
  const model = options.model || "claude-3-haiku";
  const maxTokens = options.maxTokens;
  const debug = Boolean(options.debug);

  await loadConfigIfRequired(configDirFromArgs);

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
            }

      // Make a POST request to the Anthropic API
      const body: any = {
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
      const data = (await response.json()) as AnthropicCompletionResponse;

      // If the debug parameter is set, stringify and print the response from Anthropic.
      if (debug) {
        writeToConsole("---ANTHROPIC RESPONSE---");
        writeToConsole(JSON.stringify({ data }));
      }

      // Check if the response has an error
      if (data.error) {
        return {
          ok: false,
          error: {
            code: data.error.code,
            message: data.error.message,
          },
        };
      }

      // If the finish reason isn't "stop", return an error
      if (data.choices[0].finish_reason !== "stop") {
        return {
          ok: false,
          error: {
            code: data.choices[0].finish_reason,
            message: data.choices[0].finish_reason,
          },
        };
      }

      const message = data.choices[0].message.content as string;
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