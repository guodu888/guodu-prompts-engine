import { expect, test } from "bun:test";
import type { Message } from "guodu-prompt-engine-core";
import { toLangChainMessages } from "./index";

test("toLangChainMessages maps roles", () => {
  const messages: Message[] = [
    { role: "system", content: "s" },
    { role: "user", content: "u" },
    { role: "assistant", content: "a" }
  ];

  const mapped = toLangChainMessages(messages);

  expect(mapped.map((m) => m.role)).toEqual(["system", "human", "ai"]);
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
