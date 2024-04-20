import path from "path";
import { pathExists } from "../fs/pathExists.js";
import { CodespinConfig } from "../settings/CodespinConfig.js";
import { getTemplatesDir } from "../settings/getTemplatesDir.js";
import declarationsTemplate from "../templates/declarations.js";
import defaultTemplate from "../templates/default.js";
import dependenciesTemplate from "../templates/dependencies.js";
import diffTemplate from "../templates/diff.js";
import plainTemplate from "../templates/plain.js";
import { exception } from "../exception.js";

export type TemplateResult = {
  prompt: string;
  responseParser?: "file-block" | "diff";
};

export type TemplateFunc<T> = (
  args: T,
  config: CodespinConfig
) => Promise<TemplateResult>;

export async function getTemplate<T>(
  template: string | undefined,
  customConfigDir: string | undefined,
  workingDir: string
): Promise<TemplateFunc<T>> {
  return template === "plain"
    ? plainTemplate
    : template === "default"
    ? defaultTemplate
    : template === "declarations"
    ? declarationsTemplate
    : template === "dependencies"
    ? dependenciesTemplate
    : template === "diff"
    ? diffTemplate
    : await (async () => {
        const projectTemplateDir = await getTemplatesDir(
          customConfigDir,
          workingDir
        );

        const templatePath =
          template && (await pathExists(template))
            ? template
            : projectTemplateDir &&
              (await pathExists(path.join(projectTemplateDir, template!)))
            ? path.join(projectTemplateDir, template!)
            : exception(`The template ${template} was not found.`);

        const templateModule = await import(templatePath);
        return templateModule.default;
      })();
}
