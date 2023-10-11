import { readFile } from "fs/promises";
import { FileContent } from "../prompts/evaluateTemplate.js";
import { isGitRepo } from "../git/isGitRepo.js";
import { getFileFromCommit } from "../git/getFileFromCommit.js";
import { pathExists } from "../fs/pathExists.js";
import { addLineNumbers } from "../text/addLineNumbers.js";

export async function getFileContent(
  filePath: string
): Promise<FileContent | undefined> {
  if (await pathExists(filePath)) {
    const contents = await readFile(filePath, "utf-8");
    const previousContents = isGitRepo()
      ? await getFileFromCommit(filePath)
      : undefined;
    return {
      name: filePath,
      contents,
      contentsWithLineNumbers: addLineNumbers(contents),
      previousContents,
      previousContentsWithLineNumbers: previousContents
        ? addLineNumbers(previousContents)
        : undefined,
      hasDifferences: contents === previousContents,
    };
  } else {
    return undefined;
  }
}
