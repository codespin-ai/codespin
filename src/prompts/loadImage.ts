import { readFile } from "fs/promises";
import path from "path";
import { exception } from "../exception.js";

export async function loadImage(
  imagePath: string,
  workingDir: string
): Promise<string> {
  try {
    const absolutePath = path.resolve(workingDir, imagePath);
    const imageBuffer = await readFile(absolutePath);
    return imageBuffer.toString("base64");
  } catch (error) {
    return exception(
      "IMAGE_LOAD_ERROR",
      `Failed to load image at path: ${imagePath}`
    );
  }
}
