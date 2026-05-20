import type { MessageContent, MessageFieldWithRole } from "@langchain/core/messages";

export type LangChainRole = "system" | "human" | "ai";
export type LangChainContentTextPart = Extract<Exclude<MessageContent, string>[number], { type: "text" }>;
export type LangChainContentImagePart = Extract<Exclude<MessageContent, string>[number], { type: "image_url" }>;
export type LangChainMessageContent = MessageContent;
export type LangChainMessageLike = MessageFieldWithRole;
