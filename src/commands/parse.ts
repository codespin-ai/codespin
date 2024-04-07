import { promises as fs } from "fs";
import { writeFilesToDisk } from "../fs/writeFilesToDisk.js";
import { extractCode } from "../prompts/extractCode.js";
import { writeToConsole } from "../console.js";
import { CodespinContext } from "../CodeSpinContext.js";

type ParseArgs = {
  file: string;
  write: boolean | undefined;
  exec: string | undefined;
  config: string | undefined;
  outDir: string | undefined;
};

export async function parse(
  args: ParseArgs,
  context: CodespinContext
): Promise<void> {
  const llmResponse = await fs.readFile(args.file, "utf-8");
  const files = extractCode(llmResponse);

  if (args.write) {
    const extractResult = await writeFilesToDisk(
      args.outDir || context.workingDir,
      files,
      args.exec,
      context.workingDir
    );
    const generatedFiles = extractResult.filter((x) => x.generated);
    const skippedFiles = extractResult.filter((x) => !x.generated);

    if (generatedFiles.length) {
      writeToConsole(
        `Generated ${generatedFiles.map((x) => x.file).join(", ")}.`
      );
    }
    if (skippedFiles.length) {
      writeToConsole(`Skipped ${skippedFiles.map((x) => x.file).join(", ")}.`);
    }
  } else {
    for (const file of files) {
      const header = `FILE: ${file.path}`;
      writeToConsole(header);
      writeToConsole("-".repeat(header.length));
      writeToConsole(file.contents);
      writeToConsole();
    }
  }
}
