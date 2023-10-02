export function removeFrontMatter(content: string): string {
  const lines = content.split("\n");
  let inFrontMatter = false;
  let dashCount = 0;

  const newContent = lines.filter((line) => {
    if (dashCount === 2) {
      return true;
    }

    if (line === "---") {
      dashCount++;
      inFrontMatter = !inFrontMatter;
      return false;
    }
    return !inFrontMatter;
  });

  return newContent.join("\n");
}
