import { LanguageService } from "./LanguageService.js";
import * as typescriptService from "./typescript.js";

export function getLanguageService(
  file: string
): LanguageService | undefined {
  return ["js", "ts", "jsx", "tsx"].some((ext) => file.endsWith(`.${ext}`))
    ? typescriptService
    : undefined;
}
