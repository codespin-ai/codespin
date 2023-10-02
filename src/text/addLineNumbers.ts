export function addLineNumbers(fileContent: string): string {
  return fileContent
    .split("\n")
    .map((line, index) => `${index + 1}: ${line}`)
    .join("\n");
}
