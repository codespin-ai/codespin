import { promises as fs } from "fs";
import path from "path";
import { writeToConsole } from "../console.js";
import { pathExists } from "../fs/pathExists.js";
import {
  CODESPIN_CONFIG_FILENAME,
  CODESPIN_DECLARATIONS_DIRNAME,
  CODESPIN_DIRNAME,
  CODESPIN_TEMPLATES_DIRNAME,
} from "../fs/pathNames.js";

import { writeToFile } from "../fs/writeToFile.js";
import { getGitRoot } from "../git/getGitRoot.js";
import { createDirIfMissing } from "../fs/createDirIfMissing.js";
import { CodespinContext } from "../CodeSpinContext.js";

export type InitArgs = {
  force?: boolean;
};

const DEFAULT_JSON_CONTENT = {
  api: "openai",
  model: "gpt-3.5-turbo",
  models: {
    "gpt-3.5": "openai:gpt-3.5-turbo",
    "gpt-4": "openai:gpt-4",
    "gpt-4-turbo": "openai:gpt-4-turbo-preview",
    "claude-3-haiku": "anthropic:claude-3-haiku-20240307",
    "claude-3-sonnet": "anthropic:claude-3-sonnet-20240229",
    "claude-3-opus": "anthropic:claude-3-opus-20240229",
  },
};

export async function init(
  args: InitArgs,
  context: CodespinContext
): Promise<void> {
  // If we are under a git directory, we'll make .codespin under the git dir root.
  // Otherwise, we'll make .codespin under the current dir.
  let gitDir = await getGitRoot(context.workingDir);
  let rootDir = gitDir ?? context.workingDir;

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
    await createDirIfMissing(configDir);

    // Create template dir
    await createDirIfMissing(templateDir);

    // Create codespin/declarations
    await createDirIfMissing(declarationsDir);

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
            `${CODESPIN_DIRNAME}/`
          )
        ) {
          await writeToFile(gitIgnorePath, `\n${CODESPIN_DIRNAME}/`, true);
        }
      } else {
        await writeToFile(gitIgnorePath, `${CODESPIN_DIRNAME}/`, true);
      }
    }

    writeToConsole("Initialization completed.");
  } catch (err: any) {
    writeToConsole(`Error during initialization: ${err.message}`);
  }
}
