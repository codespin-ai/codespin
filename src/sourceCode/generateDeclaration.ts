import { promises as fs } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { CompletionOptions } from "../api/CompletionOptions.js";
import { getCompletionAPI } from "../api/getCompletionAPI.js";
import { exception } from "../exception.js";
import { getDeclarationsDirectoryAndAssert } from "../fs/codespinPaths.js";
import { computeHash } from "../fs/computeHash.js";
import { pathExists } from "../fs/pathExists.js";
import { getPathRelativeToGitRoot } from "../git/getPathRelativeToGitRoot.js";
import { evalDeclarationTemplate } from "../prompts/evalDeclarationTemplate.js";
import { extractCode } from "../prompts/extractCode.js";
import { getTemplatePath } from "../templating/getTemplatePath.js";
import { getWorkingDir } from "../fs/workingDir.js";

export async function generateDeclaration(
  filePath: string,
  api: string,
  completionOptions: CompletionOptions
): Promise<string> {
  const filePathRelativeToProjectRoot = await getPathRelativeToGitRoot(
    filePath
  );

  const declarationsPath = path.join(
    await getDeclarationsDirectoryAndAssert(),
    `${filePathRelativeToProjectRoot}.txt`
  );

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

  const templatePath = await getTemplatePath(undefined, "declarations.mjs");

  const evaluatedPrompt = await evalDeclarationTemplate(templatePath, {
    filePath,
    sourceCode,
    workingDir: getWorkingDir(),
  });

  const completion = getCompletionAPI(api);

  const completionResult = await completion(evaluatedPrompt, completionOptions);

  if (completionResult.ok) {
    const files = extractCode(completionResult.message);
    return files[0].contents;
  } else {
    exception(`Unable to generate declarations for ${filePath}`);
  }
}
