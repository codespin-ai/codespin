import { extractCode } from "../../prompts/extractCode.js";
import { writeToConsole } from "../../writeToConsole.js";

type CompletionResult =
  | {
      ok: true;
      files: {
        name: string;
        contents: string;
      }[];
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
      };
    };

async function completion(
  prompt: string,
  model: string | undefined = "gpt-3.5-turbo",
  maxTokens: number | undefined = 4000 - prompt.length,
  debug: boolean | undefined = false
): Promise<CompletionResult> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  // This is optional.
  const OPENAI_COMPLETIONS_ENDPOINT = process.env.OPENAI_COMPLETIONS_ENDPOINT;

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
  }

  const openaiCompletionsEndpoint =
    OPENAI_COMPLETIONS_ENDPOINT || "https://api.openai.com/v1/chat/completions";

  try {
    // Make a POST request to the OpenAI API
    const response = await fetch(openaiCompletionsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
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
    const data = await response.json();

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

    const codeCompletion = data.choices[0].message.content as string;
    return { ok: true, files: extractCode(codeCompletion) };
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

export { completion };
