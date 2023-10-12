// getDiff.ts

import { promises as fs } from "fs";
import { execPromise } from "../process/execPromise.js";
import { createTempFile } from "../fs/createTempFile.js";

export async function getDiff(
  newContent: string,
  oldContent: string,
  filename: string
): Promise<string> {
  const tempPathCurrent = await createTempFile(newContent);
  const tempPathCommitted = await createTempFile(oldContent);

  try {
    const diff = await execPromise(
      `git diff --no-index ${tempPathCommitted} ${tempPathCurrent}`
    );

    return diff
      .replaceAll(`${tempPathCommitted}`, `/${filename}`)
      .replaceAll(`${tempPathCurrent}`, `/${filename}`);
  } finally {
    await Promise.all([
      fs.unlink(tempPathCurrent),
      fs.unlink(tempPathCommitted),
    ]);
  }
}
