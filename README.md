# codespin-cli

CodeSpin.AI Code Generation Tools. Open Source and MIT-licensed.

📣 CodeSpin has a [Discord Channel](https://discord.gg/mGRbwE7n) you can join.

## Installation

First, install Node.JS. Visit [https://nodejs.org/en](https://nodejs.org/en).
You need Node 18 or above.

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
codespin gen help # or codespin generate help
```

Also, check the [Discord Channel](https://discord.gg/mGRbwE7n).

## Usage

Set the `OPENAI_API_KEY` environment variable. If you don't have an account, register at [https://platform.openai.com/signup](https://platform.openai.com/signup).

If you don't want to get an `OPENAI_API_KEY`, you may also [use it with ChatGPT](#using-with-chatgpt).

Ready to try? The following command generates code for a Hello World app and displays it:

```sh
codespin gen --prompt 'Make a python program (in main.py) that prints Hello, World!'
```

To save the generated code to a file, use the `--write` (or `-w`) option:

```sh
codespin gen --prompt 'Make a python program (in main.py) that prints Hello, World!' --write
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
You may also use the short alias `codespin gen`. The following examples will use `codespin gen`.

#### Generating a single code file

First, create a "prompt file" to describe the source code. If you're defining code for a single file, name the prompt file as "sourcefile.ext.prompt.md". Each source code file you wish to generate should have its prompt file.

For instance, here's an example `main.py.prompt.md` used to generate `main.py`:

```
Make a python program (in main.py) that prints Hello, World!
Include a shebang to make it directly executable.
```

Then, generate the code:

```sh
codespin gen main.py.prompt.md --write
```

This will create a `main.py` file that prints "Hello, World!".

#### Generating multiple files

While generating multiple files (such as when scaffolding a project), start with a filename like `[something].prompt.md` eg: `myapp.prompt.md`.

Here's an example of how you'd scaffold a new Node.JS blog app:

`blogapp.prompt.md`:

```
Create a Node.JS application for a blog.
Split the code into multiple files for maintainability.
Use ExpressJS. Use Postgres for the database.
Place database code in a different file (a database layer).
```

💡 It is necessary to NOT use the `[filename.ext].prompt.md` convention because that causes codespin to generate code for a single file.

#### Include External Files and Declarations

For the code generator to better understand the context, you can pass the relevant external files (such as dependencies) with the `--include` (or `-i`) option.

For example, if `main.py` depends on `dep1.py` and `dep2.py`:

```sh
codespin gen main.py.prompt.md -i dep1.py -i dep2.py --write
```

But in some cases, including entire files (with `--include` or `-i`) will result in larger context sizes. To reduce the size of the context, you can send just the declarations/signatures found in a file with the `--declare` (or `-d`) option.

```sh
codespin gen main.py.prompt.md -d dep1.py -d dep2.py --write
```

But do note that creating declarations will require a call to the LLM. Declarations are then cached until the file changes.

With both `--include` and `--declare`, you can specify wildcards. The following will include all ".py" files:

```sh
codespin gen main.py.prompt.md -d "*.py" --write
```

#### Frontmatter in Prompt Files

You can also include front-matter to define the `--include`, `--declare`, `--template`, `--parser`, `--api`, `--model`, and `--max-tokens` parameters:

```markdown
---
model: gpt-3.5-turbo-16k
maxTokens: 8000
---

Generate a Python CLI script named index.py that accepts arguments and prints their sum.
```

#### In-place Includes in Prompt Files

It's quite a common requirement to mention a standard set of rules in all prompt files; such as mentioning coding convetions for a project. The include directive (`codespin:include:<path>`) let's you write common rules in a file, and include them in prompts as needed.

For example, if you had a `./codegen/conventions.txt` file:

```
- Use snake_case for variables
- Generate extensive comments
```

You can include it like this:

```
Generate a Python CLI script named index.py that accepts arguments and prints their sum.

codespin:include:codegen/conventions.txt
```

#### Executing code in Prompt Files

The exec directive executes a command and replaces the line with the output of the command.
This powerful techique can be used to make your templates smarter.

For example, if you want to include the diff of a file in your prompt, you could do this:

```
codespin:exec:git diff HEAD~1 HEAD -- main.py
```

#### Regenerating code

The easiest way to regenerate code (for a single file) is by changing the original prompt to mention just the required modifications.

For example, if you originally had this in `calculate_area.py.prompt.md`:

```
Write a function named calculate_area(l, b) which returns l*b.
```

You could rewrite it as:

```
Change the function calculate_area to take an additional parameter shape_type (as the first param), and return the correct caculations. The subsequent parameters are dimensions of the shape, and there could be one (for a circle) or more dimensions (for a multi-sided shape).
```

And then run the gen command:

```sh
codespin gen calculate_area.py.prompt.md -w
```

But there's an advanced technique you could use which uses prompt diffs. If you supply the `--diff` argument, the prompt will include the diff of the original prompt and the new prompt which can help the LLM make better decisions. When using the `--diff` argument, you must retain the original prompt text and structure but make changes to the spec where needed.

For example, if this was the original prompt:

```
Write a function named sum() which takes two arguments.
- The arguments should be named a and b
```

You can edit it like this:

```
Write a function named sum() which takes three arguments.
- The arguments should be named x, y and z
```

Save the file, and run the gen command with the `--diff` option:

```sh
codespin gen sum.py.prompt.md --diff -w
```

💡 For effective regeneration, use a git repository and commit both the prompt and generated code files after each successful code generation. This lets the code generator inspect the differences between prompts and apply changes accurately.

#### Options for codespin gen

- `-p, --prompt <some text>`: Specify the prompt directly in the command line.
- `-t, --template <template path>`: Specify the template. If not provided, a default template is used.
- `-w, --write`: Save the generated code to a file. Defaults to 'false'.
- `--pp, --print-prompt`: Display the generated prompt without making an API call.
- `--write-prompt`: Save the generated prompt to a specified path without making an API call.
- `--api <api name>`: Specify the API service, like 'openai'. Defaults to 'openai'.
- `--model <model name>`: Specify the desired model, e.g., 'gpt-4'.
- `--max-tokens <count>`: Set the maximum tokens for the generated code.
- `-i, --include <file path>`: Specify files to include in the prompt for better context. Repeat for multiple files.
- `-e, --exec <script path>`: Execute a command for each generated file, e.g., to run a formatting tool.
- `--debug`: Enable debug mode, showing debug messages for each step.
- `-c, --config <file path>`: Specify the path to a config file.
- `--base-dir <dir path>`: Set the directory path relative to where files are generated. Defaults to the prompt file's directory.
- `--parser <path to js file>`: Use this parser to process LLM results
- `--no-parse`: Do not parse llm results. Print it as received.
- `--single`: Specify that the prompt is for a single source file.
- `-h, --help`: Display help.

## Inline Prompting

As shown earlier, you can specify the prompt directly in the command line:

```sh
codespin gen --prompt 'Create a file main.py with a function to add two numbers.'
```

Remember to use `--write` to save the generated files.

## Custom Templates

A CodeSpin Template is a JS file (an ES6 Module) exporting a default function with the following signature:

```ts
// The templating function that generates the LLM prompt.
export default function generate(args: TemplateArgs): string {
  // Return the prompt to send to the LLM.
}
```

where TemplateArgs is the following:

```ts
// Arguments to the templating function
export type TemplateArgs = {
  prompt: string;
  promptWithLineNumbers: string;
  previousPrompt: string | undefined;
  previousPromptWithLineNumbers: string | undefined;
  promptDiff: string | undefined;
  include: VersionedFileInfo[];
  declare: BasicFileInfo[];
  sourceFile: VersionedFileInfo | undefined;
  targetFilePath: string | undefined;
  single: boolean | undefined;
  promptSettings: unknown;
  templateArgs: string[] | undefined;
};

export type BasicFileInfo = {
  path: string;
  contents: string;
};

export type VersionedFileInfo = {
  path: string;
  contents: string;
  contentsWithLineNumbers: string;
  previousContents: string | undefined;
  previousContentsWithLineNumbers: string | undefined;
  hasDifferences: boolean;
};
```

When generating code, specify custom templates with the `--template` (or `-t`) option:

```sh
codespin gen main.py.prompt.md --template mypythontemplate.mjs --include main.py --write
```

💡: Your template should the extension `mjs` instead of `js`.

Once you do `codespin init`, you should be able to see example templates under the "codespin/templates" directory.

There are two ways to pass custom args to a custom template.

1. frontMatter in a prompt file goes under args.promptSettings

```markdown
---
model: gpt-3.5-turbo-16k
maxTokens: 8000
useJDK: true //custom arg
---
```

2. CLI args can be passed with the `-a` (or `--template-args`), and they'll be available in args.templateArgs as a string array.

```sh
codespin gen main.py.prompt.md \
  --template mypythontemplate.mjs \
  -a useAWS \
  -a swagger \
  --include main.py \
  --write
```

## Using with ChatGPT

While using codespin with an API key is straightforward, if you don't have one but have access to ChatGPT, there are alternatives.

Use the `--pp` (or `--print-prompt`) option to display the final LLM prompt, or `--write-prompt` to save it to a file:

```sh
# Display on screen
codespin gen something.py.prompt.md --print-prompt

# Or save to a file
codespin gen something.py.prompt.md --write-prompt /path/to/file.txt
```

Copy and paste the prompt into ChatGPT. Save ChatGPT's response in a file, e.g., `gptresponse.txt`.

Then, use the `codespin parse` command to parse the content:

```sh
# As always, use --write for writing to the disk
codespin parse gptresponse.txt --write
```

💡: When copying the response from ChatGPT, use the copy icon. Selecting text and copying doesn't retain formatting.

## One more thing - Piping into the LLM!

Well, prompts can include data that was piped into `codespin gen` as well. :)

In your prompt, `codespin:stdin` will refer to whatever was passed to codespin.

For example, let's pipe the output of the `ls` command into codespin:

```sh
ls | codespin gen -p $'Convert to uppercase each line in the following text \ncodespin:stdin' -t plain.mjs --no-parse
```

The above example uses the included `plain.mjs` template along with the `--no-parse` option to print the LLM's response directly to the console.
This is so handy there's shorthand for this: the `-g` option (g for Go).

```sh
# This
ls | codespin gen -p $'Convert to uppercase each line in the following text \ncodespin:stdin' -t plain.mjs --no-parse

# can be written as
ls | codespin gen -p $'Convert to uppercase each line in the following text \ncodespin:stdin' -g
```

## Using Azure OpenAI API

You may use Azure's OpenAI endpoint by setting the following environment variables:
- OPENAI_COMPLETIONS_ENDPOINT: Set this to your completions endpoint
- OPENAI_AUTH_TYPE: Set this to "API_KEY"

```sh
export OPENAI_COMPLETIONS_ENDPOINT='https://YOUR_RESOURCE_NAME.openai.azure.com/openai/deployments/YOUR_DEPLOYMENT_NAME/completions'
```

## Contributing

If you find more effective templates or prompts, please open a Pull Request.
