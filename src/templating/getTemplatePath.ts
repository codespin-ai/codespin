import { join, resolve } from "path";
import { pathExists } from "../fs/pathExists.js";
import { fileURLToPath } from "url";

export async function getTemplatePath(
  template: string | undefined,
  localFallback: string
): Promise<string> {
  const globalFallback = localFallback.replace(/\.mjs$/, ".js");
  // If the template is not provided, we'll use the fallbacks
  const templatePath =
    template && (await pathExists(template))
      ? resolve(template)
      : (await pathExists(
          resolve("codespin/templates", template || localFallback)
        ))
      ? resolve("codespin/templates", template || localFallback)
      : await (async () => {
          const __filename = fileURLToPath(import.meta.url);
          const builtInTemplatesDir = join(__filename, "../../templates");
          const builtInTemplatePath = resolve(
            builtInTemplatesDir,
            globalFallback
          );
          return (await pathExists(builtInTemplatePath))
            ? builtInTemplatePath
            : undefined;
        })();

  if (!templatePath) {
    throw new Error(
      `The template ${templatePath} was not found. Have you done 'codespin init'?`
    );
  }

  return templatePath;
}
