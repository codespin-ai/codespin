import { glob } from "glob";
import { promisify } from "util";

export async function resolveWildcardPaths(pattern: string): Promise<string[]> {
  return (await glob(pattern, {})) as string[];
}
