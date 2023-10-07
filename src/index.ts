#!/usr/bin/env node

import yargs, { Arguments } from "yargs";
import { init } from "./commands/init.js";
import { GenerateArgs, generate } from "./commands/generate.js";
import { CommandResult } from "./commands/CommandResult.js";
import { isGitRepo } from "./git/isGitRepo.js";
import { getPackageVersion } from "./getPackageVersion.js";

function printResult(result: CommandResult) {
  if (result.success) {
    if (result.message) {
      console.log(result.message);
    }
  } else {
    if (result.message) {
      console.error(result.message);
    }
  }
}

async function main() {
  if (!(await isGitRepo())) {
    console.error("codespin must be run in a git repo.");
  }

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
        const result = await init(argv);
        printResult(result);
      }
    )
    .command(
      "generate <filename>",
      "Generate a source code from a prompt",
      (yargs) =>
        yargs
          .positional("promptFile", {
            describe: "Name of the prompt file",
            demandOption: true,
            type: "string",
          })
          .option("write", {
            type: "boolean",
            default: false,
            describe: "Write generated code to source file",
          })
          .option("include", {
            describe: "List of files",
            type: "array",
            string: true,
          })
          .option("writePrompt", {
            type: "string",
            describe: "Write the prompt out to the specified path",
          })
          .option("modify", {
            type: "boolean",
            describe: "Modify a source file",
          })
          .option("api", {
            type: "string",
            default: "openai",
            describe: "API service to use",
          })
          .option("model", {
            type: "string",
            describe: "Model name to use",
          })
          .option("maxTokens", {
            type: "number",
            describe: "Maximum number of tokens for generated code",
          })
          .option("template", {
            type: "string",
            demandOption: true,
            describe: "Path to the template directory",
          })
          .option("exec", {
            type: "string",
            describe: "Execute a command for each generated file",
          })
          .option("debug", {
            type: "boolean",
            describe: "Enable debug mode",
          })
          .option("config", {
            type: "string",
            describe: "Path to config file",
          }),
      async (argv) => {
        const result = await generate(argv);
        printResult(result);
      }
    )
    .command("version", "Display the current version", {}, () => {
      console.log(getPackageVersion());
    })
    .help("help")
    .alias("h", "help").argv;
}

main();
