import { DependenciesTemplateArgs } from "./DependenciesTemplateArgs.js";

function makePrompt(filePath: string, sourceCode: string) {
  return `
Given a source code snippet in any programming language, your task is to identify all its dependencies, including modules, libraries, and local files. For each identified dependency, categorize it as either a project file (part of the project's own codebase) or an external/standard library dependency. Then, provide the likely file path or location for each dependency based on conventional project structures and language-specific installation paths.

Consider the following guidelines for a comprehensive analysis:

1. **External Libraries or Modules:** These are dependencies not part of the language's standard library, usually installed via a package manager (e.g., pip for Python, npm for JavaScript). Mark these as external and indicate the file path as 'unknown' or omit it.
2. **Standard Library:** Refers to the modules that come pre-installed with the programming language. For dependencies identified as part of the standard library, provide their typical installation path if possible.
3. **Project Files:** These are any files or modules that are part of the current project's codebase. Speculate a relative file path within a conventional project structure.

Your output should be structured as follows:

\`\`\`json
[
  { "dependency": "dependency_name", "filePath": "path/if/known", "isProjectFile": true or false },
  ...
]
\`\`\`

### Example for TypeScript:

\`\`\`typescript
import * as express from 'express';  // External library
import { MyInterface } from './interfaces/MyInterface';  // Project file
\`\`\`

Expected analysis output:

\`\`\`json
dependencies = [
  { "dependency": "express", "filePath": "node_modules/express", "isProjectFile": false },
  { "dependency": "./interfaces/MyInterface", "filePath": "src/interfaces/MyInterface.ts", "isProjectFile": true }
]
\`\`\`

### Example for Python:

\`\`\`python
import json  # Standard library
from myproject.models import UserModel  # Project file
\`\`\`

Expected analysis output:

\`\`\`json 
[
  { "dependency": "json", "filePath": "/usr/lib/python3.*/json.py", "isProjectFile": false },
  { "dependency": "myproject.models.UserModel", "filePath": "myproject/models.py", "isProjectFile": true }
]
\`\`\`

Please apply this analysis framework universally, considering any programming language such as Rust, C++, etc. The goal is to accurately identify the nature and location of each dependency to the best of your understanding, based on the code snippet provided."

The following is the source (in the file ${filePath}) to be analyzed:

\`\`\`
${sourceCode}
\`\`\`

Print only the JSON and no other text. Enclose it in a JSON codeblock.
`;
}

export default async function declarations(args: DependenciesTemplateArgs) {
  return makePrompt(args.filePath, args.sourceCode);
}
