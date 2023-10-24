export type VersionedFileInfo = {
  path: string;
  contents: string;
  contentsWithLineNumbers: string;
  previousContents: string | undefined;
  previousContentsWithLineNumbers: string | undefined;
  hasDifferences: boolean;
};
