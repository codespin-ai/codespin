export type ModelDescription = {
  name: string;
  alias?: string;
  provider: string;
  maxOutputTokens: number;
};

export type CodeSpinConfig = {
  version?: string;
  template?: string;
  model?: string;
  maxTokens?: number;
  debug?: boolean;
  multi?: number;
  maxInput?: number;
  models?: ModelDescription[];
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
