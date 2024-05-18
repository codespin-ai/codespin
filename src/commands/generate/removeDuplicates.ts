export function removeDuplicates<T>(
  arr: T[],
  getStringToCompare: (x: T) => string
): T[] {
  const uniqueElements = new Map<string, T>();

  arr.forEach((element) => {
    const comparisonString = getStringToCompare(element);
    if (!uniqueElements.has(comparisonString)) {
      uniqueElements.set(comparisonString, element);
    }
  });

  return Array.from(uniqueElements.values());
}
