import Anthropic, {
  AuthenticationError as AnthropicAuthenticationError,
} from "@anthropic-ai/sdk";
import { writeDebug } from "../../console.js";
import { readNonEmptyConfig } from "../../settings/readConfig.js";
import { CompletionOptions } from "../CompletionOptions.js";
import { CompletionResult } from "../CompletionResult.js";
import { CompletionInputMessage, CompletionContentPart } from "../types.js";
import { createStreamingFileParser } from "../../responseParsing/streamingFileParser.js";
import {
  InvalidCredentialsError,
  MissingAnthropicEnvVarError,
} from "../../errors.js";

type AnthropicConfig = {
  apiKey: string;
};

let ANTHROPIC_API_KEY: string | undefined;
let configLoaded = false;

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

async function loadConfigAndCache(
  customConfigDir: string | undefined,
  workingDir: string,
  forceReload: boolean = false
) {
  if (forceReload || !configLoaded) {
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

  if (!ANTHROPIC_API_KEY) {
    throw new MissingAnthropicEnvVarError();
  }

  writeDebug(`ANTHROPIC: model=${options.model.alias ?? options.model.name}`);

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
  let fullMessage: Anthropic.Messages.Message;

  try {
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

    const { processChunk, finish } = options.fileResultStreamCallback
      ? createStreamingFileParser(options.fileResultStreamCallback)
      : { processChunk: undefined, finish: undefined };

    stream.on("text", (text) => {
      responseText += text;
      if (options.responseStreamCallback) {
        options.responseStreamCallback(text);
      }
      if (processChunk) {
        processChunk(text);
      }
    });

    fullMessage = await stream.finalMessage();

    if (finish) {
      finish();
    }
  } catch (ex: any) {
    if (ex instanceof AnthropicAuthenticationError) {
      throw new InvalidCredentialsError("ANTHROPIC");
    } else {
      throw ex;
    }
  }

  writeDebug("---ANTHROPIC RESPONSE---");
  writeDebug(responseText);

  return {
    message: responseText,
    finishReason:
      fullMessage.stop_reason === "max_tokens" ? "MAX_TOKENS" : "STOP",
  };
}
