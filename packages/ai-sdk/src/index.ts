import type { Message, MessageContent } from "guodu-prompt-engine-core";

export type AISDKRole = "system" | "user" | "assistant";

export interface AISDKTextPart {
  type: "text";
  text: string;
}

export interface AISDKImagePart {
  type: "image";
  image: string;
}

export type AISDKContent = string | Array<AISDKTextPart | AISDKImagePart>;

export interface AISDKMessage {
  role: AISDKRole;
  content: AISDKContent;
}

function mapContent(content: MessageContent): AISDKContent {
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

export function toAISDKMessages(messages: Message[]): AISDKMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: mapContent(message.content)
  }));
}
