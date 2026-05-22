import { expect, test } from "bun:test";
import {
  resolveTemplateString,
  resolveTemplateStringAsync,
  resolveVariableValue,
  resolveVariableValueAsync
} from "./variable-resolver";

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

test("supports dot-path variable interpolation", () => {
  const output = resolveTemplateString("hello {{user.name}}", {
    user: { name: "alice" }
  });
  expect(output).toBe("hello alice");
});

test("dot-path uses default when missing", () => {
  const output = resolveTemplateString("{{user.profile.name|visitor}}", {
    user: { profile: null }
  });
  expect(output).toBe("visitor");
});

test("resolveVariableValue throws in sync mode when variable is Promise", () => {
  expect(() => resolveVariableValue("name", { name: Promise.resolve("alice") })).toThrow(
    "cannot be resolved in sync mode"
  );
});

test("resolveVariableValueAsync resolves Promise values", async () => {
  const value = await resolveVariableValueAsync("name", { name: Promise.resolve("alice") });
  expect(value).toBe("alice");
});

test("resolveTemplateStringAsync resolves async values", async () => {
  const output = await resolveTemplateStringAsync("hello {{user.name}}", {
    user: Promise.resolve({ name: "bob" })
  });
  expect(output).toBe("hello bob");
});
