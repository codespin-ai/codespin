import path from "path";
import { exception } from "../exception.js";
import { findGitProjectRoot } from "../git/findGitProjectRoot.js";

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

  return path.resolve(gitDir, "codespin");
}

export async function getDeclarationsDirectory(): Promise<string | undefined> {
  const gitDir = await getGitDir();
  return gitDir ? path.resolve(gitDir, "codespin/declarations") : undefined;
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
  return gitDir ? path.resolve(gitDir, "codespin/templates") : undefined;
}
