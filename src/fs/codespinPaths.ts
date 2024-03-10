import path from "path";
import { exception } from "../exception.js";
import { findGitProjectRoot } from "../git/findGitProjectRoot.js";

export const CODESPIN_CONFIG = "codespin.json";
export const CODESPIN_DIRNAME = ".codespin";
export const TEMPLATES_DIRNAME = ".codespin/templates";
export const DECLARATIONS_DIRNAME = ".codespin/declarations";

let cachedGitDir: string | undefined = undefined;

async function getGitDir(): Promise<string | undefined> {
  if (!cachedGitDir) {
    cachedGitDir = await findGitProjectRoot();
  }
  return cachedGitDir;
}

export async function getCodespinDirAndAssert(): Promise<string> {
  const gitDir = await getGitDir();

  if (!gitDir) {
    exception(`The project must be under git.`);
  }

  return path.resolve(gitDir, CODESPIN_DIRNAME);
}

export async function getDeclarationsDirectory(): Promise<string | undefined> {
  const gitDir = await getGitDir();
  return gitDir ? path.resolve(gitDir, DECLARATIONS_DIRNAME) : undefined;
}

export async function getDeclarationsDirectoryAndAssert(): Promise<string> {
  const gitDir = await getDeclarationsDirectory();

  if (!gitDir) {
    exception(`Declarations can be used only when the project is under git.`);
  }

  return gitDir;
}

export async function getTemplatesDirectory(): Promise<string | undefined> {
  const gitDir = await getGitDir();
  return gitDir ? path.resolve(gitDir, TEMPLATES_DIRNAME) : undefined;
}
