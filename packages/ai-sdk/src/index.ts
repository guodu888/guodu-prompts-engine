import type { Message } from "guodu-prompt-engine-core";
import type { CoreMessage } from "ai";
import { mapAISDKAssistantContent, mapAISDKContent, mapAISDKSystemContent } from "./map-content";
import type { AISDKMessage } from "./types";

export type { AISDKContent, AISDKImagePart, AISDKMessage, AISDKRole, AISDKTextPart } from "./types";

export function toAISDKMessages(messages: Message[]): AISDKMessage[] {
  return messages.map((message): CoreMessage => {
    if (message.role === "system") {
      return {
        role: "system",
        content: mapAISDKSystemContent(message.content)
      };
    }

    if (message.role === "assistant") {
      return {
        role: "assistant",
        content: mapAISDKAssistantContent(message.content)
      };
    }

    return {
      role: "user",
      content: mapAISDKContent(message.content)
    };
  });
}
