import type { MessageContent } from "guodu-prompt-engine-core";
import type { LangChainMessageContent } from "./types";

export function mapLangChainContent(content: MessageContent): LangChainMessageContent {
  if (typeof content === "string") return content;

  return content.map((part) => {
    if (part.type === "text") {
      return { type: "text", text: part.text };
    }

    if (part.type === "tool_result") {
      return {
        type: "text",
        text: typeof part.output === "string" ? part.output : JSON.stringify(part.output)
      };
    }

    return {
      type: "image_url",
      image_url: { url: part.image_url.url }
    };
  });
}
