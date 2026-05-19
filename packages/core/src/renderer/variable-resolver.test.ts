import { expect, test } from "bun:test";
import { resolveTemplateString, resolveVariableValue } from "./variable-resolver";

test("resolves variable and default", () => {
  const output = resolveTemplateString("hello {{name|world}}", { name: "alice" });
  expect(output).toBe("hello alice");
});

test("uses default when variable is missing", () => {
  const output = resolveTemplateString("hello {{name|world}}", {});
  expect(output).toBe("hello world");
});

test("returns empty string for missing variable in non-strict mode", () => {
  expect(resolveVariableValue("name", {}, { strictUndefined: false })).toBe("");
});

test("throws for missing variable in strict mode", () => {
  expect(() => resolveVariableValue("name", {}, { strictUndefined: true })).toThrow("Missing variable");
});

test("throws for invalid variable name", () => {
  expect(() => resolveVariableValue("bad-name", {})).toThrow("Invalid variable name");
});

test("throws for nested default", () => {
  expect(() => resolveTemplateString("{{name|{{fallback}}}}", {})).toThrow(
    "Nested variable defaults are not supported."
  );
});

test("resolveVariableValue throws when default contains nested template", () => {
  expect(() => resolveVariableValue("missing", {}, {}, "{{fallback}}"))
    .toThrow("Nested variable defaults are not supported.");
});
