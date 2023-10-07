# codespin-cli

CodeSpin.AI Code Generation Tools. Open Source, MIT-licensed.

## Installation

First, you need to install Node.JS. Visit [https://nodejs.org/en](https://nodejs.org/en).

After that, install codespin using:

```sh
npm install -g codespin
```

## Getting Help

To list all commands:

```sh
codespin help
```

To get specific help for a command:

```sh
codespin <command> help
```

For example:

```sh
codespin generate help
```

## Usage

Set up the `OPENAI_API_KEY` environment variable. If you don't have an account, register at [https://platform.openai.com/signup](https://platform.openai.com/signup).

If you don't possess an `OPENAI_API_KEY`, you can [use it with ChatGPT](#using-with-chatgpt).

### codespin init

This command initializes your profile directory with some configurations.

Simply navigate to the project directory and run:

```sh
codespin init
```

### codespin generate

This command generates source code based on a prompt file.

Describe the requirements in a prompt file, ideally with a `.prompt.md` extension, e.g., `main.py.prompt.md`.

When generating code for the first time, use `generate.md` as the template name. This template is located under `codespin/templates` after executing `codespin init`. Use `--write` to save to the disk, otherwise, codespin will only display it on the screen.

```sh
codespin generate main.py.prompt.md --template default/generate.md --write
```

To regenerate a file, use the `regenerate.md` template instead of `generate.md`. Remember to include the existing source code file using the `--include` parameter for better context understanding by the code generator.

```sh
codespin generate main.py.prompt.md --template regenerate.md --include main.py --write
```

#### Additional parameters for codespin generate

Options available with the `codespin generate` command are:

- `--write`: Save generated code to a source file. Defaults to 'false'.
- `--write-prompt`: Save the generated prompt to the specified path without making an API call.
- `--api`: API service to utilize, like 'openai'. Defaults to 'openai'.
- `--model`: Name of the desired model. E.g., 'gpt-4'.
- `--max-tokens`: Maximum tokens allowed for the generated code.
- `--include`: List of files to include in the prompt for better context during code generation.
- `--exec`: Executes a command for each generated file. Useful for, e.g., running a formatting tool.
- `--debug`: Enables debug mode, displaying debug messages for each step.
- `--config`: Specifies the path to a config file.
- `--base-dir`: Designates the directory path relative to where files are generated. Defaults to the directory of the prompt file.
- `-h, --help`: Displays help.

## The Prompt File

A prompt file (usually with a `.prompt.md` extension) contains generation instructions.

A basic prompt file might look like this, optionally including a front-matter:

```markdown
---
api: openai
model: gpt-3.5-turbo-16k
---

Generate a Python CLI script named index.py that accepts a set of arguments and prints their sum.
```

A prompt file can optionally contain YAML front-matter for the `--template`, `--api`, `--model`, and `--max-token` parameters.

## Templates

Determine the template using the `--template` argument.

The following templates are automatically installed when you execute `codespin init`:

- `generate.md`
- `regenerate.md`
- `scaffold.md`

Use "generate.md" when generating a file for the first time. Use "regenerate.md" when regenerating a file (don't forget the `--include` argument). Use "scaffold.md" when you wish to generate multiple files, like when creating a new project or module.

Initially, the template path is searched in the current directory. If not found, it checks the "codespin/templates" directory. An error is thrown if it's missing in both.

### Custom Templates

You can craft custom templates to dictate aspects like coding style, frameworks, etc.

A CodeSpin Template is essentially a [HandleBars.JS](https://github.com/handlebars-lang/handlebars.js) template.

For example:

```handlebars
{{codegenPrompt}}

Respond with just the code (for the entire file) in the format:

$START_FILE_CONTENTS:{{./somefilename.ext}}$
import a from "./a";
function someFunction() {
// code here
}
$END_FILE_CONTENTS:{{codeFile}}$
```

Custom templates can utilize variables like:

- `codegenPrompt`: The content of the prompt file
- `includedFiles`: An array of { name: string, content: string } items representing files pointed out by the `--include` argument.

## Using with ChatGPT

Using codespin with an API key is the most straightforward method. However, if you lack an API key but have access to ChatGPT, there are alternatives.

Use the `--write-prompt` command to export the final LLM prompt to a file:

```sh
codespin generate something.py.prompt.md --write-prompt /path/to/file.txt --template generate.md
```

Copy the content of `/path/to/file.txt` and input it into ChatGPT. Then, update the source file manually based on ChatGPT's response.

## Tips

1. Regularly commit prompts and code when satisfied with the generated output.
2. It's entirely acceptable to make slight modifications to the generated code. Regeneration generally respects your edits as long as you use the `--include` argument for the source code.
3. For significant modifications, consider updating the prompt files.
