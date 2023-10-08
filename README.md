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


Ready? Let's try it out. This prints the contents of main.py to the screen.

```
codespin generate --prompt 'Make a python program (in main.py) that prints Hello, World!'
```

If you want it to write out the file, use the `--write` option.

```
codespin generate --prompt 'Make a python program (in main.py) that prints Hello, World!' --write
```

### codespin init

This command initializes your profile directory with some configurations.

Simply navigate to the project directory and run:

```sh
codespin init
```

### codespin generate

This command generates source code based on a prompt file.

Describe the requirements in a prompt file, ideally with a `.prompt.md` extension, e.g., `main.py.prompt.md`.

Use `--write` to save to the disk, otherwise, codespin will only display it on the screen.

```sh
codespin generate main.py.prompt.md --write
```

#### Regenerating code

To regenerate a file, pass the existing source code file using the `--include` parameter for better context understanding by the code generator.

```sh
codespin generate main.py.prompt.md --include main.py --write
```

NOTE: For regeneration to be effective, you need to:
- Use a git repository 
- keep committing both the prompt files and generated source code every time you're happy with generated code.

Looking at the differences between the current version of a file and the last committed version helps the LLM understand the context better.

#### Options for codespin generate

- `-p, --prompt`: Specify the prompt directly on the command line.
- `-t, --template`: Specify the template to use. If unspecified, "generate.md" is used.
- `-w, --write`: Save generated code to a source file. Defaults to 'false'.
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

A basic prompt file might look like this, optionally including a front-matter:

```markdown
---
api: openai
model: gpt-3.5-turbo-16k
---

Generate a Python CLI script named index.py that accepts a set of arguments and prints their sum.
```

A prompt file can optionally contain YAML front-matter for the `--include`, `--template`, `--api`, `--model` and `--max-token` parameters.

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

Tip: When copying the response from ChatGPT, use the copy icon. Selecting text and copying doesn't retain formatting.

## Tips

1. Regularly commit prompts and code when satisfied with the generated output.
2. It's entirely acceptable to make slight manual modifications to the generated code. 
3. Regeneration generally respects your edits as long as you use the `--include` argument for the source code
4. For significant modifications, consider updating the prompt files rather than directly editing the source code.
