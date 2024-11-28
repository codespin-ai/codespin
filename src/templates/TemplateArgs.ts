import { VersionedFileInfo } from "../fs/VersionedFileInfo.js";
import { SourceFile } from "../sourceCode/SourceFile.js";

export type TemplateArgs = {
  prompt: string;
  includes: VersionedFileInfo[];
  generatedFiles: SourceFile[];
  outPath: string | undefined;
  promptSettings: unknown;
  customArgs: string[] | undefined;
  workingDir: string;
  debug: boolean | undefined;
  xmlCodeBlockElement?: string
};
