import { BasicFileInfo } from "../fs/BasicFileInfo.js";
import { VersionedFileInfo } from "../fs/VersionedFileInfo.js";

export type TemplateArgs = {
  prompt: string;
  promptWithLineNumbers: string;
  version: "current" | "HEAD";
  include: VersionedFileInfo[];
  declare: BasicFileInfo[];
  sourceFile: VersionedFileInfo | undefined;
  targetFilePath: string | undefined;
  promptSettings: unknown;
  templateArgs: string[] | undefined;
  workingDir: string;
};

