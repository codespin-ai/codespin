import { access, constants } from "fs/promises";

export async function pathExists(filePath: string) {
  try {
    // Use the access method to check if the file exists
    await access(filePath, constants.F_OK);
    return true; // File exists
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return false; // File does not exist
    } else {
      throw error; // Handle other errors
    }
  }
}
