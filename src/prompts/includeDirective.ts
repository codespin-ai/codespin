import { promises as fs } from "fs";
import path from "path";

import { resolvePathInProject } from "../fs/resolvePath.js";

export async function includeDirective(
  content: string,
  promptFilePath: string | undefined,
  workingDir: string
): Promise<string> {
  const includePattern = /codespin:include:([^"\s]+)/g;
  let match;

  // Using a while loop to iterate through all matches
  while ((match = includePattern.exec(content)) !== null) {
    const includedPath = match[1];

    const fullPath = await resolvePathInProject(
      includedPath,
      promptFilePath ? path.dirname(promptFilePath) : workingDir,
      workingDir
    );

    let includedContent = await fs.readFile(fullPath, "utf-8");

    // Recursively process includes within the included content
    includedContent = await includeDirective(
      includedContent,
      fullPath,
      workingDir
    );

    // Replace the matched pattern with the included content
    content = content.replace(match[0], includedContent);
  }

  return content;
}
