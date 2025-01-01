#!/usr/bin/env node

import yargs from "yargs";
import { dependencies } from "./commands/dependencies.js";
import { generate } from "./commands/generate/index.js";
import { init } from "./commands/init.js";
import { parse } from "./commands/parse.js";
import { getPackageVersion } from "./getPackageVersion.js";
import { setInvokeMode } from "./process/getInvokeMode.js";
import { go } from "./commands/go.js";
import { commit } from "./commands/commit.js";
import process from "node:process";

export * as settings from "./settings/index.js";
export * as commands from "./commands/index.js";
export * as fs from "./fs/index.js";
export * as git from "./git/index.js";
export * as prompts from "./prompts/index.js";
export * as templates from "./templates/index.js";
export * as languageServices from "./languageServices/index.js";
export * as process from "./process/index.js";
export * as safety from "./safety/index.js";
export * as sourceCode from "./sourceCode/index.js";
export * as specs from "./specs/index.js";
export * as templating from "./templating/index.js";
export * as text from "./text/index.js";
export * as types from "./types.js";
export * as errors from "./errors.js";
export * as console from "./console.js";

setInvokeMode("cli");

(process as any).noDeprecation = true;

export async function main() {
  yargs(process.argv.slice(2))
    .command(
      "init",
      "Initialize a codespin project",
      (yargs) =>
        yargs
          .option("force", {
            type: "boolean",
            demandOption: false,
            describe: "Force overwrite the codespin.json config file",
          })
          .option("global", {
            type: "boolean",
            alias: "g",
            describe:
              "Create codespin.json in the home directory (under $HOME/.codespin).",
          })
          .option("debug", {
            type: "boolean",
            describe:
              "Enable debug mode. This prints a debug messages for every step.",
          }),
      async (argv) => {
        await init(argv, { workingDir: process.cwd() });
        writeToConsole("Initialization completed.");
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
          .option("multi", {
            type: "number",
            alias: "m",
            describe:
              "Specify the maximum number of calls to complete the output when output token size is exceeded.",
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
          .option("maxInput", {
            alias: "maxi",
            type: "number",
            describe: "Max input length in bytes",
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
          .option("images", {
            type: "array",
            alias: "image",
            describe: "List of image files to include in the prompt",
            string: true,
          })
          .option("messages", {
            type: "string",
            alias: "msg",
            describe: "Path to a JSON file containing message history",
          }),
      async (argv) => {
        const result = await generate(argv, { workingDir: process.cwd() });

        if (result.type === "files") {
          for (const file of result.files) {
            const header = `FILE: ${file.path}`;
            writeToConsole(header);
            writeToConsole("-".repeat(header.length));
            writeToConsole(file.content);
            writeToConsole();
          }
        } else if (result.type === "saved") {
          if (result.files.length) {
            writeToConsole(
              `Generated ${result.files.map((x) => x.path).join(", ")}.`
            );
          }
        } else if (result.type === "prompt") {
          if (result.prompt) {
            writeToConsole(result.prompt);
          }
          if (result.filePath) {
            writeToConsole(`Wrote prompt to ${result.filePath}`);
          }
        } else if (result.type === "unparsed") {
          for (const text of result.responses) {
            writeToConsole(text);
          }
        }
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
          .option("responseParser", {
            type: "string",
            describe:
              "Based on the response from the LLM. Defaults to 'file-block'.",
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
          })
          .option("xmlCodeBlockElement", {
            type: "string",
            alias: "xml",
            describe:
              "Specify xmlCodeBlockElement if a custom element was used (optional).",
          })
          .option("debug", {
            type: "boolean",
            describe:
              "Enable debug mode. This prints a debug messages for every step.",
          }),
      async (argv) => {
        const result = await parse(argv, { workingDir: process.cwd() });

        if (result.type === "files") {
          for (const file of result.files) {
            const header = `FILE: ${file.path}`;
            writeToConsole(header);
            writeToConsole("-".repeat(header.length));
            writeToConsole(file.content);
            writeToConsole();
          }
        } else if (result.type === "saved") {
          if (result.files.length) {
            writeToConsole(
              `Generated ${result.files.map((x) => x.path).join(", ")}.`
            );
          }
        }
      }
    )
    .command(
      "go [prompt...]",
      "Send a plain prompt to the LLM optionally with piped stdin",
      (yargs) =>
        yargs
          .positional("prompt", {
            describe: "The prompt.",
            demandOption: false,
            array: true,
            type: "string",
          })
          .option("template", {
            type: "string",
            alias: "t",
            describe: "Path to the template file.",
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
          .option("maxInput", {
            alias: "maxi",
            type: "number",
            describe: "Max input length in bytes",
          })
          .option("config", {
            type: "string",
            alias: "c",
            describe: "Path to a config directory (.codespin).",
          })
          .option("images", {
            type: "array",
            alias: "image",
            describe: "List of image files to include in the prompt",
            string: true,
          })
          .option("messages", {
            type: "string",
            alias: "msg",
            describe: "Path to a JSON file containing message history",
          }),
      async (argv) => {
        const result = await go(
          { ...argv, prompt: argv.prompt?.join(" ") || "" },
          {
            workingDir: process.cwd(),
          }
        );

        writeToConsole(result.response);
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
          .option("maxInput", {
            alias: "maxi",
            type: "number",
            describe: "Max input length in bytes",
          })
          .option("config", {
            type: "string",
            alias: "c",
            describe: "Path to a config directory (.codespin).",
          }),
      async (argv) => {
        const result = await dependencies(argv, {
          workingDir: process.cwd(),
        });
        for (const item of result.dependencies) {
          writeToConsole(
            `${item.dependency} -> ${item.filePath} (${
              item.isProjectFile ? "local" : "external"
            })`
          );
        }
      }
    )
    .command(
      "commit",
      "Generate a commit message from the current git diff",
      (yargs) =>
        yargs
          .option("model", {
            type: "string",
            describe: "Name of the model to use.",
          })
          .option("maxTokens", {
            type: "number",
            describe: "Maximum number of tokens for generated message.",
          })
          .option("debug", {
            type: "boolean",
            describe:
              "Enable debug mode. This prints debug messages for every step.",
          })
          .option("maxInput", {
            alias: "maxi",
            type: "number",
            describe: "Max input length in bytes",
          })
          .option("config", {
            type: "string",
            alias: "c",
            describe: "Path to a config directory (.codespin).",
          }),
      async (argv) => {
        const result = await commit(argv, { workingDir: process.cwd() });
        writeToConsole(result.subject);
        if (result.body) {
          writeToConsole();
          writeToConsole(result.body);
        }
      }
    )
    .command("version", "Display the current version", {}, async () => {
      const version = await getPackageVersion();
      writeToConsole(version);
    })
    .showHelpOnFail(false)
    .completion()
    .help("help")
    .alias("h", "help").argv;
}

function writeToConsole(text?: string) {
  console.log(text ?? "");
}

main();
