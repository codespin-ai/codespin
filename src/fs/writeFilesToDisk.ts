import { writeFile } from "fs/promises";
import { ensureDirExists } from "./ensureDirExists.js";
import { SourceFile } from "../sourceCode/SourceFile.js";
import path from "path";
import { getWorkingDir } from "./workingDir.js";
import { execString } from "../process/execString.js";

export async function writeFilesToDisk(
  outDir: string,
  sourceFiles: SourceFile[],
  exec: string | undefined
): Promise<{ generated: boolean; file: string }[]> {
  const files = await Promise.all(
    sourceFiles.map(async (file) => {
      const generatedFilePath = path.resolve(outDir, file.path);
      await ensureDirExists(generatedFilePath);
      await writeFile(generatedFilePath, file.contents);

      if (exec) {
        await execString(`exec ${generatedFilePath}`, getWorkingDir());
      }
      return { generated: true, file: file.path };
    })
  );

  return files;
}
