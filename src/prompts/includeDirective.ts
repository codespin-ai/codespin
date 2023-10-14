import { promises as fs } from "fs";
import { join, dirname } from "path";

export async function includeDirective(
  contents: string,
  filePath: string | undefined,
  baseDir: string = ""
): Promise<string> {
  const includePattern = /codespin:include:([^"\s]+)/g;
  let match;

  // Using a while loop to iterate through all matches
  while ((match = includePattern.exec(contents)) !== null) {
    const includePath = match[1];

    let fullPath;
    if (includePath.startsWith("/")) {
      fullPath = join(baseDir || process.cwd(), includePath);
    } else {
      fullPath = filePath ? join(dirname(filePath), includePath) : includePath;
    }

    let includedContent;
    try {
      includedContent = await fs.readFile(fullPath, "utf-8");
    } catch (err: any) {
      throw new Error(
        `Failed to include file from path: ${fullPath}. Error: ${err.message}`
      );
    }

    // Recursively process includes within the included content
    includedContent = await includeDirective(
      includedContent,
      fullPath,
      baseDir
    );

    // Replace the matched pattern with the included content
    contents = contents.replace(match[0], includedContent);
  }

  return contents;
}
