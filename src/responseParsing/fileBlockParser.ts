import { CodespinConfig } from "../settings/CodespinConfig.js";
import { SourceFile } from "../sourceCode/SourceFile.js";

export async function fileBlockParser(
  response: string,
  workingDir: string,
  config: CodespinConfig
): Promise<SourceFile[]> {
  return parseFileContents(response);
}

const filePathRegex =
  /File path:\s*(\.\/[\w./-]+)\s*\n*```(\w*)\n([\s\S]*?)```/g;

const extractMatches = (input: string, regex: RegExp): RegExpExecArray[] => {
  return [...input.matchAll(regex)];
};

const matchToFile = (match: RegExpExecArray): SourceFile => {
  const path = match[1].trim();
  const contents = match[3].trim();

  if (!path || !contents) {
    throw new Error("File path or contents missing in code block.");
  }

  return { path, contents };
};

const parseFileContents = (input: string): SourceFile[] => {
  return extractMatches(input, filePathRegex).map(matchToFile);
};
