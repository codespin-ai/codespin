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

To get specific help for a command, just type in `codespin command help`.

For example:

```sh
codespin generate help
```

## Usage

Set up the `OPENAI_API_KEY` environment variable. If you don't have an account, register at [https://platform.openai.com/signup](https://platform.openai.com/signup).

If you don't possess an `OPENAI_API_KEY`, you can [use it with ChatGPT](#using-with-chatgpt).

Ready? Let's try it out. The following statement generates code for a Hello World app and prints it to the screen.

```
codespin generate --prompt 'Make a python program (in main.py) that prints Hello, World!'
```

If you want it to write out the file, you must use the `--write` option.

```
codespin generate --prompt 'Make a python program (in main.py) that prints Hello, World!' --write
```

That was simple, wasn't it? We're just getting started.


### codespin init

For serious use, you must treat prompts as first class citizens in your project.
You need to save prompts in files and commit them in git, just as you would do with source code.

Let's start by initializing your project directory with some configuration:

```sh
codespin init
```

This would have created codespin.json, as well as some directories that hold code generation templates.


### codespin generate

The generate command is how you'd generate source code.

First, let's create a "prompt file" to describe functional requirements.
One suggested convention is to have a prompt file for each source code file you want to generate.
A good name for a prompt file would be a "prompt.md" suffix attached to the name of the source code file you want to generate. 

For example, the prompt file describing main.py could be called "main.py.prompt.md".

`main.py.prompt.md`:

```
Make a python program (in main.py) that prints Hello, World!
Add a shebang, so that it's directly executable.
```

Once you've saved main.py.prompt.md, you can generate main.py from it.

```sh
codespin generate main.py.prompt.md --write
```

This would create a main.py file which prints "Hello, World!".


#### Regenerating code

To regenerate a file you must modify the contents of a prompt file, and then pass the existing source code using the `--include` parameter.
This helps with better context understanding by the code generator.

```sh
codespin generate main.py.prompt.md --include main.py --write
```

💡 For regeneration to be truly effective, you need to be using a git repository and keep committing the prompt and generated code files whenever you're apply with an edit.
This allows the code generator to inspect the delta between prompts (working copy and HEAD) and apply the necessary changes accurately.

#### Options for codespin generate

- `-p, --prompt`: Specify the prompt directly on the command line.
- `-t, --template`: Specify the template to use. If unspecified, "generate.md" is used.
- `-w, --write`: Save generated code to a source file. Defaults to 'false'.
- `--print-prompt`: Print the generated prompt to the screen without making an API call.
- `--write-prompt`: Save the generated prompt to the specified path without making an API call.
- `--api`: API service to utilize, like 'openai'. Defaults to 'openai'.
- `--model`: Name of the desired model. E.g., 'gpt-4'.
- `--max-tokens`: Maximum tokens allowed for the generated code.
- `-i, --include`: List of files to include in the prompt for better context during code generation. Repeat for including multiple files.
- `-e, --exec`: Executes a command for each generated file. Useful for, e.g., running a formatting tool.
- `--debug`: Enables debug mode, displaying debug messages for each step.
- `-c, --config`: Specifies the path to a config file.
- `--base-dir`: Designates the directory path relative to where files are generated. Defaults to the directory of the prompt file.
- `-h, --help`: Displays help.

## The Prompt File

A prompt file (usually with a `.prompt.md` extension) contains generation instructions.

A basic prompt file would look like this, optionally including a front-matter:

```markdown
---
api: openai
model: gpt-3.5-turbo-16k
---

Generate a Python CLI script named index.py that accepts a set of arguments and prints their sum.
```

The front-matter can include values for `--include`, `--template`, `--api`, `--model` and `--max-token` parameters.

## Immediate Mode for Prompting

You can specify a prompt directly as an argument like this:

```sh
codespin generate --prompt 'Create a file main.py which contains a function to add two numbers.'
```

As always, you must use `--write` to write it out to a file.

## Custom Templates

A CodeSpin Template is essentially a [HandleBars.JS](https://github.com/handlebars-lang/handlebars.js) template.

You can specify custom templates with the `--template` argument.

```sh
codespin generate main.py.prompt.md --template mypythontemplate.md --include main.py --write
```

Usually, you'd craft custom templates to dictate aspects like coding style, frameworks, etc.

Here's a barebones template:

```handlebars
{{prompt}}

Respond with just the code (for the entire file) in the format:

$START_FILE_CONTENTS:{{./some/path/filename.ext}}$
import a from "./a";
function someFunction() {
// code here
}
$END_FILE_CONTENTS:{{./some/path/filename.ext}}$
```

Custom templates can utilize the following variables:

```ts
type TemplateArgs = {
  prompt: string;
  promptWithLineNumbers: string;
  previousPrompt: string; // from git commit
  previousPromptWithLineNumbers: string; // from git commit
  promptDiff: string; // git diff
  files: FileContent[]; // files added with --include
};

type FileContent = {
  name: string;
  contents: string;
  contentsWithLineNumbers: string;
  previousContents: string; // from git commit
  previousContentsWithLineNumbers: string; // from git commit
};
```

## Using with ChatGPT

Using codespin with an API key is the most straightforward method. However, if you lack an API key but have access to ChatGPT, there are alternatives.

Use the `--print-prompt` command to print the final LLM prompt to the screen, or `--write-prompt` command to write it to a file.

```sh
# Print to the screen
codespin generate something.py.prompt.md --print-prompt

# Or write to a file
codespin generate something.py.prompt.md --write-prompt /path/to/file.txt
```

Now copy and paste the prompt into ChatGPT. Save ChatGPT's response in a test file, say gptresponse.txt.

Then use the `codespin parse` command to parse the content. Like this:

```sh
# Remember to mention --write
codespin parse gptresponse.txt --write
```

💡: When copying the response from ChatGPT, use the copy icon. Selecting text and copying doesn't retain formatting.
