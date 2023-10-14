import { readFile } from "fs/promises";
import { CompletionOptions } from "../api/CompletionOptions.js";
import { exception } from "../exception.js";
import { evaluateDeclarationsTemplate } from "../prompts/evaluateDeclarationTemplate.js";
import { getTemplatePath } from "../templating/getTemplatePath.js";
import { promises as fs } from "fs";
import path from "path";
import { computeHash } from "../fs/computeHash.js";
import { pathExists } from "../fs/pathExists.js";
import { getCompletionAPI } from "../api/getCompletionAPI.js";

export async function generateDeclaration(
  filePath: string,
  api: string,
  completionOptions: CompletionOptions
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
  const latestDeclarations = await callCompletion(
    filePath,
    api,
    completionOptions
  );

  // 7. Write the hash and the latest declarations to the declarations file
  const newHash = await computeHash(filePath);
  const newContent = `${newHash}\n\n${latestDeclarations}`;
  await fs.mkdir(path.dirname(declarationsPath), { recursive: true }); // Ensure the directory exists
  await fs.writeFile(declarationsPath, newContent, "utf-8");

  // 8. Return the latest declarations
  return latestDeclarations;
}

async function callCompletion(
  filePath: string,
  api: string,
  completionOptions: CompletionOptions
): Promise<string> {
  const sourceCode = await readFile(filePath, "utf-8");

  const templatePath = await getTemplatePath(
    undefined,
    "declarations.mjs",
    "declarations.js"
  );

  const evaluatedPrompt = await evaluateDeclarationsTemplate(templatePath, {
    filePath,
    sourceCode,
  });

  const completion = getCompletionAPI(api);

  const completionResult = await completion(evaluatedPrompt, completionOptions);

  return completionResult.ok
    ? completionResult.files[0].contents
    : exception(`Unable to generate declarations for ${filePath}`);
}
