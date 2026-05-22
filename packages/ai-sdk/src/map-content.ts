import type { MessageContent, ToolResultContent } from "guodu-prompt-engine-core";
import type { AssistantContent, ToolContent, UserContent } from "ai";

export function mapAISDKContent(content: MessageContent): UserContent {
  if (typeof content === "string") return content;

  return content.map((part) => {
    if (part.type === "text") {
      return {
        type: "text",
        text: part.text
      };
    }

    if (part.type === "tool_result") {
      return {
        type: "text",
        text: typeof part.output === "string" ? part.output : JSON.stringify(part.output)
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

    if (part.type === "tool_result") {
      return {
        type: "text",
        text: typeof part.output === "string" ? part.output : JSON.stringify(part.output)
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
    .map((part) => {
      if (part.type === "text") {
        return part.text;
      }

      if (part.type === "tool_result") {
        return typeof part.output === "string" ? part.output : JSON.stringify(part.output);
      }

      return part.image_url.url;
    })
    .join("\n");
}

export function mapAISDKToolContent(content: MessageContent): ToolContent {
  if (typeof content === "string") {
    return [
      {
        type: "tool-result",
        toolCallId: "unknown",
        toolName: "unknown",
        result: content
      }
    ];
  }

  const toolParts = content
    .filter((part): part is ToolResultContent => part.type === "tool_result")
    .map((part) => ({
      type: "tool-result" as const,
      toolCallId: part.tool_call_id,
      toolName: part.tool_name ?? "unknown",
      result: part.output,
      isError: part.is_error
    }));

  if (toolParts.length > 0) {
    return toolParts;
  }

  return [
    {
      type: "tool-result",
      toolCallId: "unknown",
      toolName: "unknown",
      result: content.map((part) => {
        if (part.type === "text") {
          return part.text;
        }

        if (part.type === "tool_result") {
          return part.output;
        }

        return part.image_url.url;
      })
    }
  ];
}
