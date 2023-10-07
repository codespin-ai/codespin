import * as path from "path";

export function constructRelativePath(
  currentDir: string,
  pathToConvert: string,
  baseDir: string
): string {
  // Resolve the path to convert with respect to the current directory
  const absolutePathToConvert = path.resolve(currentDir, pathToConvert);

  // Return the relative path from base directory to the resolved path
  return path.relative(baseDir, absolutePathToConvert);
}
