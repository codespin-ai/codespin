export type CodespinConfig = {
  version?: string,
  template?: string;
  model?: string;
  maxTokens?: number;
  maxDeclare?: number;
  debug?: boolean;
  models?: {
    [key: string]: string;
  };
  markers?: {
    START_UPDATES?: string;
    END_UPDATES?: string;
    START_FILE_CONTENTS?: string;
    END_FILE_CONTENTS?: string;
    START_REPLACE_LINES?: string;
    END_REPLACE_LINES?: string;
    PROMPT?: string;
  };
};
