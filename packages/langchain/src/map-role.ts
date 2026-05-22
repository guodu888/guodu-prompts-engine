import type { Message } from "guodu-prompt-engine-core";
import type { LangChainRole } from "./types";

export function mapLangChainRole(role: Message["role"]): LangChainRole {
  if (role === "user") return "human";
  if (role === "assistant") return "ai";
  if (role === "tool" || role === "tool_result") return "tool";
  return "system";
}
