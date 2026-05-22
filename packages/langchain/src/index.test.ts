import { expect, test } from "bun:test";
import type { Message } from "guodu-prompt-engine-core";
import { toLangChainMessages } from "./index";

test("toLangChainMessages maps roles", () => {
  const messages: Message[] = [
    { role: "system", content: "s" },
    { role: "user", content: "u" },
    { role: "assistant", content: "a" },
    {
      role: "tool",
      content: [
        {
          type: "tool_result",
          tool_call_id: "call_1",
          tool_name: "search",
          output: { ok: true }
        }
      ]
    }
  ];

  const mapped = toLangChainMessages(messages);

  expect(mapped.map((m) => m.role)).toEqual(["system", "human", "ai", "tool"]);
});

test("toLangChainMessages maps multimodal content", () => {
  const messages: Message[] = [
    {
      role: "user",
      content: [
        { type: "text", text: "question" },
        { type: "image_url", image_url: { url: "https://example.com/a.png", detail: "high" } }
      ]
    }
  ];

  const mapped = toLangChainMessages(messages);
  expect(mapped).toEqual([
    {
      role: "human",
      content: [
        { type: "text", text: "question" },
        { type: "image_url", image_url: { url: "https://example.com/a.png" } }
      ]
    }
  ]);
});

test("toLangChainMessages handles empty array", () => {
  expect(toLangChainMessages([])).toEqual([]);
});

test("toLangChainMessages maps tool result metadata", () => {
  const messages: Message[] = [
    {
      role: "tool_result",
      content: [
        {
          type: "tool_result",
          tool_call_id: "call_42",
          tool_name: "calculator",
          output: 3,
          is_error: false
        }
      ]
    }
  ];

  const mapped = toLangChainMessages(messages);
  expect(mapped[0]).toEqual({
    role: "tool",
    tool_call_id: "call_42",
    name: "calculator",
    status: "success",
    content: "3"
  });
});
