import { TypedError } from "./TypedError.js";

export function exception(type: string, message: string): never {
  throw new TypedError(type, message);
}
