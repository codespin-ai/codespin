export function extractSingleFile(response: string): string {
  const startingAt = response.indexOf("```");
  const newLineAfterThat = response.indexOf("\n", startingAt);
  const until = response.lastIndexOf("```");
  return response.substring(newLineAfterThat + 1, until);
}
