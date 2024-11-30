import { CompletionContentPart, CompletionInputMessage } from "../api/types.js";
import { exception } from "../exception.js";

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
    return exception(
      "MAX_INPUT_LENGTH_EXCEEDED",
      `The length of input exceeds ${maxLength}. You can specify a longer input with the "--max-input" parameter or by setting maxInput in $HOME/.codespin/codespin.json.`
    );
  }
}

export function validateMaxInputMessagesLength(
  messages: CompletionInputMessage[],
  maxLength: number | undefined
) {
  const fullText = getAllTextContent(messages);
  return validateMaxInputStringLength(fullText, maxLength);
}
