import * as fs from "fs/promises";
import * as path from "path";
import { writeToConsole } from "../../console.js";
import { pathExists } from "../../fs/pathExists.js";
import { getCodespinConfigDir } from "../../settings/getCodespinConfigDir.js";
import { CompletionOptions } from "../CompletionOptions.js";
import { CompletionResult } from "../CompletionResult.js";

type CompletionRequest = {
  model: string;
  messages: {
    role: "user" | "system" | "assistant";
    content: string;
  }[];
  temperature: number;
  max_tokens?: number;
};

type OpenAICompletionResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  system_fingerprint: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    logprobs: null; // Assuming logprobs is always null based on provided example. Adjust if it can have other types.
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: {
    code: string;
    message: string;
  };
};

let OPENAI_API_KEY: string | undefined;
let OPENAI_AUTH_TYPE: string | undefined;
let OPENAI_COMPLETIONS_ENDPOINT: string | undefined;
let configLoaded = false; // Track if the config has already been loaded

async function loadConfigIfRequired(configDirFromArgs: string | undefined) {
  if (!configLoaded) {
    // Environment variables have higher priority
    OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    OPENAI_AUTH_TYPE = process.env.OPENAI_AUTH_TYPE;
    OPENAI_COMPLETIONS_ENDPOINT = process.env.OPENAI_COMPLETIONS_ENDPOINT;

    if (!OPENAI_API_KEY) {
      const codespinConfigDir = await getCodespinConfigDir(
        configDirFromArgs,
        true
      );

      if (codespinConfigDir) {
        const openaiConfigPath = path.join(codespinConfigDir, "openai.json");

        if (await pathExists(openaiConfigPath)) {
          const openaiConfigFile = await fs.readFile(openaiConfigPath, "utf8");
          const openaiConfig = JSON.parse(openaiConfigFile);

          OPENAI_API_KEY = OPENAI_API_KEY || openaiConfig.apiKey;
          OPENAI_AUTH_TYPE = OPENAI_AUTH_TYPE || openaiConfig.authType;
          OPENAI_COMPLETIONS_ENDPOINT =
            OPENAI_COMPLETIONS_ENDPOINT || openaiConfig.completionsEndpoint;
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
  const model = options.model || "gpt-3.5-turbo";
  const maxTokens = options.maxTokens;
  const debug = Boolean(options.debug);

  await loadConfigIfRequired(configDirFromArgs);

  if (debug) {
    writeToConsole(`OPENAI: model=${model}`);
    writeToConsole(`OPENAI: maxTokens=${maxTokens}`);
  }

  // Check if the API key is available
  if (!OPENAI_API_KEY) {
    return {
      ok: false,
      error: {
        code: "missing_api_key",
        message: "OPENAI_API_KEY is not set in the environment variables.",
      },
    };
  } else {
    const openaiCompletionsEndpoint =
      OPENAI_COMPLETIONS_ENDPOINT ||
      "https://api.openai.com/v1/chat/completions";

    try {
      const headers: { [key: string]: string } =
        OPENAI_AUTH_TYPE === "API_KEY"
          ? {
              "Content-Type": "application/json",
              "api-key": OPENAI_API_KEY,
            }
          : {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENAI_API_KEY}`,
            };

      // Make a POST request to the OpenAI API
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

      const response = await fetch(openaiCompletionsEndpoint, {
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
      const data = (await response.json()) as OpenAICompletionResponse;

      // If the debug parameter is set, stringify and print the response from OpenAI.
      if (debug) {
        writeToConsole("---OPENAI RESPONSE---");
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
