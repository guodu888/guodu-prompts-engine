import type { Message } from "guodu-prompt-engine-core";
import { mapAISDKContent } from "./map-content";
import type { AISDKMessage } from "./types";

export type { AISDKContent, AISDKImagePart, AISDKMessage, AISDKRole, AISDKTextPart } from "./types";

export function toAISDKMessages(messages: Message[]): AISDKMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: mapAISDKContent(message.content)
  }));
}
