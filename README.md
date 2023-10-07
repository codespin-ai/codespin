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

```sh
codespin init
```

### codespin generate

Generate source code based on a prompt file.

Describe what the file needs to do in a prompt file, ideally named with a "prompt.md" extension. eg: main.py.prompt.md

When generating code for the first time, pass `generate.md` as the template name.
This template can be found under `codespin/templates` after you do a `codespin init`.
Pass `--write` to write to the disk, without which codespin will merely print to the screen.

```sh
codespin generate main.py.prompt.md --template default/generate.md
```

When regenerating a file, use the `regenerate.md` template instead of the `generate.md` template.
You also need to include the existing source code file with the `--include` parameter. Doing so helps the code generator understand the context better.

```sh
codespin generate main.py.prompt.md --template regenerate.md --include main.py --write
```

## Parameters for codespin generate

These options are available with the `codespin generate` command:

- `--promptFile`: Required. Name of the prompt file.
- `--template`: Required. Path to the template directory.
- `--write`: Write generated code to source file. Defaults to 'false'.
- `--writePrompt`: Write the generated prompt out to the specified path. Does not call the API.
- `--api`: API service to use, such as 'openai'. Defaults to 'openai'.
- `--model`: Name of the model to use. For example, 'gpt-4'.
- `--maxTokens`: Maximum number of tokens for generated code.
- `--include`: List of files to include in the prompt. This provides additional context during code generation.
- `--exec`: Execute a command for each generated file. (e.g., run a formatting tool.)
- `--debug`: Enable debug mode. This prints debug messages for every step.
- `--config`: Path to config file.
- `--baseDir`: Path to directory relative to which files are generated. Defaults to the directory of the prompt file.
- `-h, --help`: Show help

## The Prompt File

A prompt file (the convention is to use a prompt.md extension) contains instructions on what needs to be generated.

A simple prompt file looks like this, with optional front-matter:

```
---
api: openi
model: gpt-3.5-turbo-16k
---

Generate a Python CLI script named index.py which takes a set of args and prints the sum.
```

A prompt file may contain (optionally) YAML front-matter for the values of `--template`, `--api`, `--model` and `--max-token` parameters.

## Templates

Specify the template to use with the `--template` argument.

The following templates are automatically installed when you do a `codespin init`:

- generate.md
- regenerate.md
- scaffold.md

Here, "generate.md" should be used while generating a file for the first time.
"regenerate.md" should be used when a file is being regenerated (you also need to specify the `--include` argument).
"scaffold.md" is used to generate a set of files; for example while creating a new project or module.

The template path is first searched in the current directory, but if not found it's searched in the "codespin/templates" directory.
If missing in both locations, an error is produced.

### Custom Templates

You can create your own custom templates to specify things like coding style, frameworks to use etc.

A CodeSpin Template is actually just a [HandleBars.JS](https://github.com/handlebars-lang/handlebars.js) templates.

They look like this:

```
{{codegenPrompt}}

Respond with just the code (for the entire file) in the following format:

$START_FILE_CONTENTS:{{./somefilename.ext}}$
import a from "./a";
function somethingSomething() {
//....
}
$END_FILE_CONTENTS:{{codeFile}}$
```

Custom can use the following variables:

- codeGenPrompt: The contents of the prompt file
- includedFiles: An array of { name: string, content: string } objects representing files specified with the `--include` argument

## Using with ChatGPT

Using codespin with an API key is the easiest option. However, if you don't have an API key but have access to ChatGPT there are some workarounds.

Use the `--write-prompt` command to write out the final LLM prompt to a file, like this:

```
codespin generate something.py.prompt.md --write-prompt /some/where/a/file.txt --template generate.md
```

Copy the contents of /some/where/a/file.txt and paste it into ChatGPT.
Update the source file manually with ChatGPT's response.

## Tips

1. Keep committing prompts and code whenever you're happy with the generated code.
2. It's totally fine to make minor edits to the generated code. Regeneration will usually take into consideration your edits as long as you `--include` the source code.
3. If you want to make major edits, do it by editing the prompt files.
