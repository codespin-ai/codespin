import { readFile } from "fs/promises";
import path from "path";
import { FileNotFoundError } from "../errors.js";

export async function loadImage(
  imagePath: string,
  workingDir: string
): Promise<string> {
  try {
    const absolutePath = path.resolve(workingDir, imagePath);
    const imageBuffer = await readFile(absolutePath);
    return imageBuffer.toString("base64");
  } catch (error) {
    throw new FileNotFoundError(imagePath);
  }
}
