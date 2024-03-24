import { promises as fs } from "fs";
import path from "path";
import { writeToConsole } from "../console.js";
import { copyFilesInDir } from "../fs/copyFilesInDir.js";
import { pathExists } from "../fs/pathExists.js";
import {
  CODESPIN_DIRNAME,
  CODESPIN_CONFIG_FILENAME,
  CODESPIN_DECLARATIONS_DIRNAME,
  CODESPIN_TEMPLATES_DIRNAME,
} from "../fs/pathNames.js";
import { getWorkingDir } from "../fs/workingDir.js";
import { writeToFile } from "../fs/writeToFile.js";
import { getGitRoot } from "../git/getGitRoot.js";

type InitArgs = {
  force?: boolean;
};

const DEFAULT_JSON_CONTENT = {
  api: "openai",
  model: "gpt-3.5-turbo",
};

export async function init(args: InitArgs): Promise<void> {
  // If we are under a git directory, we'll make .codespin under the git dir root.
  // Otherwise, we'll make .codespin under the current dir.
  let gitDir = await getGitRoot();
  let rootDir = gitDir ?? getWorkingDir();

  const configDir = path.resolve(rootDir, CODESPIN_DIRNAME);
  const configFile = path.resolve(configDir, CODESPIN_CONFIG_FILENAME);
  const templateDir = path.resolve(configDir, CODESPIN_TEMPLATES_DIRNAME);
  const declarationsDir = path.resolve(
    configDir,
    CODESPIN_DECLARATIONS_DIRNAME
  );

  try {
    // Check if .codespin already exists
    if (!args.force && (await pathExists(configDir))) {
      throw new Error(
        `${configDir} already exists. Use the --force option to overwrite.`
      );
    }

    // Create the config dir at root
    await createDirectoriesIfNotExist(configDir);

    // Create template dir
    await createDirectoriesIfNotExist(templateDir);

    // Create codespin/declarations
    await createDirectoriesIfNotExist(declarationsDir);

    // Write the config file.
    await fs.writeFile(
      configFile,
      JSON.stringify(DEFAULT_JSON_CONTENT, null, 2)
    );

    // if the project is under git, exclude codespin/declarations in .gitignore
    if (gitDir) {
      const gitIgnorePath = path.resolve(gitDir, ".gitignore");

      if (await pathExists(gitIgnorePath)) {
        const content = await fs.readFile(gitIgnorePath, "utf8");

        if (
          !content.includes(
            `${CODESPIN_DIRNAME}/${CODESPIN_DECLARATIONS_DIRNAME}`
          )
        ) {
          await writeToFile(
            gitIgnorePath,
            `\n${CODESPIN_DIRNAME}/`,
            true
          );
        }
      } else {
        await writeToFile(
          gitIgnorePath,
          `${CODESPIN_DIRNAME}/`,
          true
        );
      }
    }

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
