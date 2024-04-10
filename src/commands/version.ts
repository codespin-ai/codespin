import { getPackageVersion } from "../getPackageVersion.js";

export async function version(): Promise<string> {
  return getPackageVersion();
}
