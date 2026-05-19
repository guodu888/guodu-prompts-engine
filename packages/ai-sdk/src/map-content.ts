import type { MessageContent } from "guodu-prompt-engine-core";
import type { AISDKContent } from "./types";

export function mapAISDKContent(content: MessageContent): AISDKContent {
  if (typeof content === "string") return content;

  return content.map((part) => {
    if (part.type === "text") {
      return {
        type: "text",
        text: part.text
      };
    }

    return {
      type: "image",
      image: part.image_url.url
    };
  });
}
