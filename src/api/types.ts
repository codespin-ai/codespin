export type CompletionContentPartText = {
  type: "text";
  text: string;
};

export type CompletionContentPartImage = {
  type: "image";
  base64Data: string;
};

export type CompletionContentPart =
  | CompletionContentPartText
  | CompletionContentPartImage;

export type CompletionUserMessage = {
  role: "user";
  content: string | CompletionContentPart[];
};

export type CompletionAssistantMessage = {
  role: "assistant";
  content: string;
};

export type CompletionInputMessage =
  | CompletionUserMessage
  | CompletionAssistantMessage;
