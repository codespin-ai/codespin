import { readFile } from "fs/promises";
import path from "path";
import { pathExists } from "../../fs/pathExists.js";
import { GeneratedSourceFile } from "../../sourceCode/GeneratedSourceFile.js";
import { FileContent } from "../../sourceCode/FileContent.js";

export async function getGeneratedFiles(
  files: FileContent[],
  workingDir: string
): Promise<GeneratedSourceFile[]> {
  return await Promise.all(
    files.map(async (file) => {
      const originalPath = path.resolve(workingDir, file.path);
      const originalExists = await pathExists(originalPath);
      return {
        path: file.path,
        original: originalExists
          ? (await readFile(originalPath)).toString()
          : undefined,
        generated: file.content,
      };
    })
  );
}
