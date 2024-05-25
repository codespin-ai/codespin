import { exception } from "../exception.js";

export function validateMaxInputLength(input: string, maxLength: number) {
  if (input.length > maxLength) {
    return exception(
      `The length of input exceeds ${maxLength}. You can specify a longer input with the "--max-input" parameter or by setting maxInput in $HOME/.codespin/codespin.json.`
    );
  }
}
