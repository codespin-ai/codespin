#!/usr/bin/env node

import yargs from "yargs";
import { generate } from "./commands/generate.js";
import { init } from "./commands/init.js";
import { parse } from "./commands/parse.js";
import { getPackageVersion } from "./getPackageVersion.js";
import { writeToConsole } from "./writeToConsole.js";

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
        await init(argv);
      }
    )
    .command(
      "generate [promptFile]",
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
          .option("write", {
            type: "boolean",
            default: false,
            alias: "w",
            describe: "Write generated code to source file.",
          })
          .option("include", {
            type: "array",
            alias: "i",
            describe:
              "List of files to include in the prompt. This provides additional context during code generation.",
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
          .option("template", {
            type: "string",
            alias: "t",
            describe: "Path to the template file.",
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
            describe: "Path to config file.",
          })
          .option("multi", {
            type: "boolean",
            describe:
              "(Advanced) Explicitly indicate that the code generation will output multiple files. This is usually auto-inferred.",
          })
          .option("baseDir", {
            type: "string",
            describe:
              "Path to directory relative to which files are generated. Defaults to the directory of the prompt file.",
          }),
      async (argv) => {
        await generate(argv);
      }
    )
    .command(
      "parse <filename>",
      "Extract files from an LLM response stored in a text file",
      (yargs) =>
        yargs
          .positional("filename", {
            describe: "Name of the prompt file.",
            demandOption: true,
            type: "string",
          })
          .option("write", {
            type: "boolean",
            default: false,
            alias: "w",
            describe: "Write generated code to source file.",
          })
          .option("exec", {
            type: "string",
            alias: "e",
            describe: "Execute a command for each generated file.",
          })
          .option("config", {
            type: "string",
            alias: "c",
            describe: "Path to config file.",
          })
          .option("baseDir", {
            type: "string",
            describe:
              "Path to directory relative to which files are generated. Defaults to the directory of the prompt file.",
          }),
      async (argv) => {
        await parse(argv);
      }
    )
    .command("version", "Display the current version", {}, () => {
      writeToConsole(getPackageVersion());
    })
    .showHelpOnFail(false)
    .help("help")
    .alias("h", "help").argv;
}

main();
