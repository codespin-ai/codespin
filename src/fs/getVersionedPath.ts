import * as path from "path";
import { getProjectRootAndAssert } from "./getProjectRootAndAssert.js";
import { VersionedPath } from "./VersionedPath.js";

export async function getVersionedPath(
  versionedFilePath: string,
  relativeToDir: string,
  rootIsProjectRoot: boolean,
  workingDir: string
): Promise<VersionedPath> {
  return versionedFilePath.includes(":")
    ? await (async () => {
        const [versionOrDiff, filePath] = versionedFilePath.split(":");
        return {
          version: versionOrDiff,
          path:
            rootIsProjectRoot && filePath.startsWith("/")
              ? path.join(await getProjectRootAndAssert(workingDir), filePath)
              : path.resolve(relativeToDir, filePath),
        };
      })()
    : rootIsProjectRoot && versionedFilePath.startsWith("/")
    ? {
        version: undefined,
        path: path.join(await getProjectRootAndAssert(workingDir), versionedFilePath),
      }
    : {
        version: undefined,
        path: path.resolve(relativeToDir, versionedFilePath),
      };
}
