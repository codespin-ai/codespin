import { promises as fs } from "fs";
import path from "path";
import { CodeSpinContext } from "../types.js";
import { writeDebug } from "../console.js";
import { setDebugFlag } from "../debugMode.js";
import { pathExists } from "../fs/pathExists.js";
import { getLanguageService } from "../languageServices/getLanguageService.js";
import { readCodeSpinConfig } from "../settings/readCodeSpinConfig.js";
import { Dependency } from "../sourceCode/Dependency.js";
import dependenciesTemplate, {
  DependenciesTemplateArgs,
  DependenciesTemplateResult,
} from "../templates/dependencies.js";
import { getCustomTemplate } from "../templating/getCustomTemplate.js";

import * as libllm from "libllm";
import { validateMaxInputStringLength } from "../safety/validateMaxInputLength.js";
import { getConfigDirs } from "../settings/getConfigDirs.js";

export type DependenciesArgs = {
  file: string;
  config?: string;
  model?: string;
  maxInput?: number;
  maxTokens?: number;
  debug?: boolean;
  reloadConfig?: boolean;
  reloadProviderConfig?: boolean;
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
    const config = await readCodeSpinConfig(
      args.config,
      context.workingDir,
      args.reloadConfig
    );

    // This is in bytes
    const maxInput = args.maxInput ?? config.maxInput;

    if (config.debug) {
      setDebugFlag();
    }

    const model = args.model ?? config.model;

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

    const completionOptions: libllm.types.CompletionOptions = {
      model,
      maxTokens: args.maxTokens,
      reloadConfig: args.reloadProviderConfig,
    };

    writeDebug("--- PROMPT ---");
    writeDebug(prompt);

    const configDirs = await getConfigDirs(args.config, context.workingDir);

    const provider = await libllm.getAPIForModel(
      model,
      configDirs.configDir,
      configDirs.globalConfigDir
    );

    validateMaxInputStringLength(prompt, maxInput);

    const completionResult = await provider.completion(
      [{ role: "user", content: prompt }],
      completionOptions,
      args.reloadProviderConfig
    );

    const dependencies = JSON.parse(
      libllm.parsing.extractFromMarkdownCodeBlock(
        completionResult.message,
        true
      ).content
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
  }
}
