import { readFile } from "fs/promises";
import { pathExists } from "./pathExists.js";
import { getFileFromCommit } from "../git/getFileFromCommit.js";
import { isGitRepo } from "../git/isGitRepo.js";
import { FileContent } from "../prompts/evaluateTemplate.js";
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
      path: filePath,
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
