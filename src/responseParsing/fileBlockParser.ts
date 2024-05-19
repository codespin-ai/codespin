import { CodespinConfig } from "../settings/CodespinConfig.js";
import { SourceFile } from "../sourceCode/SourceFile.js";

export async function fileBlockParser(
  response: string,
  workingDir: string,
  config: CodespinConfig
): Promise<SourceFile[]> {
  return parseFileContents(response);
}

const filePathRegex = /File path:\s*(\.\/[\w./-]+)\s*\n*```\n([\s\S]*?)\n```/g;

const extractMatches = (input: string, regex: RegExp): RegExpExecArray[] => {
  return [...input.matchAll(regex)];
};

const matchToFile = (match: RegExpExecArray): SourceFile => {
  const path = match[1]?.trim();
  const contents = match[2]?.trim();

  if (!path || !contents) {
    throw new Error("File path or contents missing in code block.");
  }

  return { path, contents };
};

const parseFileContents = (input: string): SourceFile[] => {
  const matches = extractMatches(input, filePathRegex);

  if (input.trim() === "") {
    return [];
  }

  return matches.map(matchToFile);
};
