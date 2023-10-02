// getDiff.ts

import { promises as fs } from "fs";
import { exec } from "child_process";
import { tmpdir } from "os";
import { join } from "path";

async function execPromise(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error && error.code !== 1) {
        reject(error);
      } else if (stderr) {
        reject(new Error(stderr));
      } else {
        resolve(stdout);
      }
    });
  });
}

async function removeFrontMatter(content: string): Promise<string> {
  const lines = content.split("\n");
  let inFrontMatter = false;

  const newContent = lines.filter((line) => {
    if (line === "---") {
      inFrontMatter = !inFrontMatter;
      return false;
    }
    return !inFrontMatter;
  });

  return newContent.join("\n");
}

async function createTempFile(content: string): Promise<string> {
  const tempPath = join(tmpdir(), `${Date.now()}.tmp`);
  await fs.writeFile(tempPath, content, "utf8");
  return tempPath;
}

async function getDiff(filePath: string): Promise<string> {
  const contentCurrent = await fs.readFile(filePath, "utf8");

  const contentCommitted = await execPromise(`git show HEAD:${filePath}`);

  let contentToDiffCurrent = contentCurrent;
  let contentToDiffCommitted = contentCommitted;

  if (filePath.endsWith(".prompt.md")) {
    contentToDiffCurrent = await removeFrontMatter(contentCurrent);
    contentToDiffCommitted = await removeFrontMatter(contentCommitted);
  }

  const tempPathCurrent = await createTempFile(contentToDiffCurrent);
  const tempPathCommitted = await createTempFile(contentToDiffCommitted);

  try {
    const diff = await execPromise(
      `git diff --no-index ${tempPathCommitted} ${tempPathCurrent}`
    );
    return diff;
  } finally {
    await Promise.all([
      fs.unlink(tempPathCurrent),
      fs.unlink(tempPathCommitted),
    ]);
  }
}

export { getDiff };
