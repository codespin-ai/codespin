export type CompletionContentPartText = {
  type: "text";
  text: string;
};

export type CompletionContentPartImage = {
  type: "image_url"; // Changed from 'image' to match OpenAI's type
  imageUrl: {
    url: string; // base64 data
  };
};

export type CompletionContentPart =
  | CompletionContentPartText
  | CompletionContentPartImage;

// Separate types for user and assistant messages to match OpenAI's structure
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
