export type CodespinConfig = {
  version?: string;
  template?: string;
  model?: string;
  maxTokens?: number;
  debug?: boolean;
  multi?: number;
  maxInput?: number;
  models?: {
    [key: string]: string;
  };
  markers?: {
    START_UPDATES?: string;
    END_UPDATES?: string;
    START_FILE_CONTENTS?: string;
    END_FILE_CONTENTS?: string;
    DELETE_LINES?: string;
    START_INSERT_LINES?: string;
    END_INSERT_LINES?: string;
    PROMPT?: string;
  };
};
