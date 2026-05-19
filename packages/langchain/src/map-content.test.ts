import { expect, test } from "bun:test";
import { mapLangChainContent } from "./map-content";

test("keeps string content unchanged", () => {
  expect(mapLangChainContent("hello")).toBe("hello");
});

test("maps mixed text and image content", () => {
  const content = mapLangChainContent([
    { type: "text", text: "a" },
    { type: "image_url", image_url: { url: "https://example.com/a.png", detail: "high" } }
  ]);

  expect(content).toEqual([
    { type: "text", text: "a" },
    { type: "image_url", image_url: { url: "https://example.com/a.png" } }
  ]);
});
