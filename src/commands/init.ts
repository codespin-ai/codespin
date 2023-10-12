import { promises as fs } from "fs";
import { join, resolve } from "path";
import * as url from "url";
import { copyFilesInDir } from "../fs/copyFilesInDir.js";
import { pathExists } from "../fs/pathExists.js";
import { writeToConsole } from "../writeToConsole.js";

type InitArgs = {
  force?: boolean;
};

const DEFAULT_JSON_CONTENT = {
  api: "openai",
  model: "gpt-3.5-turbo",
};

export async function init(args: InitArgs): Promise<void> {
  const currentDir = process.cwd();
  const configFile = resolve(currentDir, "codespin.json");

  try {
    // Check if codespin.json already exists
    if (!args.force && (await pathExists(configFile))) {
      throw new Error(
        "codespin.json already exists. Use the --force option to overwrite."
      );
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
    const builtInTemplatesDir = join(__filename, "../../templates");

    // Copy all templates into the codespin directory.
    // Copy only js files.
    await copyFilesInDir(
      builtInTemplatesDir,
      resolve(currentDir, "codespin/templates"),
      (filename) =>
        filename.endsWith(".js") ? filename.replace(/\.js$/, ".mjs") : undefined
    );

    writeToConsole("Initialization completed.");
  } catch (err: any) {
    writeToConsole(`Error during initialization: ${err.message}`);
  }
}

async function createDirectoriesIfNotExist(
  ...dirPaths: string[]
): Promise<void> {
  for (const dirPath of dirPaths) {
    const exists = await pathExists(dirPath);
    if (!exists) {
      await fs.mkdir(dirPath, { recursive: true }); // Using recursive to ensure all nested directories are created
    }
  }
}
