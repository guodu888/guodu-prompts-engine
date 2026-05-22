import type { Message } from "guodu-prompt-engine-core";
import type { CoreMessage } from "ai";
import {
  mapAISDKAssistantContent,
  mapAISDKContent,
  mapAISDKSystemContent,
  mapAISDKToolContent
} from "./map-content";
import type { AISDKMessage } from "./types";

export type {
  AISDKContent,
  AISDKImagePart,
  AISDKMessage,
  AISDKRole,
  AISDKTextPart,
  AISDKToolContent,
  AISDKToolResultPart
} from "./types";

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

    if (message.role === "tool" || message.role === "tool_result") {
      return {
        role: "tool",
        content: mapAISDKToolContent(message.content)
      };
    }

    return {
      role: "user",
      content: mapAISDKContent(message.content)
    };
  });
}
