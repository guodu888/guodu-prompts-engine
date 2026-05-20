import type { MessageContent } from "guodu-prompt-engine-core";
import type { AssistantContent, UserContent } from "ai";

export function mapAISDKContent(content: MessageContent): UserContent {
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

export function mapAISDKAssistantContent(content: MessageContent): AssistantContent {
  if (typeof content === "string") return content;

  return content.map((part) => {
    if (part.type === "text") {
      return {
        type: "text",
        text: part.text
      };
    }

    // AssistantContent in AI SDK does not accept image parts directly.
    return {
      type: "text",
      text: part.image_url.url
    };
  });
}

export function mapAISDKSystemContent(content: MessageContent): string {
  if (typeof content === "string") return content;

  return content
    .map((part) => (part.type === "text" ? part.text : part.image_url.url))
    .join("\n");
}
