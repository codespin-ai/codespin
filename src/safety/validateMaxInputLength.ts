import { CompletionContentPart, CompletionInputMessage } from "libllm";
import { MaxInputLengthError } from "../errors.js";

function getAllTextContent(messages: CompletionInputMessage[]): string {
  return messages
    .map((msg) => {
      if (typeof msg.content === "string") {
        return msg.content;
      }
      return msg.content
        .filter(
          (part): part is Extract<CompletionContentPart, { type: "text" }> =>
            part.type === "text"
        )
        .map((part) => part.text)
        .join("");
    })
    .join("");
}

export function validateMaxInputStringLength(
  input: string,
  maxLength: number | undefined
) {
  if (maxLength && input.length > maxLength) {
    throw new MaxInputLengthError(maxLength);
  }
}

export function validateMaxInputMessagesLength(
  messages: CompletionInputMessage[],
  maxLength: number | undefined
) {
  const fullText = getAllTextContent(messages);
  return validateMaxInputStringLength(fullText, maxLength);
}
