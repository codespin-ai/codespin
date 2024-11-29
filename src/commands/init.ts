import { promises as fs } from "fs";
import path from "path";
import { pathExists } from "../fs/pathExists.js";
import {
  CODESPIN_CONFIG_FILENAME,
  CODESPIN_DIRNAME,
  CODESPIN_TEMPLATES_DIRNAME,
} from "../fs/pathNames.js";

import { homedir } from "os";
import { CodeSpinContext } from "../CodeSpinContext.js";
import { setDebugFlag } from "../debugMode.js";
import { createDirIfMissing } from "../fs/createDirIfMissing.js";
import { writeToFile } from "../fs/writeToFile.js";
import { getGitRoot } from "../git/getGitRoot.js";
import { CodeSpinConfig } from "../settings/CodeSpinConfig.js";
import { exception } from "../exception.js";
import { writeError } from "../console.js";

export type InitArgs = {
  force?: boolean;
  debug?: boolean;
  global?: boolean;
};

const DEFAULT_JSON_CONTENT: CodeSpinConfig = {
  version: "0.0.3",
  model: "claude-3-5-haiku",
  models: [
    {
      name: "gpt-4o",
      provider: "openai",
      maxOutputTokens: 16384,
    },
    {
      name: "gpt-4o-mini",
      provider: "openai",
      maxOutputTokens: 16384,
    },
    {
      name: "claude-3-5-sonnet-latest",
      alias: "claude-3-5-sonnet",
      provider: "anthropic",
      maxOutputTokens: 8192,
    },
    {
      name: "claude-3-5-haiku-latest",
      alias: "claude-3-5-haiku",
      provider: "anthropic",
      maxOutputTokens: 8192,
    },
  ],
};

const DEFAULT_OPENAI_CONFIG = {
  apiKey: "your-api-key",
};

const DEFAULT_ANTHROPIC_CONFIG = {
  apiKey: "your-api-key",
};

export async function init(
  args: InitArgs,
  context: CodeSpinContext
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
      exception(
        "DIR_ALREADY_EXISTS",
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

    if (!(await pathExists(openaiConfigFile))) {
      await fs.writeFile(
        openaiConfigFile,
        JSON.stringify(DEFAULT_OPENAI_CONFIG, null, 2)
      );
    } else {
      writeError(
        "Existing openai.json found - not overwriting. You may delete this file to overwrite."
      );
    }

    if (!(await pathExists(anthropicConfigFile))) {
      await fs.writeFile(
        anthropicConfigFile,
        JSON.stringify(DEFAULT_ANTHROPIC_CONFIG, null, 2)
      );
    } else {
      writeError(
        "Existing anthropic.json found - not overwriting. You may delete this file to overwrite."
      );
    }
  } else {
    // If we are under a git directory, we'll make .codespin under the git dir root.
    // Otherwise, we'll make .codespin under the current dir.
    let gitDir = await getGitRoot(context.workingDir);
    let rootDir = gitDir ?? context.workingDir;

    const configDir = path.resolve(rootDir, CODESPIN_DIRNAME);

    const configFile = path.resolve(configDir, CODESPIN_CONFIG_FILENAME);
    const templateDir = path.resolve(configDir, CODESPIN_TEMPLATES_DIRNAME);

    // Check if .codespin already exists
    if (!args.force && (await pathExists(configDir))) {
      exception(
        "DIR_ALREADY_EXISTS",
        `${configDir} already exists. Use the --force option to overwrite.`
      );
    }

    // Create the config dir at root
    await createDirIfMissing(configDir);

    // Create template dir
    await createDirIfMissing(templateDir);

    // Write the config file.
    await fs.writeFile(
      configFile,
      JSON.stringify(DEFAULT_JSON_CONTENT, null, 2)
    );

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
