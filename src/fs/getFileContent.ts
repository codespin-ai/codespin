import { readFile } from "fs/promises";
import { pathExists } from "./pathExists.js";
import { getFileFromCommit } from "../git/getFileFromCommit.js";
import { isGitRepo } from "../git/isGitRepo.js";
import { VersionedFileInfo } from "./VersionedFileInfo.js";

import { getDiff } from "../git/getDiff.js";
import { VersionedPath } from "./VersionedPath.js";
import { FileNotFoundError, UndefinedDiffVersionError } from "../errors.js";
import { exception } from "../exception.js";

export async function getVersionedFileInfo(
  { version: versionOrDiff, path: filePath }: VersionedPath,
  workingDir: string
): Promise<VersionedFileInfo> {
  const isDiff = versionOrDiff?.includes("+");

  if (await pathExists(filePath)) {
    return versionOrDiff && (await isGitRepo(workingDir))
      ? isDiff
        ? await (async () => {
            const [version1, version2] = versionOrDiff.split("+");
            const diff =
              version1 === undefined && version2 === undefined
                ? await getDiff(filePath, "HEAD", undefined, workingDir)
                : version2 === undefined
                ? await getDiff(filePath, version1, undefined, workingDir)
                : version1 === undefined
                ? exception(new UndefinedDiffVersionError())
                : await getDiff(filePath, version1, version2, workingDir);

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
            content: await getFileFromCommit(
              filePath,
              versionOrDiff,
              workingDir
            ),
            type: "content",
            version: versionOrDiff,
          }
      : {
          path: filePath,
          content: await readFile(filePath, "utf-8"),
          type: "content",
          version: "current",
        };
  } else {
    throw new FileNotFoundError(filePath);
  }
}
