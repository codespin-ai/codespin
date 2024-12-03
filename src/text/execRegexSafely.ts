export function execRegexSafely(
  regex: RegExp,
  input: string
): RegExpExecArray | null {
  regex.lastIndex = 0;
  return regex.exec(input);
}
