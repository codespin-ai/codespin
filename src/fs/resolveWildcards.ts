import { glob } from "glob";

export async function resolveWildcardPaths(pattern: string): Promise<string[]> {
  return (await glob(pattern, {})) as string[];
}
