import { writeFile } from "fs/promises";
import { execCommand } from "../process/execCommand.js";
import { ensureDirectoryExists } from "./ensureDirectoryExists.js";
import { SourceFile } from "../sourceCode/SourceFile.js";
import path from "path";

export async function writeFilesToDisk(
  baseDir: string,
  sourceFiles: SourceFile[],
  exec: string | undefined
): Promise<{ generated: boolean; file: string }[]> {
  const files = await Promise.all(
    sourceFiles.map(async (file) => {
      const generatedFilePath = path.resolve(baseDir, file.path);
      await ensureDirectoryExists(generatedFilePath);
      await writeFile(generatedFilePath, file.contents);

      if (exec) {
        await execCommand(exec, [generatedFilePath]);
      }
      return { generated: true, file: file.path };
    })
  );

  return files;
}
