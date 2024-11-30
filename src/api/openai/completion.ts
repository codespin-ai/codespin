import OpenAI from "openai";
import { writeDebug } from "../../console.js";
import { readNonEmptyConfig } from "../../settings/readConfig.js";
import { CompletionOptions } from "../CompletionOptions.js";
import { CompletionResult } from "../CompletionResult.js";
import { CompletionInputMessage, CompletionContentPart } from "../types.js";
import { exception } from "../../exception.js";
import { createStreamingFileParser } from "../../responseParsing/streamingFileParser.js";

type OpenAIConfig = {
  apiKey: string;
};

let openaiClient: OpenAI | undefined;
let configLoaded = false;

function convertContentToOpenAIFormat(
  content: string | CompletionContentPart[]
): string | Array<OpenAI.Chat.ChatCompletionContentPart> {
  if (typeof content === "string") {
    return content;
  }

  return content.map((part): OpenAI.Chat.ChatCompletionContentPart => {
    if (part.type === "text") {
      return {
        type: "text",
        text: part.text,
      };
    } else {
      return {
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${part.base64Data}`,
          detail: "auto",
        },
      };
    }
  });
}

function convertMessagesToOpenAIFormat(
  messages: CompletionInputMessage[]
): Array<OpenAI.Chat.ChatCompletionMessageParam> {
  return messages.map((msg) => {
    if (msg.role === "user") {
      return {
        role: "user" as const,
        content: convertContentToOpenAIFormat(msg.content),
      };
    } else {
      return {
        role: "assistant" as const,
        content: msg.content,
      };
    }
  });
}

async function loadConfigIfRequired(
  customConfigDir: string | undefined,
  workingDir: string
) {
  if (!configLoaded) {
    const openaiConfig = await readNonEmptyConfig<OpenAIConfig>(
      "openai.json",
      customConfigDir,
      workingDir
    );
    // Environment variables have higher priority
    const apiKey = process.env.OPENAI_API_KEY ?? openaiConfig.config?.apiKey;
    if (!apiKey) {
      exception(
        "MISSING_OPENAI_API_KEY",
        "OPENAI_API_KEY environment variable is not set."
      );
    }
    openaiClient = new OpenAI({ apiKey });
    configLoaded = true;
  }
}

export async function completion(
  messages: CompletionInputMessage[],
  customConfigDir: string | undefined,
  options: CompletionOptions,
  workingDir: string
): Promise<CompletionResult> {
  await loadConfigIfRequired(customConfigDir, workingDir);

  if (!openaiClient) {
    return {
      ok: false,
      error: {
        code: "client_initialization_error",
        message: "Failed to initialize OpenAI client.",
      },
    };
  }

  writeDebug(`OPENAI: model=${options.model}`);
  const maxTokens = options.maxTokens ?? options.model.maxOutputTokens;
  if (maxTokens) {
    writeDebug(`OPENAI: maxTokens=${maxTokens}`);
  }

  const transformedMessages = convertMessagesToOpenAIFormat(messages);

  const stream = await openaiClient.chat.completions.create({
    model: options.model.name,
    messages: transformedMessages,
    max_tokens: maxTokens,
    stream: true,
  });

  if (options.cancelCallback) {
    options.cancelCallback(() => {
      stream.controller.abort();
    });
  }

  let responseText = "";
  let finishReason: OpenAI.Chat.Completions.ChatCompletionChunk.Choice["finish_reason"] =
    null;

  const streamingFileResponseCallback = options.fileResultStreamCallback
    ? createStreamingFileParser(options.fileResultStreamCallback)
    : undefined;

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    responseText += content;
    if (options.responseStreamCallback) {
      options.responseStreamCallback(content);
    }
    if (streamingFileResponseCallback) {
      streamingFileResponseCallback(content);
    }
    // Check for finish_reason
    finishReason = chunk.choices[0]?.finish_reason;
  }

  writeDebug("---OPENAI RESPONSE---");
  writeDebug(responseText);

  return {
    ok: true,
    message: responseText,
    finishReason: finishReason === "length" ? "MAX_TOKENS" : "STOP",
  };
}
