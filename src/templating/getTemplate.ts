import path from "path";
import { exception } from "../exception.js";
import { pathExists } from "../fs/pathExists.js";
import { getTemplatesDir } from "../settings/getTemplatesDir.js";
import declarationsTemplate from "../templates/declarations.js";
import defaultTemplate from "../templates/default.js";
import dependenciesTemplate from "../templates/dependencies.js";
import diffTemplate from "../templates/diff.js";
import plainTemplate from "../templates/plain.js";
import { CodespinConfig } from "../settings/CodespinConfig.js";

export type TemplateFunc<T> = (
  args: T,
  config: CodespinConfig
) => Promise<string>;

export async function getTemplate<T>(
  template: string | undefined,
  templateType: "plain" | "declarations" | "default" | "dependencies" | "diff",
  customConfigDir: string | undefined,
  workingDir: string
): Promise<TemplateFunc<T>> {
  const projectTemplateDir = await getTemplatesDir(customConfigDir, workingDir);

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
      ? (plainTemplate as TemplateFunc<T>)
      : templateType === "default"
      ? (defaultTemplate as TemplateFunc<T>)
      : templateType === "declarations"
      ? (declarationsTemplate as TemplateFunc<T>)
      : templateType === "dependencies"
      ? (dependenciesTemplate as TemplateFunc<T>)
      : templateType === "diff"
      ? (diffTemplate as TemplateFunc<T>)
      : exception(
          `The template ${template || `${templateType}.mjs`} was not found.`
        );
  }
}
