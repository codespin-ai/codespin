import { extractCode } from "./extractCode.js";

type CompletionResult =
  | {
      success: true;
      files: {
        name: string;
        contents: string;
      }[];
    }
  | {
      success: false;
      error: {
        code: string;
        message: string;
      };
    };

async function completion(
  prompt: string,
  model: string | undefined = "gpt-3.5-turbo",
  maxTokens: number | undefined = prompt.length,
  debug: boolean | undefined = false
): Promise<CompletionResult> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (debug) {
    console.log(`OPENAI: model=${model}`);
    console.log(`OPENAI: maxTokens=${maxTokens}`);
  }

  // Check if the API key is available
  if (!OPENAI_API_KEY) {
    return {
      success: false,
      error: {
        code: "missing_api_key",
        message: "OPENAI_API_KEY is not set in the environment variables.",
      },
    };
  }

  try {
    // Make a POST request to the OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
      console.log("---OPENAI RESPONSE---");
      console.log(JSON.stringify({ data }));
    }

    // Check if the response has an error
    if (data.error) {
      return {
        success: false,
        error: {
          code: data.error.code,
          message: data.error.message,
        },
      };
    }

    // If the finish reason isn't "stop", return an error
    if (data.choices[0].finish_reason !== "stop") {
      return {
        success: false,
        error: {
          code: data.choices[0].finish_reason,
          message: data.choices[0].finish_reason,
        },
      };
    }

    const codeCompletion = data.choices[0].message.content;
    return { success: true, files: extractCode(codeCompletion) };
  } catch (error: any) {
    // If an error occurs during the fetch, return an error
    return {
      success: false,
      error: {
        code: "fetch_error",
        message:
          error.message || "An error occurred while fetching the completion.",
      },
    };
  }
}

export { completion };
