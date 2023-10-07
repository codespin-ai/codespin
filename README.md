# codespin-cli

CodeSpin.AI Code Generation Tools. Open Source, MIT-licensed.

## Installation

You need to install Node.JS. Go here https://nodejs.org/en

And then:

`npm install -g codespin`

## Getting Help

To list all commands:

`codespin help`

To get command specific help:

`codespin <command> help`

For example:

`codespin generate help`

## Usage

You need to set up the OPENAI_API_KEY environment variable. Go to https://platform.openai.com/signup if you don't have an account.

If you don't have an OPENAI_API_KEY, you can [Use it with ChatGPT](#using-with-chatgpt). 

### codespin init

This initializes your profile directory with some configuration.

You simply need to go to the project directory and do:

```
codespin init
```

### codespin generate

Generate source code based on a prompt file.

Describe what the file needs to do in a prompt file, ideally named "sourcefile.ext.prompt.md" (eg: main.py.prompt.md).

When generating code for the first time, pass `generate.md` as the template name. 
This template can be found under `codespin/templates` after you do a `codespin init`.
Pass `--write` to write to the disk, without which codespin will merely print to the screen.

```
codespin generate main.py.prompt.md --template default/generate.md
```

When regenerating, include the existing source code file with the `--include` parameter.
This passes the existing source code so that the code generator understands the context better.
Also remember to use the `regenerate.md` template instead of the `generate.md` template.

```
codespin generate main.py.prompt.md --template regenerate.md --include main.py --write
```

## Parameters for codespin generate

These options are available with the `codespin generate` command:

- `--write`: Write generated code to source file.
- `--write-prompt`: Write the prompt out to the specified path
- `--api`: API service to use. Defaults to OpenAI.
- `--model`: The model to use. Defaults to gpt-3.5-turbo
- `--max-tokens`: Maximum number of tokens for generated code
- `--template`: Path to the template to be used. Defaults to built-in templates.
- `--include`: Path to the template to be used. Defaults to built-in templates.
- `--exec`: Execute a command for each generated file. For example, you might want to run a formatting tool.
- `--debug`: Enable debug mode. Prints prompts, responses etc.
- `--config`: Path to codespin config
- `-h, --help`: Show help

## Prompt File Settings

Prompt files (prompt.md files) you to specify settings with JSON or TOML front matter.
This allows you to configure include, template, api, model and maxTokens parameter individually for each prompt.md file.

Here's an example prompt file with custom configuration.

```
---
{
  "include": "main.py",
  "template": "typescript",
  "model": "gpt-3.5-turbo-16k"
}
---
Create a NodeJS app to print the sum of the squares of integers.
The app should take numbers as CLI args.
```

## Custom Templates

To use custom templates, create a new directory under `codespin/templates`, which would have already been created by `codespin init`. 

Then under this directory, you can create all or some of the following files:
- scaffold.md // For scaffold
- generate.md // For generating a new source code file
- regenerate.md // For regenerating an existing source code file
- modify.md // For modifying an existing source code file in part

You can refer to the examples at https://github.com/codespin-ai/codespin-cli/tree/main/templates/default

If custom templates were specified (with the `--template` argument) but the template is not found, built-in templates will be used as a fallback.

## Using with ChatGPT

Using codespin with an API key is the easiest option. However, if you don't have an API key but have access to ChatGPT there are some workarounds.

Use the `--write-prompt` command to write out the final LLM prompt to a file, like this:
```
codespin generate something.py.prompt.md --write-prompt /some/where/a/file.txt
```

Copy the contents of /some/where/a/file.txt and paste it in ChatGPT. 
Update the source file manually with ChatGPT's response.

But what about scaffolds?

Well, turns out you can load an LLM response from a text file with the `--file-list` parameter.
Copy ChatGPT's response into a file, and supply that as the `--file-list` argument, like this:

```
codespin scaffold myproject.prompt.md --file-list /some/where/a/gpt/output.txt
```

## Tips

1. Keep committing prompts and code whenever you're happy with the generated code.
2. It's totally fine to make minor edits to the generated code. Regeneration will usually take into consideration your edits.
3. If you want to make major edits, do it by editing the prompt files.
