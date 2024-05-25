import path from "path";
import { exception } from "../exception.js";
import { pathExists } from "../fs/pathExists.js";
import { CodespinConfig } from "../settings/CodespinConfig.js";
import { getTemplatesDir } from "../settings/getTemplatesDir.js";
import { TemplateResult } from "../templates/TemplateResult.js";

export type TemplateFunc<TArgs, TResult> = (
  args: TArgs,
  config: CodespinConfig
) => Promise<TResult>;

export async function getCustomTemplate<TArgs, TResult>(
  template: string,
  customConfigDir: string | undefined,
  workingDir: string
): Promise<TemplateFunc<TArgs, TResult> | undefined> {
  try {
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
  } catch (ex: any) {
    return undefined;
  }
}
