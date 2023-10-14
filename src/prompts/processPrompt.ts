import { removeFrontMatter } from "./removeFrontMatter.js";

export async function processPrompt(contents: string): Promise<string> {
  const withoutFrontMatter = removeFrontMatter(contents);
  const withIncludes = "";
  return "";
}
