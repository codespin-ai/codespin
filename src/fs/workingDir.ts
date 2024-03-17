let workingDir: string;

export function setWorkingDir(dir: string) {
  workingDir = dir;
}

export function getWorkingDir(): string {
  if (!workingDir) {
    throw new Error("Internal error. Working directory was not set.");
  } else {
    return workingDir;
  }
}
