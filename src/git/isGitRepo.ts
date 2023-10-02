// isGitRepo.ts
import { execSync } from "child_process";

export function isGitRepo(): boolean {
  try {
    execSync("git rev-parse --is-inside-work-tree", { stdio: "pipe" });
    return true;
  } catch (error) {
    return false;
  }
}
