export type CompletionResult =
  | {
      ok: true;
      files: {
        path: string;
        contents: string;
      }[];
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
      };
    };
