export type MessageFileContentPart =
  | { type: "text"; text: string }
  | { type: "image"; path: string };

export type MessageFileMessage = {
  role: "user" | "assistant";
  content: string | MessageFileContentPart[];
};

export type MessageFile = {
  messages: MessageFileMessage[];
};
