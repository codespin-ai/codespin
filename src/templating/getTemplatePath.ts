import path from "path";
import * as url from "url";
import { getTemplatesDir } from "../fs/codespinPaths.js";
import { pathExists } from "../fs/pathExists.js";

function get__filename() {
  if (import.meta.url) {
    return url.fileURLToPath(import.meta.url);
  } else {
    return __filename;
  }
}

export async function getTemplatePath(
  template: string | undefined,
  localFallback: string,
  configDirFromArgs: string | undefined
): Promise<string> {
  const projectTemplateDir = await getTemplatesDir(configDirFromArgs);

  const templatePath =
    template && (await pathExists(template))
      ? template
      : projectTemplateDir &&
        (await pathExists(
          path.join(projectTemplateDir, template || localFallback)
        ))
      ? path.join(projectTemplateDir, template || localFallback)
      : await (async () => {
          const __filename = get__filename();
          const builtInTemplatesDir = path.resolve(
            __filename,
            "../../templates"
          );
          const globalFallback = localFallback.replace(/\.mjs$/, ".js");

          const builtInTemplatePath = path.resolve(
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
