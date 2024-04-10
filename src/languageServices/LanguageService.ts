import { Dependency } from "../sourceCode/Dependency.js";

export type LanguageService = {
  getDependencies: (src: string, workingDir: string) => Promise<Dependency[]>;
};
