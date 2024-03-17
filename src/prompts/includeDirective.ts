import { promises as fs } from "fs";
import path from "path";
import { resolveProjectFilePath } from "../fs/resolveProjectFilePath.js";
import { getWorkingDir } from "../fs/workingDir.js";

export async function includeDirective(
  contents: string,
  promptFilePath: string | undefined,
  baseDir: string,
  promptFileIsCurrent: boolean
): Promise<string> {
  const includePattern = /codespin:include:([^"\s]+)/g;
  let match;

  // Using a while loop to iterate through all matches
  while ((match = includePattern.exec(contents)) !== null) {
    const includedPath = match[1];

    const fullPath = await resolveProjectFilePath(
      includedPath,
      promptFilePath ? path.dirname(promptFilePath) : getWorkingDir(),
      {
        missingGit:
          "The codespin:include directive referred to path relative to the project root (starting with a '/'). This is supported only in projects under git.",
      }
    );

    let includedContent;
    try {
      includedContent = await fs.readFile(fullPath, "utf-8");
    } catch (err: any) {
      // We throw only if promptFileIsCurrent, because include in old commits may not reflect the new dir structure.
      // When promptFileIsCurrent === true however, we must fail to let the user know that the included file doesn't exist.
      if (promptFileIsCurrent) {
        throw new Error(
          `Failed to include file from path: ${fullPath}. Error: ${err.message}`
        );
      } else {
        includedContent = "";
      }
    }

    // Recursively process includes within the included content
    includedContent = await includeDirective(
      includedContent,
      fullPath,
      baseDir,
      promptFileIsCurrent
    );

    // Replace the matched pattern with the included content
    contents = contents.replace(match[0], includedContent);
  }

  return contents;
}
