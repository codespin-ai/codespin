import { CodeSpinConfig } from "../settings/CodeSpinConfig.js";

export type CommitTemplateArgs = {
  diffContent: string;
  workingDir: string;
};

export type CommitTemplateResult = {
  prompt: string;
};

export default async function commitTemplate(
  args: CommitTemplateArgs,
  config: CodeSpinConfig
): Promise<CommitTemplateResult> {
  const prompt = `
Analyze the following Git diff and generate an appropriate commit message following conventional commits format.
Generate ONLY a JSON response with two fields:
- 'subject': A concise description of the changes (50 characters or less)
- 'body': A detailed explanation of what changed and why

The JSON should be properly formatted and enclosed in a code block.

Example response:
\`\`\`json
{
  "subject": "feat(api): add user authentication endpoints",
  "body": "Added new endpoints for user authentication including:\\n- POST /auth/login for user login\\n- POST /auth/register for new user registration\\n- GET /auth/verify for email verification\\n\\nImplemented JWT token generation and validation.\\nAdded rate limiting to prevent brute force attacks."
}
\`\`\`

Here is the Git diff to analyze:

${args.diffContent}

Respond only with the JSON block containing the commit messages. No other text.
`;

  return {
    prompt,
  };
}
