import { promises as fs } from "fs";
import path from "path";
import { pathExists } from "../fs/pathExists.js";
import {
  CODESPIN_CONFIG_FILENAME,
  CODESPIN_DECLARATIONS_DIRNAME,
  CODESPIN_DIRNAME,
  CODESPIN_TEMPLATES_DIRNAME,
} from "../fs/pathNames.js";

import { CodespinContext } from "../CodeSpinContext.js";
import { setDebugFlag } from "../debugMode.js";
import { createDirIfMissing } from "../fs/createDirIfMissing.js";
import { writeToFile } from "../fs/writeToFile.js";
import { getGitRoot } from "../git/getGitRoot.js";
import { homedir } from "os";

export type InitArgs = {
  force?: boolean;
  debug?: boolean;
  global?: boolean;
};

const DEFAULT_JSON_CONTENT = {
  version: "0.1",
  model: "openai:gpt-3.5-turbo",
  models: {
    "gpt-3.5": "openai:gpt-3.5-turbo",
    "gpt-4": "openai:gpt-4",
    "gpt-4-turbo": "openai:gpt-4-turbo",
    "claude-3-haiku": "anthropic:claude-3-haiku-20240307",
    "claude-3-sonnet": "anthropic:claude-3-sonnet-20240229",
    "claude-3-opus": "anthropic:claude-3-opus-20240229",
  },
  markers: {
    START_UPDATES: "START_UPDATES",
    END_UPDATES: "END_UPDATES",
    START_FILE_CONTENTS: "START_FILE_CONTENTS",
    END_FILE_CONTENTS: "END_FILE_CONTENTS",
    START_REPLACE_LINES: "START_REPLACE_LINES",
    END_REPLACE_LINES: "END_REPLACE_LINES",
    PROMPT: "PROMPT",
  },
};

const DEFAULT_OPENAI_CONFIG = {
  apiKey: "your-api-key",
};

const DEFAULT_ANTHROPIC_CONFIG = {
  apiKey: "your-api-key",
};

export async function init(
  args: InitArgs,
  context: CodespinContext
): Promise<void> {
  if (args.debug) {
    setDebugFlag();
  }

  if (args.global) {
    const configDir = path.resolve(homedir(), CODESPIN_DIRNAME);
    const configFile = path.resolve(configDir, CODESPIN_CONFIG_FILENAME);
    const openaiConfigFile = path.resolve(configDir, "openai.json");
    const anthropicConfigFile = path.resolve(configDir, "anthropic.json");

    // Check if .codespin already exists
    if (!args.force && (await pathExists(configDir))) {
      throw new Error(
        `${configDir} already exists. Use the --force option to overwrite.`
      );
    }

    // Create the config dir at root
    await createDirIfMissing(configDir);

    // Write the config file.
    await fs.writeFile(
      configFile,
      JSON.stringify(DEFAULT_JSON_CONTENT, null, 2)
    );

    await fs.writeFile(
      openaiConfigFile,
      JSON.stringify(DEFAULT_OPENAI_CONFIG, null, 2)
    );

    await fs.writeFile(
      anthropicConfigFile,
      JSON.stringify(DEFAULT_ANTHROPIC_CONFIG, null, 2)
    );
  } else {
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

        if (!content.includes(`${CODESPIN_DIRNAME}/`)) {
          await writeToFile(gitIgnorePath, `\n${CODESPIN_DIRNAME}/`, true);
        }
      } else {
        await writeToFile(gitIgnorePath, `${CODESPIN_DIRNAME}/`, true);
      }
    }
  }
}
