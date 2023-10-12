Here's the revised README.md:

---

# codespin-cli

CodeSpin.AI Code Generation Tools. Open Source and MIT-licensed.

## Installation

First, install Node.JS. Visit [https://nodejs.org/en](https://nodejs.org/en).

Then, install codespin using:

```sh
npm install -g codespin
```

## Getting Help

To list all available commands:

```sh
codespin help
```

For specific help on a command, type `codespin [command] help`.

For instance:

```sh
codespin generate help
```

## Usage

Set the `OPENAI_API_KEY` environment variable. If you don't have an account, register at [https://platform.openai.com/signup](https://platform.openai.com/signup).

If you don't want to get an `OPENAI_API_KEY`, you may also [use it with ChatGPT](#using-with-chatgpt).

Ready to try? The following command generates code for a Hello World app and displays it:

```sh
codespin generate --prompt 'Make a python program (in main.py) that prints Hello, World!'
```

To save the generated code to a file, use the `--write` (or `-w`) option:

```sh
codespin generate --prompt 'Make a python program (in main.py) that prints Hello, World!' --write
```

Simple, right? But that's just the beginning.

### codespin init

For advanced use, treat prompts as integral parts of your project. Save prompts in files and commit them to git, just like source code.

Initialize your project directory with:

```sh
codespin init
```

This command creates a `codespin.json` file with some defaults, and creates a codespin directory containing some default templates.
You may edit these templates are required, but the default template is fairly good.

### codespin generate

Use the `codespin generate` command to produce source code.
You may also use the short alias `codespin gen`.

#### Generating a single code file

First, create a "prompt file" to describe the source code. If you're defining code for a single file, name the prompt file as "sourcefile.ext.prompt.md". Each source code file you wish to generate should have its prompt file.

For instance, here's an example `main.py.prompt.md` used to generate `main.py`:

```
Make a python program (in main.py) that prints Hello, World!
Include a shebang to make it directly executable.
```

Then, generate the code:

```sh
codespin generate main.py.prompt.md --write
```

This will create a `main.py` file that prints "Hello, World!".

#### Generating multiple files

While generating multiple files, it is not necessary to name the prompt file with [source.ext] prefix.

Here's an example of how you'd scaffold a new Node.JS app

`blogapp.prompt.md`:

```
Create a Node.JS application for a blog.
Split the code into multiple files for maintainability.
Use ExpressJS. Use Postgres for the database.
Place database code in a different file (a database layer).
```

#### Frontmatter in Prompt Files

You can also include front-matter to define the `--include`, `--template`, `--api`, `--model`, and `--max-tokens` parameters:

```markdown
---
model: gpt-3.5-turbo-16k
maxTokens: 8000
---

Generate a Python CLI script named index.py that accepts arguments and prints their sum.
```

#### Regenerating code

To regenerate a file, modify the prompt file's contents and then use `codespin generate`, passing the relevant existing source code (such as dependencies) with the `--include` (or `-i`) option. The included files provide better context for the code generator.

For example, if `main.py` depends on `dep1.py` and `dep2.py`:

```sh
codespin generate main.py.prompt.md -i dep1.py -i dep2.py --write
```

💡 For effective regeneration, use a git repository and commit both the prompt and generated code files after each successful code generation. This lets the code generator inspect the differences between prompts and apply changes accurately.

#### Options for codespin generate

- `-p, --prompt`: Specify the prompt directly in the command line.
- `-t, --template`: Specify the template. If not provided, a default template is used.
- `-w, --write`: Save the generated code to a file. Defaults to 'false'.
- `--print-prompt`: Display the generated prompt without making an API call.
- `--write-prompt`: Save the generated prompt to a specified path without making an API call.
- `--api`: Specify the API service, like 'openai'. Defaults to 'openai'.
- `--model`: Specify the desired model, e.g., 'gpt-4'.
- `--max-tokens`: Set the maximum tokens for the generated code.
- `-i, --include`: Specify files to include in the prompt for better context. Repeat for multiple files.
- `-e, --exec`: Execute a command for each generated file, e.g., to run a formatting tool.
- `--debug`: Enable debug mode, showing debug messages for each step.
- `-c, --config`: Specify the path to a config file.
- `--base-dir`: Set the directory path relative to where files are generated. Defaults to the prompt file's directory.
- `-h, --help`: Display help.

## Immediate Mode Prompting

As shown earlier, you can specify the prompt directly in the command line:

```sh
codespin generate --prompt 'Create a file main.py with a function to add two numbers.'
```

Remember to use `--write` to save the generated files.

## Custom Templates

A CodeSpin Template is a JS file (an ES6 Module) exporting a default function with the following signature:

```js
// The templating function that generates the LLM prompt.
export default function generate(args: TemplateArgs): string {
  // Return the prompt to send to the LLM.
}

// Arguments to the templating function
type TemplateArgs = {
  prompt: string,
  promptWithLineNumbers: string,
  previousPrompt: string | undefined,
  previousPromptWithLineNumbers: string | undefined,
  promptDiff: string | undefined,
  files: FileContent[],
  sourceFile: FileContent | undefined,
  multi: boolean | undefined,
};

type FileContent = {
  name: string,
  contents: string,
  contentsWithLineNumbers: string,
  previousContents: string | undefined,
  previousContentsWithLineNumbers: string | undefined,
  hasDifferences: boolean,
};
```

When generating code, specify custom templates with the `--template` (or `-t`) option:

```sh
codespin generate main.py.prompt.md --template mypythontemplate.mjs --include main.py --write
```

💡: Your template should the extension `mjs` instead of `js`.

Once you do `codespin init`, you should be able to see an example template under the "codespin/templates" directory.

## Using with ChatGPT

While using codespin with an API key is straightforward, if you don't have one but have access to ChatGPT, there are alternatives.

Use the `--print-prompt` option to display the final LLM prompt, or `--write-prompt` to save it to a file:

```sh
# Display on screen
codespin generate something.py.prompt.md --print-prompt

# Or save to a file
codespin generate something.py.prompt.md --write-prompt /path/to/file.txt
```

Copy and paste the prompt into ChatGPT. Save ChatGPT's response in a file, e.g., `gptresponse.txt`.

Then, use the `codespin parse` command to parse the content:

```sh
# As always, use --write for writing to the disk
codespin parse gptresponse.txt --write
```

💡: When copying the response from ChatGPT, use the copy icon. Selecting text and copying doesn't retain formatting.

## Contributing

If you find more effective templates or prompts, please open a Pull Request.
