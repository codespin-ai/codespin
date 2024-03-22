import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { writeToConsole } from "../../writeToConsole.js";
import { CompletionOptions } from "../CompletionOptions.js";
import { CompletionResult } from "../CompletionResult.js";

type OpenAICompletionResponse = {
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

let OPENAI_API_KEY: string | undefined;
let OPENAI_AUTH_TYPE: string | undefined;
let OPENAI_COMPLETIONS_ENDPOINT: string | undefined;
let configLoaded = false; // Track if the config has already been loaded

async function loadConfigIfRequired() {
  if (!configLoaded) {
    // Environment variables have higher priority
    OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    OPENAI_AUTH_TYPE = process.env.OPENAI_AUTH_TYPE;
    OPENAI_COMPLETIONS_ENDPOINT = process.env.OPENAI_COMPLETIONS_ENDPOINT;

    if (!OPENAI_API_KEY) {
      try {
        const configPath = path.join(os.homedir(), ".codespin", "openai.json");
        const configFile = await fs.readFile(configPath, "utf8");
        const config = JSON.parse(configFile);

        OPENAI_API_KEY = OPENAI_API_KEY || config.apiKey;
        OPENAI_AUTH_TYPE = OPENAI_AUTH_TYPE || config.authType;
        OPENAI_COMPLETIONS_ENDPOINT =
          OPENAI_COMPLETIONS_ENDPOINT || config.completionsEndpoint;
      } catch (error: any) {
        console.error("Error reading the configuration file: ", error.message);
      }
    }
    configLoaded = true;
  }
}

export async function completion(
  prompt: string,
  options: CompletionOptions
): Promise<CompletionResult> {
  const model = options.model || "gpt-3.5-turbo";
  const maxTokens = options.maxTokens || 4000 - prompt.length;
  const debug = Boolean(options.debug);

  await loadConfigIfRequired();

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
      const response = await fetch(openaiCompletionsEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: maxTokens,
          temperature: 0,
        }),
      });

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
