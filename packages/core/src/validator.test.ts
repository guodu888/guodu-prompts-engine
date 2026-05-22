import { afterEach, expect, test } from "bun:test";
import { cleanupTemplateDirs, createTemplateDir } from "./test-utils/template-fixture";
import { validateTemplate } from "./validator";

afterEach(async () => {
  await cleanupTemplateDirs();
});

test("validateTemplate passes for valid templates", async () => {
  const baseDir = await createTemplateDir({
    "main.md": "{% role:user %}hello{% endrole %}"
  });

  const result = await validateTemplate("main.md", { baseDir });
  expect(result.valid).toBe(true);
  expect(result.errors).toEqual([]);
});

test("validateTemplate reports syntax errors", async () => {
  const baseDir = await createTemplateDir({
    "main.md": "{% role:user %}hello"
  });

  const result = await validateTemplate("main.md", { baseDir });
  expect(result.valid).toBe(false);
  expect(result.errors[0]?.type).toBe("syntax");
});

test("validateTemplate detects circular includes", async () => {
  const baseDir = await createTemplateDir({
    "a.md": "{% include './b.md' %}",
    "b.md": "{% include './a.md' %}"
  });

  const result = await validateTemplate("a.md", { baseDir });
  expect(result.valid).toBe(false);
  expect(result.errors.some((error) => error.message.includes("Circular include detected"))).toBe(true);
});
