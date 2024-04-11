import { join } from "path";
import { getProjectRoot } from "../fs/getProjectRoot.js";
import { pathExists } from "../fs/pathExists.js";
import {
  CODESPIN_DIRNAME,
  CODESPIN_TEMPLATES_DIRNAME,
} from "../fs/pathNames.js";

export async function getTemplatesDir(
  customConfigDir: string | undefined,
  workingDir: string
): Promise<string | undefined> {
  if (
    customConfigDir &&
    (await pathExists(join(customConfigDir, CODESPIN_TEMPLATES_DIRNAME)))
  ) {
    return join(customConfigDir, CODESPIN_TEMPLATES_DIRNAME);
  }
  const projectDir = customConfigDir || (await getProjectRoot(workingDir));

  if (projectDir) {
    const templatesDir = join(
      projectDir,
      CODESPIN_DIRNAME,
      CODESPIN_TEMPLATES_DIRNAME
    );

    return (await pathExists(templatesDir)) ? templatesDir : undefined;
  }
}
