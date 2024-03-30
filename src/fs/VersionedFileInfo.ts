export type VersionedFileInfo =
  | {
      path: string;
      type: "contents";
      contents: string;
      version: string;
    }
  | {
      path: string;
      type: "diff";
      diff: string;
      version1: string | undefined;
      version2: string | undefined;
    };
