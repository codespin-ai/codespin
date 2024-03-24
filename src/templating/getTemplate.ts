import path from "path";
import { getTemplatesDir } from "../fs/codespinPaths.js";
import { pathExists } from "../fs/pathExists.js";
import defaultTemplate from "../templates/default.js";
import plainTemplate from "../templates/plain.js";
import declarationsTemplate from "../templates/declarations.js";
import { exception } from "../exception.js";

export async function getTemplate(
  template: string | undefined,
  templateType: "plain" | "default" | "declarations",
  configDirFromArgs: string | undefined
): Promise<Function> {
  const projectTemplateDir = await getTemplatesDir(configDirFromArgs);

  const templatePath =
    template && (await pathExists(template))
      ? template
      : projectTemplateDir &&
        (await pathExists(
          path.join(projectTemplateDir, template || `${templateType}.mjs`)
        ))
      ? path.join(projectTemplateDir, template || `${templateType}.mjs`)
      : undefined;

  if (templatePath) {
    const template = await import(templatePath);
    return template.default;
  } else {
    return templateType === "plain"
      ? plainTemplate
      : templateType === "default"
      ? defaultTemplate
      : templateType === "declarations"
      ? declarationsTemplate
      : exception(
          `The template ${template || `${templateType}.mjs`} was not found.`
        );
  }
}
