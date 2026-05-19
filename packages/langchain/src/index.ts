import type { Message, MessageContent } from "guodu-prompt-engine-core";

export type LangChainRole = "system" | "human" | "ai";

export interface LangChainContentTextPart {
  type: "text";
  text: string;
}

export interface LangChainContentImagePart {
  type: "image_url";
  image_url: {
    url: string;
  };
}

export type LangChainMessageContent =
  | string
  | Array<LangChainContentTextPart | LangChainContentImagePart>;

export interface LangChainMessageLike {
  role: LangChainRole;
  content: LangChainMessageContent;
}

function mapRole(role: Message["role"]): LangChainRole {
  if (role === "user") return "human";
  if (role === "assistant") return "ai";
  return "system";
}

function mapContent(content: MessageContent): LangChainMessageContent {
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

export function toLangChainMessages(messages: Message[]): LangChainMessageLike[] {
  return messages.map((message) => ({
    role: mapRole(message.role),
    content: mapContent(message.content)
  }));
}
