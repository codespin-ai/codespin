export type CompletionResult =
  | {
      ok: true;
      message: string;
      finishReason: "STOP" | "MAX_TOKENS";
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
      };
    };
