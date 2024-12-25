import { CompletionContentPart, CompletionUserMessage } from "libllm";
import { loadImage } from "./loadImage.js";

export async function convertPromptToMessage(
  prompt: string,
  images: string[] | undefined,
  workingDir: string
): Promise<CompletionUserMessage> {
  if (!images || images.length === 0) {
    return {
      role: "user",
      content: prompt,
    };
  }

  const content: CompletionContentPart[] = [
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
