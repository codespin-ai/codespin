import { promises as fs } from "fs";
import path from "path";
import { pathExists } from "../fs/pathExists.js";
import {
  CODESPIN_CONFIG_FILENAME,
  CODESPIN_DIRNAME,
  CODESPIN_TEMPLATES_DIRNAME,
} from "../fs/pathNames.js";

import { homedir } from "os";
import { CodeSpinContext } from "../types.js";
import { setDebugFlag } from "../debugMode.js";
import { createDirIfMissing } from "../fs/createDirIfMissing.js";
import { writeToFile } from "../fs/writeToFile.js";
import { getGitRoot } from "../git/getGitRoot.js";
import { CodeSpinConfig } from "../settings/CodeSpinConfig.js";

import { DirectoryExistsError } from "../errors.js";

import { getProviders } from "libllm";

export type InitArgs = {
  force?: boolean;
  debug?: boolean;
  global?: boolean;
};

const DEFAULT_JSON_CONTENT: CodeSpinConfig = {
  version: "0.0.3",
  model: "claude-3-5-haiku",
  liteModel: "claude-3-5-haiku",
};

export async function init(
  args: InitArgs,
  context: CodeSpinContext
): Promise<void> {
  if (args.debug) {
    setDebugFlag();
  }

  const globalConfigDir = path.resolve(homedir(), CODESPIN_DIRNAME);

  if (args.global) {
    const configFile = path.resolve(globalConfigDir, CODESPIN_CONFIG_FILENAME);

    // Check if .codespin already exists
    if (!args.force && (await pathExists(globalConfigDir))) {
      throw new DirectoryExistsError(globalConfigDir);
    }

    // Create the config dir at root
    await createDirIfMissing(globalConfigDir);

    // Write the config file.
    await fs.writeFile(
      configFile,
      JSON.stringify(DEFAULT_JSON_CONTENT, null, 2)
    );

    const providers = getProviders();

    for (const provider of providers) {
      const api = provider.getAPI(globalConfigDir);
      await api.init({ storeKeysGlobally: true });
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
      throw new DirectoryExistsError(configDir);
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

    const providers = getProviders();

    for (const provider of providers) {
      const api = provider.getAPI(configDir, globalConfigDir);
      await api.init({ storeKeysGlobally: true });
    }

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
