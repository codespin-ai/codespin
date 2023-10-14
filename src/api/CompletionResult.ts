export type CompletionResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
      };
    };
