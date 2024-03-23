import path from "path";
import { exception } from "../exception.js";
import { getProjectRoot } from "./getProjectRoot.js";
import { pathExists } from "./pathExists.js";
import { getCodespinConfigDir } from "../settings/getCodespinConfigDir.js";
import { CODESPIN_DECLARATIONS_DIRNAME, CODESPIN_TEMPLATES_DIRNAME } from "./pathNames.js";

export async function getDeclarationsDir(
  configDirFromArgs: string | undefined
): Promise<string | undefined> {
  const codespinLocalDir = await getCodespinConfigDir(configDirFromArgs, false);

  const projectDir = await getProjectRoot();
  if (!projectDir) {
    return undefined;
  }

  const declarationsDir = path.join(projectDir, CODESPIN_DECLARATIONS_DIRNAME);

  if (await pathExists(declarationsDir)) {
    return declarationsDir;
  }

  return undefined;
}

export async function getDeclarationsDirectoryAndAssert(
  configDirFromArgs: string | undefined
): Promise<string> {
  const declarationsDir = await getDeclarationsDir(configDirFromArgs);
  return (
    declarationsDir ||
    exception(
      `You need to do "codespin init" (or "codespin init --force") from the root of the project.`
    )
  );
}

export async function getTemplatesDir(
  configDirFromArgs: string | undefined
): Promise<string | undefined> {
  const configDir = await getCodespinConfigDir(configDirFromArgs, true);

  if (!configDir) {
    return undefined;
  }

  const templatesDir = path.join(configDir, CODESPIN_TEMPLATES_DIRNAME);

  if (await pathExists(templatesDir)) {
    return templatesDir;
  }

  return undefined;
}
