import { promises as fs } from "fs";
import path from "path";
import * as url from "url";
import { copyFilesInDir } from "../fs/copyFilesInDir.js";
import { pathExists } from "../fs/pathExists.js";
import { writeToFile } from "../fs/writeToFile.js";
import { writeToConsole } from "../writeToConsole.js";
import { findGitProjectRoot } from "../git/findGitProjectRoot.js";
import { exception } from "../exception.js";

type InitArgs = {
  force?: boolean;
};

const DEFAULT_JSON_CONTENT = {
  api: "openai",
  model: "gpt-3.5-turbo",
};

export async function init(args: InitArgs): Promise<void> {
  const gitDir = await findGitProjectRoot();

  if (!gitDir) {
    exception("codespin init must be used in a project which is under git.");
  }

  const configFile = path.resolve(gitDir, "codespin.json");

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
    await createDirectoriesIfNotExist(path.resolve(gitDir, "codespin"));

    await createDirectoriesIfNotExist(
      path.resolve(gitDir, "codespin/templates")
    );

    // Copy default templates into it.

    const __filename = url.fileURLToPath(import.meta.url);
    const builtInTemplatesDir = path.resolve(__filename, "../../templates");

    // Copy all templates into the codespin directory.
    // Copy only js files.
    await copyFilesInDir(
      builtInTemplatesDir,
      path.resolve(gitDir, "codespin/templates"),
      (filename) =>
        filename.endsWith(".js") ? filename.replace(/\.js$/, ".mjs") : undefined
    );

    // Create codespin/declarations
    await createDirectoriesIfNotExist(
      path.resolve(gitDir, "codespin/declarations")
    );

    // exclude codespin/declarations in .gitignore
    const gitIgnorePath = path.resolve(gitDir, ".gitignore");
    await writeToFile(gitIgnorePath, "codespin/declarations", true);

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
