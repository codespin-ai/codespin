# codespin

CodeSpin.AI Code Generation Tools. Open Source and MIT-licensed.

## Installation

First, install Node.JS. Visit [https://nodejs.org/en](https://nodejs.org/en).
You need Node 18 or above.

Then, install codespin using:

```sh
npm install -g codespin
```

💡 The easiest way to use codespin is via the CodeSpin.AI vscode plugin.

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

Set the `OPENAI_API_KEY` (AND/OR `ANTHROPIC_API_KEY`) environment variable. If you don't have an OpenAI account, register at [https://platform.openai.com/signup](https://platform.openai.com/signup). For Anthropic, register at [https://www.anthropic.com](https://www.anthropic.com).

If you don't want to get an API key, you may also [use it with ChatGPT](#using-with-chatgpt).

Ready to try? The following command generates code for a Hello World app and displays it:

```sh
codespin gen --prompt 'Make a python program (in main.py) that prints Hello, World!'
```

To save the generated code to a file, use the `--write` (or `-w`) option:

```sh
codespin gen --prompt 'Make a python program (in main.py) that prints Hello, World!' --write
```

Simple, right? That's just the beginning.

### codespin init

Most features of codespin are available only once you initialize your project like this:

```sh
codespin init
```

This command creates a .codespin directory containing some default templates and configuration files.
You may edit these templates as required, but the default template is fairly good.

In addition, it is also recommended to do a global init, which stores the config files under $HOME/.codespin.
The global init also creates openai.json and anthropic.json under $HOME/.codespin where you can save your api keys.

```sh
codespin init --global
```

💡 It is recommeded to store the api keys globally, to avoid accidentally committing the api keys to git.

### codespin generate

Use the `codespin generate` command to produce source code.
You may also use the short alias `codespin gen`. The following examples will use `codespin gen`.

#### Generating a single code file

First, create a "prompt file" to describe the source code. A prompt file is simply a markdown file containing instructions on how to generate the code.

Let's start with something simple.

Create a file called `main.py.md` as follows:

```markdown
out: main.py
includes:

- main.py

Print Hello, World!  
Include a shebang to make it directly executable.
```

Then generate the code by calling codespin:

```sh
codespin gen main.py.md --write
```

Alternatively, you could specify the file paths in CLI with `--out` (or `-o` shorthand) and `--include` (or `-o`) instead of using front-matter.

```sh
codespin gen main.py.md --out main.py --include main.py --write
```

#### Generating multiple files

This is just as simple. Here's an example of how you'd scaffold a new Node.JS blog app:

`blogapp.md`:

```
Create a Node.JS application for a blog.
Split the code into multiple files for maintainability.
Use ExpressJS. Use Postgres for the database.
Place database code in a different file (a database layer).
```

#### Include External Files

For the code generator to better understand the context, you must pass the relevant external files (such as dependencies) with the `--include` (or `-i`) option.

For example, if `main.py` depends on `dep1.py` and `dep2.py`:

```sh
codespin gen main.py.md --out main.py --include main.py --include dep1.py --include dep2.py --write
```

With `--include` you can specify wildcards. The following will include all ".py" files:

```sh
codespin gen main.py.md --out main.py -d "*.py" --write
```

You can also define the `--include`, `--template`, `--parser`, `--model`, and `--max-tokens` parameters in front-matter like this:

```markdown
---
model: gpt-4o
maxTokens: 8000
out: main.py
includes:
  - dep1.py
  - dep2.py
---

Generate a Python CLI script named index.py that accepts arguments, calls calculate() function in dep1.py and prints their sum with print() in dep2.py.
```

#### In-place Includes in Prompt Files

It's quite a common requirement to mention a standard set of rules in all prompt files; such as mentioning coding conventions for a project. The include directive (`codespin:include:<path>`) let's you write common rules in a file, and include them in prompts as needed.

For example, if you had a `conventions.txt` file:

```
- Use snake_case for variables
- Generate extensive comments
```

You can include it like this:

```
Generate a Python CLI script named index.py that accepts arguments and prints their sum.

codespin:include:/conventions.txt
```

#### Spec Files

Spec files are another way to handle coding conventions and other instructions.

A "spec" is a template file containing a placeholder "{prompt}". The placeholder will be replaced by the prompt supplied (via the prompt file, or the --prompt argument).

For example, if you have the following spec called `myrules.txt`:

```
{prompt}

Rules:
- Use snake_case for variables
- Generate extensive comments
```

You can include it like this:

```sh
codespin gen main.py.md --spec myrules.txt
```

#### Executing code in Prompt Files

The exec directive executes a command and replaces the line with the output of the command.
This powerful technique can be used to make your templates smarter.

For example, if you want to include the diff of a file in your prompt, you could do this:

```
codespin:exec:git diff HEAD~1 HEAD -- main.py
```

#### Regenerating code

The easiest way to regenerate code (for a single file) is by changing the original prompt to mention just the required modifications.

For example, if you originally had this in `calculate_area.py.md`:

```markdown
Write a function named calculate_area(l, b) which returns l\*b.
```

You could rewrite it as:

```markdown
Change the function calculate_area to take an additional parameter shape_type (as the first param), and return the correct calculations. The subsequent parameters are dimensions of the shape, and there could be one (for a circle) or more dimensions (for a multi-sided shape).
```

And run the gen command as usual:

```sh
codespin gen calculate_area.py.md --out calculate_area.py --include calculate_area.py -w
```

Sometimes you want to ignore the latest modifications while generating code, and use previously committed file contents.
The include parameter (both as a CLI arg and in frontmatter) understands git revisions.

You can do that by specifying the version like this.

```sh
codespin gen calculate_area.py.md --out calculate_area.py --include HEAD:calculate_area.py -w
```

You can include diffs as well:

```sh
# Diff a file between two versions
codespin gen main.py.md --out main.py --include HEAD~2+HEAD:main.py -w
```

There are some convenient shortcuts.

```sh
# include HEAD:main.py
codespin gen main.py.md --out main.py --include :main.py -w

# diff between HEAD and Working Copy
codespin gen main.py.md --out main.py --include +:main.py -w

# diff between HEAD~2 and Working Copy
codespin gen main.py.md --out main.py --include HEAD~2+:main.py -w
```

This command above will ignore the latest edits to main.py and use content from git's HEAD.

#### Options for codespin gen

- `-c, --config <file path>`: Path to a config directory (.codespin).
- `-e, --exec <script path>`: Execute a command for each generated file.
- `-i, --include <file path>`: List of files to include in the prompt for additional context. Supports version specifiers and wildcards.
- `-o, --out <output file path>`: Specify the output file name to generate.
- `-p, --prompt <some text>`: Specify the prompt directly on the command line.
- `-t, --template <template name or path>`: Path to the template file.
- `-w, --write`: Write generated code to source file(s).
- `--debug`: Enable debug mode. Prints debug messages for every step.
- `--exclude <file path>`: List of files to exclude from the prompt. Used to override automatically included source files.
- `--maxTokens <number>`: Maximum number of tokens for generated code.
- `--model <model name>`: Name of the model to use, such as 'gpt-4o' or 'claude-3-5-haiku-latest'.
- `--multi <number>`: Maximum number of API calls to make if the output exceeds token limit.
- `--outDir <dir path>`: Path to directory relative to which files are generated. Defaults to the directory of the prompt file.
- `--parse`: Whether the LLM response needs to be processed. Defaults to true. Use `--no-parse` to disable parsing.
- `--parser <path to js file>`: Use a custom script to parse LLM response.
- `--pp, --printPrompt`: Print the generated prompt to the screen. Does not call the API.
- `--spec <spec file>`: Specify a spec (prompt template) file.
- `-a, --templateArgs <argument>`: An argument passed to a custom template. Can pass multiple by repeating `-a`.
- `--writePrompt <file>`: Write the generated prompt out to the specified path. Does not call the API.
- `--maxi, --maxInput <bytes>`: Maximum number of input bytes to send to the API.
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
export default async function generate(
  args: TemplateArgs,
  config: CodeSpinConfig
): Promise<TemplateResult> {
  // Return the prompt to send to the LLM.
}
```

where TemplateResult and TemplateArgs are defined as:

```ts
// Output of the template
export type TemplateResult = {
  // The generated prompt
  prompt: string;

  // Defaults to "file-block", and that's the only available option.
  responseParser?: "file-block";
};

// Arguments to the templating function
export type TemplateArgs = {
  prompt: string;
  promptWithLineNumbers: string;
  includes: VersionedFileInfo[];
  generatedFiles: SourceFile[];
  outPath: string | undefined;
  promptSettings: unknown;
  customArgs: string[] | undefined;
  workingDir: string;
  debug: boolean | undefined;
};

export type SourceFile = {
  path: string;
  content: string;
};

export type VersionedFileInfo =
  | {
      path: string;
      type: "content";
      content: string;
      version: string;
    }
  | {
      path: string;
      type: "diff";
      diff: string;
      version1: string | undefined;
      version2: string | undefined;
    };
```

When generating code, specify custom templates with the `--template` (or `-t`) option:

```sh
codespin gen main.py.md --out main.py --template mypythontemplate.mjs --include main.py -w
```

💡 Your template should have the extension `mjs` instead of `js`.

Once you do `codespin init`, you should be able to see example templates under the "codespin/templates" directory.

There are two ways to pass custom args to a custom template:

1. frontMatter in a prompt file goes under `args.promptSettings`

```markdown
---
model: gpt-4o
maxTokens: 8000
useJDK: true //custom arg
out: main.py
---
```

2. CLI args can be passed to the template with the `-a` (or `--template-args`) option, and they'll be available in `args.customArgs` as a string array.

```sh
codespin gen main.py.md \
  --template mypythontemplate.mjs \
  -a useAWS \
  -a swagger \
  --out main.py \
  --include main.py \
  --write
```

## Using with ChatGPT

While using codespin with an API key is straightforward, if you don't have one but have access to ChatGPT, there are alternatives.

Use the `--pp` (or `--print-prompt`) option to display the final LLM prompt, or `--write-prompt` to save it to a file:

```sh
# Display on screen
codespin gen something.py.md --print-prompt

# Or save to a file
codespin gen something.py.md --write-prompt /path/to/file.txt
```

Copy and paste the prompt into ChatGPT. Save ChatGPT's response in a file, e.g., `gptresponse.txt`.

Then, use the `codespin parse` command to parse the content:

```sh
# As always, use --write for writing to the disk
codespin parse gptresponse.txt --write
```

💡 When copying the response from ChatGPT, use the copy icon. Selecting text and copying doesn't retain formatting.

## One more thing - Piping into the LLM!

You can pipe into codespin with the `codespin go` command:

```sh
ls | codespin go 'Convert to uppercase each line in the following text'
```

## Contributing

If you find more effective templates or prompts, please open a Pull Request.
