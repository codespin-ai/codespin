import { promises as fs } from "fs";
import path from "path";

export async function copyFilesInDir(
  srcDir: string,
  destDir: string
): Promise<void> {
  try {
    // Check if the source and destination directories exist
    if (!(await fs.stat(srcDir).then((stats) => stats.isDirectory()))) {
      throw new Error(
        `Source directory "${srcDir}" doesn't exist or is not a directory.`
      );
    }

    if (!(await fs.stat(destDir).then((stats) => stats.isDirectory()))) {
      throw new Error(
        `Destination directory "${destDir}" doesn't exist or is not a directory.`
      );
    }

    // Read the source directory content
    const files = await fs.readdir(srcDir);

    // Copy each file from the source directory to the destination directory
    await Promise.all(
      files.map(async (file) => {
        const srcFilePath = path.join(srcDir, file);
        const destFilePath = path.join(destDir, file);

        const fileStats = await fs.stat(srcFilePath);

        if (fileStats.isFile()) {
          await fs.copyFile(srcFilePath, destFilePath);
        }
      })
    );
  } catch (err: any) {
    console.error(`Failed to copy files: ${err.message}`);
  }
}
