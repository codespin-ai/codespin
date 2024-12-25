import { readFile } from "fs/promises";

import { loadImage } from "../prompts/loadImage.js";
import { MessagesArg } from "./types.js";
import { InvalidMessagesFileError } from "../errors.js";
import { CompletionAssistantMessage, CompletionContentPart, CompletionInputMessage, CompletionUserMessage } from "libllm";

export function isMessageFile(obj: any): obj is MessagesArg {
  if (!obj || typeof obj !== "object") return false;
  if (!Array.isArray(obj.messages)) return false;
  return obj.messages.every((msg: any) => {
    if (!msg || typeof msg !== "object") return false;
    if (msg.role !== "user" && msg.role !== "assistant") return false;
    if (typeof msg.content === "string") return true;
    if (Array.isArray(msg.content)) {
      return msg.content.every((part: any) => {
        if (!part || typeof part !== "object") return false;
        if (part.type === "text") return typeof part.text === "string";
        if (part.type === "image") return typeof part.path === "string";
        return false;
      });
    }
    return false;
  });
}

export async function convertMessageFileFormat(
  data: MessagesArg,
  workingDir: string
): Promise<CompletionInputMessage[]> {
  // Convert MessageFile format to CompletionInputMessage[]
  const messages = await Promise.all(
    data.messages.map(async (msg): Promise<CompletionInputMessage> => {
      if (msg.role === "assistant") {
        if (typeof msg.content !== "string") {
          throw new InvalidMessagesFileError(
            "Assistant messages must have string content"
          );
        }
        const assistantMessage: CompletionAssistantMessage = {
          role: "assistant",
          content: msg.content,
        };
        return assistantMessage;
      } else {
        // Handle user messages
        if (typeof msg.content === "string") {
          const userMessage: CompletionUserMessage = {
            role: "user",
            content: msg.content,
          };
          return userMessage;
        }
        // Handle array of content parts
        const completionParts: CompletionContentPart[] = await Promise.all(
          msg.content.map(async (part) => {
            if (part.type === "text") {
              return {
                type: "text",
                text: part.text,
              };
            } else {
              // Load image from file
              const base64Data = await loadImage(part.path, workingDir);
              return {
                type: "image",
                base64Data,
              };
            }
          })
        );
        const userMessage: CompletionUserMessage = {
          role: "user",
          content: completionParts,
        };
        return userMessage;
      }
    })
  );
  return messages;
}

export async function loadMessagesFromFile(
  filePath: string,
  workingDir: string
): Promise<CompletionInputMessage[]> {
  try {
    const content = await readFile(filePath, "utf-8");
    const data = JSON.parse(content);

    if (!isMessageFile(data)) {
      throw new InvalidMessagesFileError(filePath);
    }

    return convertMessageFileFormat(data, workingDir);
  } catch (error) {
    throw new InvalidMessagesFileError(
      `Failed to load or parse messages from ${filePath}: ${error}`
    );
  }
}
