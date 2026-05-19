import { expect, test } from "bun:test";
import { resolveTemplatePath } from "./path-resolver";

test("resolves path inside baseDir", () => {
  const result = resolveTemplatePath("/tmp/base", "./a/b.md");
  expect(result).toContain("/tmp/base/a/b.md");
});

test("blocks path traversal", () => {
  expect(() => resolveTemplatePath("/tmp/base", "../escape.md")).toThrow("escapes baseDir");
});
