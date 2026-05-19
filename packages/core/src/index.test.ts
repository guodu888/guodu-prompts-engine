import { expect, test } from "bun:test";
import { TemplateEngine } from "./engine";

test("TemplateEngine returns placeholder message", async () => {
  const engine = new TemplateEngine({ baseDir: "./prompts" });
  const messages = await engine.render("demo.md");

  expect(messages).toHaveLength(1);
  expect(messages[0]?.role).toBe("system");
});
