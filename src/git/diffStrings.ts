import { promises as fs } from "fs";
import { execString } from "../process/execString.js";
import { createTempFile } from "../fs/createTempFile.js";
import path from "path";

export async function diffStrings(
  newContent: string,
  oldContent: string,
  filePath: string,
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
        `/${path.relative(workingDir, filePath)}`
      )
      .replaceAll(
        `${tempPathCurrent}`,
        `/${path.relative(workingDir, filePath)}`
      );
  } finally {
    await Promise.all([
      fs.unlink(tempPathCurrent),
      fs.unlink(tempPathCommitted),
    ]);
  }
}
