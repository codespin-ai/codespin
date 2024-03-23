import path from "path";
import { exception } from "../exception.js";
import { assertProjectRoot } from "./assertProjectRoot.js";

export async function getPathRelativeToProjectRoot(
  filePath: string
): Promise<string> {
  const projectRoot = await assertProjectRoot();
  return path.relative(projectRoot, path.resolve(filePath));
}
