import { writeFile } from "fs/promises";
import { join } from "path";
import { execCommand } from "../process/execCommand.js";
import { ensureDirectoryExists } from "./ensureDirectoryExists.js";

export async function extractFilesToDisk(
  baseDir: string,
  data: {
    files: { name: string; contents: string }[];
  },
  exec: string | undefined
): Promise<{ generated: boolean; file: string }[]> {
  const files = await Promise.all(
    data.files.map(async (file) => {
      const generatedFilePath = join(baseDir, file.name);
      await ensureDirectoryExists(generatedFilePath);
      await writeFile(generatedFilePath, file.contents);

      if (exec) {
        await execCommand(exec, [generatedFilePath]);
      }
      return { generated: true, file: file.name };
    })
  );

  return files;
}
