import { Dependency } from "../commands/deps.js";

export type LanguageService = {
  getDependencies: (src: string, workingDir: string) => Promise<Dependency[]>;
};
