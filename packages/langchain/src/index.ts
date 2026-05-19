import type { Message } from "guodu-prompt-engine-core";
import { mapLangChainContent } from "./map-content";
import { mapLangChainRole } from "./map-role";
import type { LangChainMessageLike } from "./types";

export type {
  LangChainContentImagePart,
  LangChainContentTextPart,
  LangChainMessageContent,
  LangChainMessageLike,
  LangChainRole
} from "./types";

export function toLangChainMessages(messages: Message[]): LangChainMessageLike[] {
  return messages.map((message) => ({
    role: mapLangChainRole(message.role),
    content: mapLangChainContent(message.content)
  }));
}
