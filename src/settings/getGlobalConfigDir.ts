import * as path from "path";
import { homedir } from "os";
import { pathExists } from "../fs/pathExists.js";
import { CODESPIN_DIRNAME } from "../fs/pathNames.js";

export async function getGlobalConfigDir(): Promise<string | undefined> {
  const globalConfigDir = path.join(homedir(), CODESPIN_DIRNAME);
  return (await pathExists(globalConfigDir)) ? globalConfigDir : undefined;
}
