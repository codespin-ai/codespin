import OpenAI, {
  AuthenticationError as OpenAIAuthenticationError,
} from "openai";
import { writeDebug } from "../../console.js";
import {
  ClientInitializationError,
  InvalidCredentialsError,
  MissingOpenAIEnvVarError,
} from "../../errors.js";
import { createStreamingFileParser } from "../../responseParsing/streamingFileParser.js";
import { readNonEmptyConfig } from "../../settings/readConfig.js";
import { CompletionOptions } from "../CompletionOptions.js";
import { CompletionResult } from "../CompletionResult.js";
import { CompletionContentPart, CompletionInputMessage } from "../types.js";

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

async function loadConfigAndCache(
  customConfigDir: string | undefined,
  workingDir: string,
  forceReload: boolean = false
) {
  if (forceReload || !configLoaded) {
    const openaiConfig = await readNonEmptyConfig<OpenAIConfig>(
      "openai.json",
      customConfigDir,
      workingDir
    );
    // Environment variables have higher priority
    const apiKey = process.env.OPENAI_API_KEY ?? openaiConfig.config?.apiKey;
    if (!apiKey) {
      throw new MissingOpenAIEnvVarError();
    }
    openaiClient = new OpenAI({ apiKey });
    configLoaded = true;
  }
}

export async function reloadConfig(
  customConfigDir: string | undefined,
  workingDir: string
) {
  return await loadConfigAndCache(customConfigDir, workingDir);
}

export async function completion(
  messages: CompletionInputMessage[],
  customConfigDir: string | undefined,
  options: CompletionOptions,
  workingDir: string
): Promise<CompletionResult> {
  await loadConfigAndCache(customConfigDir, workingDir, options.reloadConfig);

  if (!openaiClient) {
    throw new ClientInitializationError("OPENAI");
  }

  writeDebug(`OPENAI: model=${options.model.alias ?? options.model.name}`);
  const maxTokens = options.maxTokens ?? options.model.maxOutputTokens;
  if (maxTokens) {
    writeDebug(`OPENAI: maxTokens=${maxTokens}`);
  }

  const transformedMessages = convertMessagesToOpenAIFormat(messages);

  let responseText = "";
  let finishReason: OpenAI.Chat.Completions.ChatCompletionChunk.Choice["finish_reason"] =
    null;

  try {
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

    const { processChunk, finish } = options.fileResultStreamCallback
      ? createStreamingFileParser(options.fileResultStreamCallback)
      : { processChunk: undefined, finish: undefined };

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      responseText += content;
      if (options.responseStreamCallback) {
        options.responseStreamCallback(content);
      }
      if (processChunk) {
        processChunk(content);
      }
      // Check for finish_reason
      finishReason = chunk.choices[0]?.finish_reason;
    }

    if (finish) {
      finish();
    }
  } catch (ex: any) {
    if (ex instanceof OpenAIAuthenticationError) {
      throw new InvalidCredentialsError("OPENAI");
    } else {
      throw ex;
    }
  }

  writeDebug("---OPENAI RESPONSE---");
  writeDebug(responseText);

  return {
    message: responseText,
    finishReason: finishReason === "length" ? "MAX_TOKENS" : "STOP",
  };
}
