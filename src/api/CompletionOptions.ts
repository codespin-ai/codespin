import { ModelDescription } from "../settings/CodeSpinConfig.js";

export type CompletionOptions = {
  model: ModelDescription;
  maxTokens: number | undefined;
  cancelCallback?: (cancel: () => void) => void;
  responseStreamCallback?: (data: string) => void;
};
