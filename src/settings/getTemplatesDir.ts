import { join } from "path";
import { getProjectRoot } from "../fs/getProjectRoot.js";
import { pathExists } from "../fs/pathExists.js";
import {
  CODESPIN_DIRNAME,
  CODESPIN_TEMPLATES_DIRNAME,
} from "../fs/pathNames.js";

export async function getTemplatesDir(
  codespinDir: string | undefined,
  workingDir: string
): Promise<string | undefined> {
  if (
    codespinDir &&
    (await pathExists(join(codespinDir, CODESPIN_TEMPLATES_DIRNAME)))
  ) {
    return join(codespinDir, CODESPIN_TEMPLATES_DIRNAME);
  }
  const projectDir = codespinDir || (await getProjectRoot(workingDir));

  if (projectDir) {
    const templatesDir = join(
      projectDir,
      CODESPIN_DIRNAME,
      CODESPIN_TEMPLATES_DIRNAME
    );

    return (await pathExists(templatesDir)) ? templatesDir : undefined;
  }
}
