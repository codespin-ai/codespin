#!/usr/bin/env node

import yargs from "yargs";
import { generate } from "./commands/generate.js";
import { init } from "./commands/init.js";
import { getPackageVersion } from "./getPackageVersion.js";
import { isGitRepo } from "./git/isGitRepo.js";

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
      "generate <promptFile>",
      "Generate a source code from a prompt",
      (yargs) =>
        yargs
          .positional("promptFile", {
            describe: "Name of the prompt file.",
            demandOption: true,
            type: "string",
          })
          .option("write", {
            type: "boolean",
            default: false,
            describe: "Write generated code to source file.",
          })
          .option("include", {
            describe:
              "List of files to include in the prompt. This provides additional context during code generation.",
            type: "array",
            string: true,
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
            describe: "Path to the template file.",
          })
          .option("exec", {
            type: "string",
            describe: "Execute a command for each generated file.",
          })
          .option("debug", {
            type: "boolean",
            describe:
              "Enable debug mode. This prints a debug messages for every step.",
          })
          .option("config", {
            type: "string",
            describe: "Path to config file.",
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
    .command("version", "Display the current version", {}, () => {
      console.log(getPackageVersion());
    })
    .showHelpOnFail(false)
    .help("help")
    .alias("h", "help").argv;
}

main();
