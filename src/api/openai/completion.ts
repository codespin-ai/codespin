import OpenAI from "openai";
import { writeToConsole } from "../../console.js";
import { readConfig } from "../../settings/readConfig.js";
import { CompletionOptions } from "../CompletionOptions.js";
import { CompletionResult } from "../CompletionResult.js";

type OpenAIConfig = {
  apiKey: string;
};

let openaiClient: OpenAI | undefined;

let configLoaded = false;

async function loadConfigIfRequired(
  codespinDir: string | undefined,
  workingDir: string
) {
  if (!configLoaded) {
    const openaiConfig = await readConfig<OpenAIConfig>(
      "openai.json",
      codespinDir,
      workingDir
    );

    // Environment variables have higher priority
    const apiKey = process.env.OPENAI_API_KEY ?? openaiConfig?.apiKey;

    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set in the environment variables."
      );
    }

    openaiClient = new OpenAI({ apiKey });
    configLoaded = true;
  }
}

export async function completion(
  prompt: string,
  codespinDir: string | undefined,
  options: CompletionOptions,
  workingDir: string
): Promise<CompletionResult> {
  await loadConfigIfRequired(codespinDir, workingDir);

  if (!openaiClient) {
    return {
      ok: false,
      error: {
        code: "client_initialization_error",
        message: "Failed to initialize OpenAI client.",
      },
    };
  }

  const model = options.model || "gpt-3.5-turbo";
  const debug = Boolean(options.debug);

  if (debug) {
    writeToConsole(`OPENAI: model=${model}`);
    if (options.maxTokens) {
      writeToConsole(`OPENAI: maxTokens=${options.maxTokens}`);
    }
  }

  try {
    const stream = await openaiClient.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: options.maxTokens,
      stream: true,
    });

    let responseText = "";

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      responseText += content;
      if (options.responseStreamCallback) {
        options.responseStreamCallback(content);
      }
    }

    if (options.responseCallback) {
      options.responseCallback(responseText);
    }

    if (debug) {
      writeToConsole("---OPENAI RESPONSE---");
      writeToConsole(responseText);
    }

    return { ok: true, message: responseText };
  } catch (error: any) {
    return {
      ok: false,
      error: {
        code: "api_error",
        message:
          error.message ||
          "An error occurred while communicating with the OpenAI API.",
      },
    };
  }
}
