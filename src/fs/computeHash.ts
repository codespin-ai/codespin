import * as crypto from "crypto";
import * as fs from "fs/promises";

export async function computeHash(filePath: string): Promise<string> {
  const hash = crypto.createHash("sha256");
  const data = await fs.readFile(filePath, "utf8");

  hash.update(data);
  return hash.digest("hex");
}
