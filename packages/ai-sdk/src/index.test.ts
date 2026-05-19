import { expect, test } from "bun:test";
import type { Message } from "guodu-prompt-engine-core";
import { toAISDKMessages } from "./index";

test("toAISDKMessages maps image part", () => {
  const messages: Message[] = [
    {
      role: "user",
      content: [
        { type: "text", text: "question" },
        { type: "image_url", image_url: { url: "https://example.com/a.png" } }
      ]
    }
  ];

  const mapped = toAISDKMessages(messages);

  expect(mapped[0]?.role).toBe("user");
  expect(Array.isArray(mapped[0]?.content)).toBe(true);
  if (Array.isArray(mapped[0]?.content)) {
    expect(mapped[0].content[1]).toEqual({ type: "image", image: "https://example.com/a.png" });
  }
});

test("toAISDKMessages keeps string content", () => {
  const messages: Message[] = [{ role: "assistant", content: "done" }];
  const mapped = toAISDKMessages(messages);
  expect(mapped).toEqual([{ role: "assistant", content: "done" }]);
});

test("toAISDKMessages handles empty array", () => {
  expect(toAISDKMessages([])).toEqual([]);
});
