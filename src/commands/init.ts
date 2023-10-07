import { CommandResult } from "./CommandResult.js";
import { promises as fs } from "fs";
import path from "path";
import { resolve } from "path";
import * as url from "url";
import { join } from "path";

type InitArgs = {
  force?: boolean;
};

const DEFAULT_JSON_CONTENT = {
  templates: "codespin/templates",
  api: "openai",
  model: "gpt-3.5-turbo",
};

async function init(args: InitArgs): Promise<CommandResult> {
  const currentDir = process.cwd();
  const configFile = resolve(currentDir, "codespin.json");

  try {
    // Check if codespin.json already exists
    if (await fileExists(configFile)) {
      if (!args.force) {
        return {
          success: false,
          message:
            "codespin.json already exists. Use the --force option to overwrite.",
        };
      }
    }
    await fs.writeFile(
      configFile,
      JSON.stringify(DEFAULT_JSON_CONTENT, null, 2)
    );

    // Create codespin directories.
    await createDirectoriesIfNotExist(resolve(currentDir, "codespin"));
    await createDirectoriesIfNotExist(
      resolve(currentDir, "codespin/templates")
    );

    // Copy default templates into it.

    const __filename = url.fileURLToPath(import.meta.url);
    const builtInTemplatesDir = join(__filename, "../../../templates");

    // Copy all templates into the codespin directory.
    await copyFiles(
      builtInTemplatesDir,
      resolve(currentDir, "codespin/templates")
    );

    return { success: true, message: "Initialization completed." };
  } catch (err: any) {
    return {
      success: false,
      message: `Error during initialization: ${err.message}`,
    };
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path, fs.constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch (error: any) {
    if (error.code === "ENOENT") {
      // File or directory does not exist
      return false;
    }
    throw error; // Rethrow other errors
  }
}

async function createDirectoriesIfNotExist(
  ...dirPaths: string[]
): Promise<void> {
  for (const dirPath of dirPaths) {
    const exists = await directoryExists(dirPath);
    if (!exists) {
      await fs.mkdir(dirPath, { recursive: true }); // Using recursive to ensure all nested directories are created
    }
  }
}

async function copyFiles(srcDir: string, destDir: string): Promise<void> {
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

export { init };
