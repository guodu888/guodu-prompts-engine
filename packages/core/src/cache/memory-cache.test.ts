import { expect, test } from "bun:test";
import { MemoryCache } from "./memory-cache";

test("memory cache set/get/delete/clear", () => {
  const cache = new MemoryCache<number>();

  cache.set("a", 1);
  expect(cache.get("a")).toBe(1);

  cache.delete("a");
  expect(cache.get("a")).toBeUndefined();

  cache.set("b", 2);
  cache.set("c", 3);
  cache.clear();

  expect(cache.get("b")).toBeUndefined();
  expect(cache.get("c")).toBeUndefined();
});
