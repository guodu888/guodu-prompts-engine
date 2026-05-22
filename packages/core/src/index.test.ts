import { expect, test } from "bun:test";
import { LRUCache, MemoryCache, TemplateEngine, validateTemplate } from "./index";

test("public exports are available", () => {
  expect(typeof TemplateEngine).toBe("function");
  expect(typeof validateTemplate).toBe("function");
  expect(typeof MemoryCache).toBe("function");
  expect(typeof LRUCache).toBe("function");
});
