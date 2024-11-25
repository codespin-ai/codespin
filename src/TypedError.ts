export class TypedError extends Error {
  type: string;

  constructor(type: string, message: string) {
    super(`${type}: ${message}`);
    this.type = type;
  }
}
