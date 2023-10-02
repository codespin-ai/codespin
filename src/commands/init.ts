import { CommandResult } from "./CommandResult.js";
import { promises as fs } from "fs";
import { resolve } from "path";

type InitArgs = {
  force?: boolean;
};

const DEFAULT_JSON_CONTENT = {
  template: "codespin/templates/default",
  api: "openai",
  model: "gpt-3.5-turbo",
};

async function init(args: InitArgs): Promise<CommandResult> {
  const currentDir = process.cwd();
  const configFile = resolve(currentDir, "codespin.json");

  try {
    // Check if codespin.json already exists
    if (await fileExists(configFile)) {
      if (!args.force) {
        return {
          success: false,
          message:
            "codespin.json already exists. Use the --force option to overwrite.",
        };
      }
    }
    await fs.writeFile(
      configFile,
      JSON.stringify(DEFAULT_JSON_CONTENT, null, 2)
    );

    return { success: true, message: "Initialization completed." };
  } catch (err: any) {
    return {
      success: false,
      message: `Error during initialization: ${err.message}`,
    };
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path, fs.constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
}

export { init };
