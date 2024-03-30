import { promises as fs } from "fs";
import { execString } from "../process/execString.js";
import { createTempFile } from "../fs/createTempFile.js";
import path from "path";

export async function diffStrings(
  newContent: string,
  oldContent: string,
  filename: string,
  workingDir: string
): Promise<string> {
  const tempPathCurrent = await createTempFile(newContent);
  const tempPathCommitted = await createTempFile(oldContent);

  try {
    const diff = await execString(
      `git diff --no-index ${tempPathCommitted} ${tempPathCurrent}`,
      workingDir
    );

    return diff
      .replaceAll(
        `${tempPathCommitted}`,
        `/${path.relative(workingDir, filename)}`
      )
      .replaceAll(
        `${tempPathCurrent}`,
        `/${path.relative(workingDir, filename)}`
      );
  } finally {
    await Promise.all([
      fs.unlink(tempPathCurrent),
      fs.unlink(tempPathCommitted),
    ]);
  }
}
