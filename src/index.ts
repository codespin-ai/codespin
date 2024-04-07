#!/usr/bin/env node

import yargs from "yargs";
import { deps } from "./commands/deps.js";
import { generate } from "./commands/generate.js";
import { init } from "./commands/init.js";
import { parse } from "./commands/parse.js";
import { writeToConsole } from "./console.js";
import { getPackageVersion } from "./getPackageVersion.js";

async function main() {
  yargs(process.argv.slice(2))
    .command(
      "init",
      "Initialize a codespin project",
      (yargs) =>
        yargs.option("force", {
          type: "boolean",
          demandOption: false,
          describe: "Force overwrite the codespin.json config file",
        }),
      async (argv) => {
        await init(argv, { workingDir: process.cwd() });
      }
    )
    .command(
      ["generate [promptFile]", "gen"],
      "Generate a source code from a prompt",
      (yargs) =>
        yargs
          .positional("promptFile", {
            describe: "Name of the prompt file.",
            type: "string",
          })
          .option("prompt", {
            type: "string",
            alias: "p",
            describe: "Specify the prompt directly on the command line.",
          })
          .option("out", {
            type: "string",
            alias: "o",
            describe: "Specify the output file name to generate.",
          })
          .option("write", {
            type: "boolean",
            default: false,
            alias: "w",
            describe: "Write generated code to source file(s).",
          })
          .option("include", {
            type: "array",
            alias: "i",
            describe:
              "List of files to include in the prompt. This provides additional context during code generation.",
            string: true,
          })
          .option("spec", {
            type: "string",
            describe: "A spec (template) to apply to the prompt.",
          })
          .option("declare", {
            type: "array",
            alias: "d",
            describe:
              "List of files containing declarations (class definitions, method signatures etc) to include. This provides additional context during code generation.",
            string: true,
          })
          .option("exclude", {
            type: "array",
            describe:
              "(Advanced) List of files to exclude in the prompt. Used to override automatically included source files.",
            string: true,
          })
          .option("printPrompt", {
            type: "boolean",
            alias: "pp",
            describe:
              "Print the generated prompt to the screen. Does not call the API.",
          })
          .option("writePrompt", {
            type: "string",
            describe:
              "Write the generated prompt out to the specified path. Does not call the API.",
          })
          .option("api", {
            type: "string",
            describe:
              "API to use, such as 'openai'. Only 'openai' is supported now.",
          })
          .option("model", {
            type: "string",
            describe: "Name of the model to use. Such as 'gpt-4'.",
          })
          .option("maxTokens", {
            type: "number",
            describe: "Maximum number of tokens for generated code.",
          })
          .option("template", {
            type: "string",
            alias: "t",
            describe: "Path to the template file.",
          })
          .option("templateArgs", {
            type: "array",
            alias: "a",
            describe:
              "An argument passed to a custom template. Can pass many by repeating '-a'.",
            string: true,
          })
          .option("exec", {
            type: "string",
            alias: "e",
            describe: "Execute a command for each generated file.",
          })
          .option("debug", {
            type: "boolean",
            describe:
              "Enable debug mode. This prints a debug messages for every step.",
          })
          .option("config", {
            type: "string",
            alias: "c",
            describe: "Path to a config directory (.codespin).",
          })
          .option("outDir", {
            type: "string",
            describe:
              "Path to directory relative to which files are generated. Defaults to the directory of the prompt file.",
          })
          .option("parser", {
            type: "string",
            describe: "Use a custom script to parse llm response.",
          })
          .option("parse", {
            type: "boolean",
            describe:
              "Whether the LLM response needs to be processed. Defaults to true.",
          })
          .option("maxDeclare", {
            type: "number",
            describe:
              "The maximum number of declaration files allowed. Defaults to 10.",
          })
          .option("go", {
            type: "boolean",
            alias: "g",
            describe:
              "Shorthand which sets template to plain.mjs and parse to false.",
          }),
      async (argv) => {
        await generate(argv, { workingDir: process.cwd() });
      }
    )
    .command(
      "parse <file>",
      "Extract files from an LLM response stored in a text file",
      (yargs) =>
        yargs
          .positional("file", {
            describe: "Path to the file.",
            demandOption: true,
            type: "string",
          })
          .option("write", {
            type: "boolean",
            default: false,
            alias: "w",
            describe: "Write generated code to source file(s).",
          })
          .option("exec", {
            type: "string",
            alias: "e",
            describe: "Execute a command for each generated file.",
          })
          .option("config", {
            type: "string",
            alias: "c",
            describe: "Path to a config directory (.codespin).",
          })
          .option("outDir", {
            type: "string",
            describe:
              "Path to directory relative to which files are generated. Defaults to the directory of the prompt file.",
          }),
      async (argv) => {
        await parse(argv, { workingDir: process.cwd() });
      }
    )
    .command(
      "deps <file>",
      "Print the dependencies of a file as JSON",
      (yargs) =>
        yargs
          .positional("file", {
            describe: "Path to the source file.",
            demandOption: true,
            type: "string",
          })
          .option("api", {
            type: "string",
            default: "openai",
            describe:
              "API to use, such as 'openai'. Only 'openai' is supported now.",
          })
          .option("model", {
            type: "string",
            describe: "Name of the model to use. Such as 'gpt-4'.",
          })
          .option("maxTokens", {
            type: "number",
            describe: "Maximum number of tokens for generated code.",
          })
          .option("debug", {
            type: "boolean",
            describe:
              "Enable debug mode. This prints a debug messages for every step.",
          })
          .option("config", {
            type: "string",
            alias: "c",
            describe: "Path to a config directory (.codespin).",
          }),
      async (argv) => {
        const allDeps = await deps(argv, {
          workingDir: process.cwd(),
        });
        for (const item of allDeps) {
          writeToConsole(
            `${item.dependency} -> ${item.filePath} (${
              item.isProjectFile ? "local" : "external"
            })`
          );
        }
      }
    )
    .command("version", "Display the current version", {}, () => {
      writeToConsole(getPackageVersion());
    })
    .showHelpOnFail(false)
    .completion()
    .help("help")
    .alias("h", "help").argv;
}

main();
