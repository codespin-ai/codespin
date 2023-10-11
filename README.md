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

First, let's create a "prompt file" to describe source code. In the following example, we're calling it `main.py.prompt.md`:

```
Make a python program (in main.py) that prints Hello, World!
Add a shebang, so that it's directly executable.
```

Now generate the code with:

```sh
codespin generate main.py.prompt.md --write
```

If you're describing code for single file, you need to name the prompt file in the format "source.ext.prompt.md",

you need to have a prompt file for each source code file you want to generate.
A good name for a prompt file would be a "prompt.md" suffix attached to the name of the source code file you want to generate.

For example, a prompt file describing main.py could be called "main.py.prompt.md".

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

To regenerate a file you must first modify the contents of a prompt file, and then call `codespin generate` passing relevant existing source code using the `--include` (alias `-i`) parameter.
The included files help with better context understanding by the code generator.

For example, if main.py (which is automatically included if you use the `[source.ext].prompt.md` naming convention) depends on dep1.py and dep2.py:

```sh
codespin generate main.py.prompt.md -i dep1.py -i dep2.py --write
```

💡 For regeneration to be truly effective, you need to be using a git repository and keep committing both the prompt and generated code files every time you make successful edits using code generation.
This allows the code generator to inspect the delta between prompts (working copy and HEAD) and apply the necessary changes accurately.

#### Options for codespin generate

- `-p, --prompt`: Specify the prompt directly on the command line.
- `-t, --template`: Specify the template to use. If unspecified a built-in default template is used.
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

A prompt file (usually with a `.prompt.md` extension) contains instructions about what the source code file should contain.

I prompt file (in this example, main.py.prompt.md) would look like this:

```markdown
Generate a Python CLI script named index.py that accepts a set of arguments and prints their sum.
```

You can optionally include front-matter to define the `--include`, `--template`, `--api`, `--model` and `--max-tokens` parameters.

Like this:

```markdown
---
model: gpt-3.5-turbo-16k
maxTokens: 8000
---

Generate a Python CLI script named index.py that accepts a set of arguments and prints their sum.
```

## Immediate Mode Prompting

As you've seen previously, you can include the prompt directly on the command line.

```sh
codespin generate --prompt 'Create a file main.py which contains a function to add two numbers.'
```

As always, you must use `--write` (or `-w`) to write out code generated files.

## Custom Templates

A CodeSpin Template is a file containing a JS function with the following signature:

```js
// type of args to the template
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

// The templating function that generates the LLM prompt.
export default function generate(args: TemplateArgs) {
  if (args.promptDiff) {
    return withPromptDiff(args);
  } else {
    return withoutPromptDiff(args);
  }
}
```

While generating code, you must specify custom templates with the `--template` (or `-t`) argument.

```sh
codespin generate main.py.prompt.md --template mypythontemplate.js --include main.py --write
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
# As always, use --write for writing to the disk
codespin parse gptresponse.txt --write
```

💡: When copying the response from ChatGPT, use the copy icon. Selecting text and copying doesn't retain formatting.

## Contributing

If you find more effective templates or prompts, please open a Pull Request.
