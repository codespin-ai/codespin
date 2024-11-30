export type MessageContentArg =
  | { type: "text"; text: string }
  | { type: "image"; path: string };

export type MessageArg = {
  role: "user" | "assistant";
  content: string | MessageContentArg[];
};

export type MessagesArg = {
  messages: MessageArg[];
};
