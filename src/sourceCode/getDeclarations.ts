import { promises as fs } from "fs";
import path from "path";
import { pathExists } from "../fs/pathExists.js";
import { computeHash } from "../fs/computeHash.js";
import { extractDeclaration } from "./extractDeclaration.js";
import { GenerateArgs } from "../commands/generate.js";
import { PromptSettings } from "../prompts/readPromptSettings.js";
import { CodeSpinConfig } from "../settings/CodeSpinConfig.js";

export async function getDeclarations(
  filePath: string,
  args: GenerateArgs,
  promptSettings: PromptSettings | undefined,
  config: CodeSpinConfig | undefined
): Promise<string> {
  const declarationsPath =
    path.join("codespin", "signatures", filePath) + ".txt";

  // 1. Check if the declarations file exists
  const exists = await pathExists(declarationsPath);

  if (exists) {
    // 2. Read the first line of the file
    const content = await fs.readFile(declarationsPath, "utf-8");
    const [storedHash, , ...declarationsLines] = content.split("\n");

    // 3. Compute the hash for the original file
    const currentHash = await computeHash(filePath);

    // 4. Check if the hashes match
    if (storedHash === currentHash) {
      return declarationsLines.join("\n"); // Return all lines except the hash
    }

    // 5. If the hash is different, delete the declarations file
    await fs.unlink(declarationsPath);
  }

  // 6. Get the latest declarations
  const latestDeclarations = await extractDeclaration(
    filePath,
    args,
    promptSettings,
    config
  );

  // 7. Write the hash and the latest declarations to the declarations file
  const newHash = await computeHash(filePath);
  const newContent = `${newHash}\n\n${latestDeclarations}`;
  await fs.mkdir(path.dirname(declarationsPath), { recursive: true }); // Ensure the directory exists
  await fs.writeFile(declarationsPath, newContent, "utf-8");

  // 8. Return the latest declarations
  return latestDeclarations;
}
