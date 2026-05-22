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
  return messages.map((message) => {
    if (message.role === "tool" || message.role === "tool_result") {
      if (typeof message.content === "string") {
        return {
          role: "tool",
          content: message.content,
          tool_call_id: "unknown"
        } as LangChainMessageLike;
      }

      const toolPart = message.content.find((part) => part.type === "tool_result");
      if (!toolPart) {
        return {
          role: "tool",
          content: mapLangChainContent(message.content),
          tool_call_id: "unknown"
        } as LangChainMessageLike;
      }

      return {
        role: "tool",
        tool_call_id: toolPart.tool_call_id,
        name: toolPart.tool_name,
        status: toolPart.is_error ? "error" : "success",
        content: typeof toolPart.output === "string" ? toolPart.output : JSON.stringify(toolPart.output)
      } as LangChainMessageLike;
    }

    return {
      role: mapLangChainRole(message.role),
      content: mapLangChainContent(message.content)
    } as LangChainMessageLike;
  });
}
