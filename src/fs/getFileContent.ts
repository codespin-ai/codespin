import { readFile } from "fs/promises";
import { pathExists } from "./pathExists.js";
import { getFileFromCommit } from "../git/getFileFromCommit.js";
import { isGitRepo } from "../git/isGitRepo.js";
import { addLineNumbers } from "../text/addLineNumbers.js";
import { VersionedFileInfo } from "./VersionedFileInfo.js";
import { exception } from "../exception.js";

export async function getVersionedFileInfo(
  filePath: string
): Promise<VersionedFileInfo | undefined> {
  if (await pathExists(filePath)) {
    const contents = await readFile(filePath, "utf-8");
    const previousContents = isGitRepo()
      ? await getFileFromCommit(filePath)
      : undefined;

    return {
      path: filePath,
      contents,
      contentsWithLineNumbers: addLineNumbers(contents),
      previousContents,
      previousContentsWithLineNumbers: previousContents
        ? addLineNumbers(previousContents)
        : undefined,
    };
  } else {
    exception(`File ${filePath} was not found.`);
  }
}
