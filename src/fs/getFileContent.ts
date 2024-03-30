import { readFile } from "fs/promises";
import { pathExists } from "./pathExists.js";
import { getFileFromCommit } from "../git/getFileFromCommit.js";
import { isGitRepo } from "../git/isGitRepo.js";
import { VersionedFileInfo } from "./VersionedFileInfo.js";
import { exception } from "../exception.js";
import { getDiff } from "../git/getDiff.js";
import { VersionedPath } from "./VersionedPath.js";

export async function getVersionedFileInfo({
  version: versionOrDiff,
  path: filePath,
}: VersionedPath): Promise<VersionedFileInfo> {
  const isDiff = versionOrDiff?.includes("+");

  if (await pathExists(filePath)) {
    return versionOrDiff && (await isGitRepo())
      ? isDiff
        ? await (async () => {
            const [version1, version2] = versionOrDiff.split("+");
            const diff =
              version1 === undefined && version2 === undefined
                ? await getDiff(filePath, "HEAD", undefined)
                : version2 === undefined
                ? await getDiff(filePath, version1, undefined)
                : version1 === undefined
                ? exception(`The version cannot be undefined in a diff.`)
                : await getDiff(filePath, version1, version2);

            return {
              path: filePath,
              type: "diff",
              diff,
              version1,
              version2,
            };
          })()
        : {
            path: filePath,
            contents: await getFileFromCommit(filePath, versionOrDiff),
            type: "contents",
            version: versionOrDiff,
          }
      : {
          path: filePath,
          contents: await readFile(filePath, "utf-8"),
          type: "contents",
          version: "current",
        };
  } else {
    exception(`File ${filePath} was not found.`);
  }
}
