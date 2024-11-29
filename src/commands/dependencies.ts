import { promises as fs } from "fs";
import path from "path";
import { CodeSpinContext } from "../CodeSpinContext.js";
import { CompletionOptions } from "../api/CompletionOptions.js";
import { getCompletionAPI } from "../api/getCompletionAPI.js";
import { writeDebug } from "../console.js";
import { setDebugFlag } from "../debugMode.js";
import { pathExists } from "../fs/pathExists.js";
import { getLanguageService } from "../languageServices/getLanguageService.js";
import { extractFromMarkdownCodeBlock } from "../responseParsing/codeBlocks.js";
import { validateMaxInputLength } from "../safety/validateMaxInputLength.js";
import { readCodeSpinConfig } from "../settings/readCodeSpinConfig.js";
import { Dependency } from "../sourceCode/Dependency.js";
import { DependenciesTemplateArgs } from "../templates/DependenciesTemplateArgs.js";
import { DependenciesTemplateResult } from "../templates/DependenciesTemplateResult.js";
import dependenciesTemplate from "../templates/dependencies.js";
import { getCustomTemplate } from "../templating/getCustomTemplate.js";
import { getModel } from "../settings/getModel.js";
import { exception } from "../exception.js";

export type DependenciesArgs = {
  file: string;
  config?: string;
  model?: string;
  maxInput?: number;
  maxTokens?: number;
  debug?: boolean;
};

export type DependenciesResult = {
  dependencies: Dependency[];
};

export async function dependencies(
  args: DependenciesArgs,
  context: CodeSpinContext
): Promise<DependenciesResult> {
  if (args.debug) {
    setDebugFlag();
  }

  // First see if we can get a language service.
  const languageService = getLanguageService(args.file);

  if (languageService) {
    return {
      dependencies: await languageService.getDependencies(
        args.file,
        context.workingDir
      ),
    };
  }

  // No language service.
  else {
    const config = await readCodeSpinConfig(args.config, context.workingDir);

    // This is in bytes
    const maxInput = args.maxInput ?? config.maxInput;

    if (config.debug) {
      setDebugFlag();
    }

    const model = getModel([args.model, config.model], config);

    const sourceCode = await fs.readFile(
      path.resolve(context.workingDir, args.file),
      "utf-8"
    );

    // See if there's a custom template
    const customTemplate = await getCustomTemplate<
      DependenciesTemplateArgs,
      DependenciesTemplateResult
    >("dependencies", args.config, context.workingDir);

    const { prompt } = await (customTemplate ?? dependenciesTemplate)(
      {
        filePath: args.file,
        sourceCode,
        workingDir: context.workingDir,
      },
      config
    );

    const completionOptions: CompletionOptions = {
      model,
      maxTokens: args.maxTokens,
    };

    writeDebug("--- PROMPT ---");
    writeDebug(prompt);

    const completion = getCompletionAPI(model.provider);

    validateMaxInputLength(prompt, maxInput);

    const completionResult = await completion(
      [{ role: "user", content: prompt }],
      args.config,
      completionOptions,
      context.workingDir
    );

    if (completionResult.ok) {
      const dependencies = JSON.parse(
        extractFromMarkdownCodeBlock(completionResult.message, true).content
      ) as Dependency[];

      // Fix language specific quirks here.
      const extensionsToCheck = ["tsx", "ts", "jsx", "js"];
      if (extensionsToCheck.some((ext) => args.file.endsWith(`.${ext}`))) {
        for (const dep of dependencies) {
          if (dep.isProjectFile) {
            for (const extension of extensionsToCheck) {
              const potentialFilePath = path.join(
                context.workingDir,
                dep.filePath.replace(/\.(ts|js)x?$/, `.${extension}`)
              );
              if (await pathExists(potentialFilePath)) {
                dep.filePath = dep.filePath.replace(
                  /\.(ts|js)x?$/,
                  `.${extension}`
                );
                break;
              }
            }
          }
        }
      }

      return { dependencies };
    } else {
      exception(completionResult.error.code, completionResult.error.message);
    }
  }
}
