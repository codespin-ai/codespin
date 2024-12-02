export function exception<T extends Error>(error: T): never {
  throw error;
}
