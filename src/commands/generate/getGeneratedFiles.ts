import path from "path";
import { SourceFile } from "../../sourceCode/SourceFile.js";
import { pathExists } from "../../fs/pathExists.js";
import { readFile } from "fs/promises";
import { CodespinContext } from "../../CodeSpinContext.js";
import { GeneratedSourceFile } from "../../sourceCode/GeneratedSourceFile.js";

export async function getGeneratedFiles(
  files: SourceFile[],
  context: CodespinContext
): Promise<GeneratedSourceFile[]> {
  return await Promise.all(
    files.map(async (file) => {
      const originalPath = path.resolve(context.workingDir, file.path);
      const originalExists = await pathExists(originalPath);
      return {
        path: file.path,
        original: originalExists
          ? (await readFile(originalPath)).toString()
          : undefined,
        generated: file.contents,
      };
    })
  );
}
