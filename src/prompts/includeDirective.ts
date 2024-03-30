import { promises as fs } from "fs";
import path from "path";
import { getWorkingDir } from "../fs/workingDir.js";
import { resolvePath } from "../fs/resolvePath.js";

export async function includeDirective(
  contents: string,
  promptFilePath: string | undefined
): Promise<string> {
  const includePattern = /codespin:include:([^"\s]+)/g;
  let match;

  // Using a while loop to iterate through all matches
  while ((match = includePattern.exec(contents)) !== null) {
    const includedPath = match[1];

    const fullPath = await resolvePath(
      includedPath,
      promptFilePath ? path.dirname(promptFilePath) : getWorkingDir(),
      true
    );

    let includedContent = await fs.readFile(fullPath, "utf-8");

    // Recursively process includes within the included content
    includedContent = await includeDirective(includedContent, fullPath);

    // Replace the matched pattern with the included content
    contents = contents.replace(match[0], includedContent);
  }

  return contents;
}
