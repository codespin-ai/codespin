import Anthropic from "@anthropic-ai/sdk";
import { writeDebug } from "../../console.js";
import { readNonEmptyConfig } from "../../settings/readConfig.js";
import { CompletionOptions } from "../CompletionOptions.js";
import { CompletionResult } from "../CompletionResult.js";
import { CompletionInputMessage, CompletionContentPart } from "../types.js";
import { createStreamingFileParser } from "../../responseParsing/streamingFileParser.js";

type AnthropicConfig = {
  apiKey: string;
};

let ANTHROPIC_API_KEY: string | undefined;
let configLoaded = false;

async function loadConfigIfRequired(
  customConfigDir: string | undefined,
  workingDir: string
) {
  if (!configLoaded) {
    const anthropicConfig = await readNonEmptyConfig<AnthropicConfig>(
      "anthropic.json",
      customConfigDir,
      workingDir
    );
    ANTHROPIC_API_KEY =
      process.env.ANTHROPIC_API_KEY ?? anthropicConfig.config?.apiKey;
  }
  configLoaded = true;
}

function convertToSDKFormat(
  content: string | CompletionContentPart[]
):
  | string
  | Array<
      Anthropic.Messages.TextBlockParam | Anthropic.Messages.ImageBlockParam
    > {
  if (typeof content === "string") {
    return content;
  }

  return content.map((part) => {
    if (part.type === "text") {
      return {
        type: "text",
        text: part.text,
      };
    }
    return {
      type: "image",
      source: {
        type: "base64",
        media_type: "image/png",
        data: part.base64Data,
      },
    };
  });
}

export async function completion(
  messages: CompletionInputMessage[],
  customConfigDir: string | undefined,
  options: CompletionOptions,
  workingDir: string
): Promise<CompletionResult> {
  await loadConfigIfRequired(customConfigDir, workingDir);

  if (!ANTHROPIC_API_KEY) {
    return {
      ok: false,
      error: {
        code: "missing_api_key",
        message: "ANTHROPIC_API_KEY is not set in the environment variables.",
      },
    };
  }

  writeDebug(`ANTHROPIC: model=${options.model}`);

  if (options.maxTokens) {
    writeDebug(`ANTHROPIC: maxTokens=${options.maxTokens}`);
  }

  const anthropic = new Anthropic({
    apiKey: ANTHROPIC_API_KEY,
  });

  const sdkMessages = messages.map((msg) => ({
    role: msg.role,
    content: convertToSDKFormat(msg.content),
  }));

  let responseText = "";

  const stream = await anthropic.messages.stream({
    model: options.model.name,
    max_tokens: options.maxTokens ?? options.model.maxOutputTokens,
    messages: sdkMessages,
  });

  if (options.cancelCallback) {
    options.cancelCallback(() => {
      stream.abort();
    });
  }

  const streamingFileResponseCallback = options.fileResultStreamCallback
    ? createStreamingFileParser(options.fileResultStreamCallback)
    : undefined;

  stream.on("text", (text) => {
    responseText += text;
    if (options.responseStreamCallback) {
      options.responseStreamCallback(text);
    }
    if (streamingFileResponseCallback) {
      streamingFileResponseCallback(text);
    }
  });

  const fullMessage = await stream.finalMessage();

  writeDebug("---ANTHROPIC RESPONSE---");
  writeDebug(responseText);

  return {
    ok: true,
    message: responseText,
    finishReason:
      fullMessage.stop_reason === "max_tokens" ? "MAX_TOKENS" : "STOP",
  };
}
