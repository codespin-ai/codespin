import path, { join } from "path";
import { exception } from "../exception.js";
import { getProjectRootAndAssert } from "../fs/getProjectRootAndAssert.js";
import { pathExists } from "../fs/pathExists.js";
import {
  CODESPIN_DIRNAME,
  CODESPIN_DECLARATIONS_DIRNAME,
} from "../fs/pathNames.js";

export async function getDeclarationsDir(
  codespinDir: string | undefined,
  workingDir: string
): Promise<string> {
  if (
    codespinDir &&
    (await pathExists(join(codespinDir, CODESPIN_DECLARATIONS_DIRNAME)))
  ) {
    return join(codespinDir, CODESPIN_DECLARATIONS_DIRNAME);
  }

  const projectDir = await getProjectRootAndAssert(workingDir);

  const declarationsDir = path.join(
    projectDir,
    CODESPIN_DIRNAME,
    CODESPIN_DECLARATIONS_DIRNAME
  );

  return (await pathExists(declarationsDir))
    ? declarationsDir
    : exception(
        `${CODESPIN_DIRNAME}/${CODESPIN_DECLARATIONS_DIRNAME} is missing. Have you done "codespin init"?`
      );
}
