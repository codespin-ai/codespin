import { VersionedFileInfo } from "../fs/VersionedFileInfo.js";

export type FilesTemplateArgs = {
  prompt: string;
  includes: VersionedFileInfo[];
  workingDir: string;
};
