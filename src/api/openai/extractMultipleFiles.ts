export function extractMultipleFiles(
  response: string
): { name: string; contents: string }[] {
  const startingAt = response.indexOf("```");
  const newLineAfterThat = response.indexOf("\n", startingAt);
  const until = response.lastIndexOf("```");
  const jsonToParse = response.substring(newLineAfterThat + 1, until);
  const filesAsJson = JSON.parse(jsonToParse);
  return (filesAsJson as any).files;
}
