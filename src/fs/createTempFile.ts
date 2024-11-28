import { tmpdir } from "os";
import { generateRandomString } from "../text/getRandomString.js";
import { writeFile } from "fs/promises";
import path from "path";

export async function createTempFile(contents: string): Promise<string> {
  const tempPath = path.resolve(
    tmpdir(),
    `${Date.now()}-${generateRandomString()}.md`
  );
  await writeFile(tempPath, contents, "utf8");
  return tempPath;
}
