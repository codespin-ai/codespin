# codespin-cli

CodeSpin.AI Code Generation Tools. Open Source, MIT-licensed.

## Installation

`npm install -g codespin`

## Getting Help

To list all commands:

`codespin help`

To get command specific help:

`codespin generate help`

## Usage

You need to set up OPENAI_API_KEY. Go to https://platform.openai.com/signup if you don't have an account.

### codespin init

This initializes your profile directory with some configuration.

You simply need to go to the project directory and do:

```
codespin init
```

### codespin scaffold

Generates an initial set of files for a module or a project.

Describe what you want in a file ending with a "prompt.md" extension.
Files will be generated relative to the location of the prompt file.

```
codespin scaffold my-project.prompt.md --write
```

### codespin generate

Generate source code for a single file.

Describe what the file needs to do in a prompt file named "sourcefile.ext.prompt.md".
The corresponding sourcefile file be updated. If the sourcefile doesn't exist, it'll be created.

```
codespin generate main.py.prompt.md --write
```

### Common CLI options

These are common to scaffold and generate

- `--write`: Write generated code to source file.
- `--writePrompt`: Write the prompt out to the specified path
- `--api`: API service to use. Defaults to OpenAI.
- `--model`: The model to use. Defaults to gpt-3.5-turbo
- `--maxTokens`: Maximum number of tokens for generated code
- `--template`: Path to the template to be used. Defaults to built-in templates.
- `--exec`: Execute a command for each generated file. For example, you might want to run a formatting tool.
- `--debug`: Enable debug mode. Prints prompts, responses etc.
- `--config`: Path to codespin config
- `-h, --help`: Show help

### Prompt File Settings

Prompt files (prompt.md files) allow JSON settings using front matter.
This allows you to configure api, model, template and maxTokens parameter individually for each prompt.md file.

Here's an example prompt file with custom configuration.

```
---
{
  "template": "mytemplates/nodejs/typescript",
  "model": "gpt-3.5-turbo-16k"
}
---
Create a NodeJS app to print the sum of the squares of integers.
The app should take numbers as CLI args.
```

## Custom Templates

To define your own custom templates, refer to the examples at https://github.com/codespin-ai/codespin-cli/tree/main/templates/default

Your custom template directory can have one or more of these files.
- scaffold.md // For scaffold
- generate.md // For generating a new source code file
- regenerate.md // For regenerating an existing source code file
- scaffold-write.md // For scaffold with the --write option
- generate-write.md // For generating a new source code file with the --write option
- regenerate-write.md // For regenerating an existing source code file with the --write option

If custom templates are specified and the template is not found, the built-in templates are used as a fallback.

## Tips

1. Keep committing prompts and code whenever you're happy with the generated code.
2. It's totally fine to make minor edits to the generated code. Regeneration will usually take into consideration your edits.
3. If you want to make major edits, do it by editing the prompt files.
