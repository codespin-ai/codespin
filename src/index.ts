#!/usr/bin/env node

import yargs, { Arguments } from "yargs";
import { init } from "./commands/init.js";
import { generate } from "./commands/generate.js";
import { scaffold } from "./commands/scaffold.js";
import { CommandResult } from "./commands/CommandResult.js";
import { isGitRepo } from "./git/isGitRepo.js";
import { getPackageVersion } from "./getPackageVersion.js";

// Convert yargs arguments to Args type for init command
function extractInitArgs(argv: Arguments) {
  return {
    force: argv.force as boolean | undefined,
  };
}

// Convert yargs arguments to GenerateArgs type for generate command
function extractGenerateArgs(argv: Arguments) {
  return {
    promptFile: argv.filename as string,
    api: argv.api as string,
    model: argv.model as string,
    maxTokens: argv.maxTokens as number,
    update: argv.update as boolean,
    writePrompt: argv.writePrompt as string,
    template: argv.template as string,
    debug: argv.debug as boolean,
    exec: argv.exec as string,
    config: argv.config as string,
  };
}

// Convert yargs arguments to ScaffoldArgs type for generate command
function extractScaffoldArgs(argv: Arguments) {
  return {
    scaffoldPromptFile: argv.filename as string,
    api: argv.api as string,
    model: argv.model as string,
    maxTokens: argv.maxTokens as number,
    update: argv.update as boolean,
    writePrompt: argv.writePrompt as string,
    template: argv.template as string,
    debug: argv.debug as boolean,
    fileList: argv.fileList as string,
    exec: argv.exec as string,
    config: argv.config as string,
  };
}

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
      (yargs) => {
        yargs.option("language", {
          type: "string",
          demandOption: false,
          describe: "Programming language for the project",
        });
      },
      async (argv) => {
        const args = extractInitArgs(argv);
        const result = await init(args);
        printResult(result);
      }
    )
    .command(
      "generate <filename>",
      "Generate a source code from a prompt",
      (yargs) => {
        yargs
          .positional("filename", {
            describe: "Name of the prompt file",
            type: "string",
          })
          .option("update", {
            type: "boolean",
            default: false,
            describe: "Update source file with generated code",
          })
          .option("writePrompt", {
            type: "string",
            describe: "Write the prompt out to the specified path",
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
          });
      },
      async (argv) => {
        const args = extractGenerateArgs(argv);
        const result = await generate(args);
        printResult(result);
      }
    )
    .command(
      "scaffold <filename>",
      "Scaffold a project or module",
      (yargs) => {
        yargs
          .positional("filename", {
            describe: "Name of the scaffold prompt file",
            type: "string",
          })
          .option("writePrompt", {
            type: "string",
            describe: "Write the prompt out to the specified path",
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
            describe: "Path to the template directory",
          })
          .option("fileList", {
            type: "string",
            describe: "A JSON response containing files to generate",
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
          });
      },
      async (argv) => {
        const args = extractScaffoldArgs(argv);
        const result = await scaffold(args);
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
