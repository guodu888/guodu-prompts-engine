import type { MessageContent } from "guodu-prompt-engine-core";
import type { LangChainMessageContent } from "./types";

export function mapLangChainContent(content: MessageContent): LangChainMessageContent {
  if (typeof content === "string") return content;

  return content.map((part) => {
    if (part.type === "text") {
      return { type: "text", text: part.text };
    }

    return {
      type: "image_url",
      image_url: { url: part.image_url.url }
    };
  });
}
