import { tmpdir } from "os";
import { generateRandomString } from "../text/getRandomString.js";
import { writeFile } from "fs/promises";
import path from "path";

export async function createTempFile(content: string): Promise<string> {
  const tempPath = path.resolve(
    tmpdir(),
    `${Date.now()}-${generateRandomString()}.tmp`
  );
  await writeFile(tempPath, content, "utf8");
  return tempPath;
}
