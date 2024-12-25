import { writeFile } from "fs/promises";
import { ensureDirExists } from "./ensureDirExists.js";
import { FileContent } from "../sourceCode/FileContent.js";
import path from "path";
import { execString } from "../process/execString.js";

export async function writeFilesToDisk(
  outDir: string,
  sourceFiles: FileContent[],
  exec: string | undefined,
  workingDir: string
): Promise<FileContent[]> {
  const files = await Promise.all(
    sourceFiles.map(async (file) => {
      const generatedFilePath = path.resolve(outDir, file.path);
      await ensureDirExists(generatedFilePath);
      await writeFile(generatedFilePath, file.content);

      if (exec) {
        await execString(`${exec} ${generatedFilePath}`, workingDir);
      }
      return file;
    })
  );

  return files;
}
