import { expect, test } from "bun:test";
import { LRUCache } from "./lru-cache";

test("throws for invalid max size", () => {
  expect(() => new LRUCache({ maxSize: 0 })).toThrow("positive integer");
});

test("evicts least recently used entry", () => {
  const cache = new LRUCache<number>({ maxSize: 2 });
  cache.set("a", 1);
  cache.set("b", 2);
  cache.get("a");
  cache.set("c", 3);

  expect(cache.get("a")).toBe(1);
  expect(cache.get("b")).toBeUndefined();
  expect(cache.get("c")).toBe(3);
});

test("overwrites existing key without increasing size", () => {
  const cache = new LRUCache<number>({ maxSize: 2 });
  cache.set("a", 1);
  cache.set("a", 2);
  cache.set("b", 3);

  expect(cache.get("a")).toBe(2);
  expect(cache.get("b")).toBe(3);
});

test("supports delete and clear", () => {
  const cache = new LRUCache<number>({ maxSize: 3 });
  cache.set("a", 1);
  cache.set("b", 2);
  cache.delete("a");
  expect(cache.get("a")).toBeUndefined();

  cache.clear();
  expect(cache.get("b")).toBeUndefined();
});
