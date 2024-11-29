export type VersionedFileInfo =
  | {
      path: string;
      type: "content";
      content: string;
      version: string;
    }
  | {
      path: string;
      type: "diff";
      diff: string;
      version1: string | undefined;
      version2: string | undefined;
    };
