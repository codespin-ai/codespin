import { CodeSpinContext } from "../CodeSpinContext.js";
import { getCompletionAPI } from "../api/getCompletionAPI.js";
import { setDebugFlag } from "../debugMode.js";
import { execString } from "../process/execString.js";
import { validateMaxInputStringLength } from "../safety/validateMaxInputLength.js";
import { getModel } from "../settings/getModel.js";
import { readCodeSpinConfig } from "../settings/readCodeSpinConfig.js";
import { extractFromMarkdownCodeBlock } from "../responseParsing/codeBlocks.js";
import commitTemplate, {
  CommitTemplateArgs,
  CommitTemplateResult,
} from "../templates/commit.js";
import { getCustomTemplate } from "../templating/getCustomTemplate.js";

export type CommitArgs = {
  model?: string;
  maxInput?: number;
  maxTokens?: number;
  debug?: boolean;
  config?: string;
  reloadConfig?: boolean;
};

export type CommitResult = {
  subject: string;
  body: string;
};

export async function commit(
  args: CommitArgs,
  context: CodeSpinContext
): Promise<CommitResult> {
  if (args.debug) {
    setDebugFlag();
  }

  const config = await readCodeSpinConfig(
    args.config,
    context.workingDir,
    args.reloadConfig
  );

  const maxInput = args.maxInput ?? config.maxInput;
  const model = getModel([args.model, config.liteModel, config.model], config);

  // Get the git diff
  const diffContent = await execString("git diff HEAD", context.workingDir);

  const templateFunc =
    (await getCustomTemplate<CommitTemplateArgs, CommitTemplateResult>(
      "commit",
      args.config,
      context.workingDir
    )) ?? commitTemplate;

  const { prompt } = await templateFunc(
    {
      diffContent,
      workingDir: context.workingDir,
    },
    config
  );

  validateMaxInputStringLength(prompt, maxInput);

  const completionAPI = getCompletionAPI(model.provider);
  const completion = await completionAPI.completion(
    [{ role: "user", content: prompt }],
    args.config,
    { model, maxTokens: args.maxTokens },
    context.workingDir
  );

  const jsonResponse = extractFromMarkdownCodeBlock(completion.message, true);
  return JSON.parse(jsonResponse.content) as CommitResult;
}
