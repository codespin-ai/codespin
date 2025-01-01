import * as libllm from "libllm";
import { loadImage } from "./loadImage.js";

export async function convertPromptToMessage(
  prompt: string,
  images: string[] | undefined,
  workingDir: string
): Promise<libllm.types.CompletionUserMessage> {
  if (!images || images.length === 0) {
    return {
      role: "user",
      content: prompt,
    };
  }

  const content: libllm.types.CompletionContentPart[] = [
    {
      type: "text",
      text: prompt,
    },
    ...(await Promise.all(
      images.map(async (imagePath) => ({
        type: "image" as const,
        base64Data: await loadImage(imagePath, workingDir),
      }))
    )),
  ];

  return {
    role: "user",
    content,
  };
}
