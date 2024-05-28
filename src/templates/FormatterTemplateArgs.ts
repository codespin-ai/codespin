import { VersionedFileInfo } from "../fs/VersionedFileInfo.js";

export type FormatterTemplateArgs = {
  prompt: string;
  includes: VersionedFileInfo[];
  workingDir: string;
};
