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
