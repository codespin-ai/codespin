import { BasicFileInfo } from "../fs/BasicFileInfo.js";
import { VersionedFileInfo } from "../fs/VersionedFileInfo.js";

export type TemplateArgs = {
  prompt: string;
  promptWithLineNumbers: string;
  include: VersionedFileInfo[];
  declare: BasicFileInfo[];
  outPath: string | undefined;
  promptSettings: unknown;
  templateArgs: string[] | undefined;
  workingDir: string;
  debug: boolean | undefined;
};
