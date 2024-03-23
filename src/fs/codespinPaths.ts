import path from "path";
import { exception } from "../exception.js";
import { pathExists } from "./pathExists.js";
import { getCodespinConfigDir } from "../settings/getCodespinConfigDir.js";
import {
  CODESPIN_DECLARATIONS_DIRNAME,
  CODESPIN_TEMPLATES_DIRNAME,
} from "./pathNames.js";
import { getProjectRootAndAssert } from "./getProjectRootAndAssert.js";

export async function getDeclarationsDir(): Promise<string> {
  const projectDir = await getProjectRootAndAssert();
  const declarationsDir = path.join(projectDir, CODESPIN_DECLARATIONS_DIRNAME);

  return (await pathExists(declarationsDir))
    ? declarationsDir
    : exception(
        `.codespin/declarations is missing. Have you done "codespin init"?`
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
