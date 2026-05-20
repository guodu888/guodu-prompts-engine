import { afterEach, expect, test } from "bun:test";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { MemoryCache } from "./cache";
import { TemplateEngine } from "./engine";
import { cleanupTemplateDirs, createTemplateDir } from "./test-utils/template-fixture";

afterEach(async () => {
  await cleanupTemplateDirs();
});

test("renders roles with variable interpolation", async () => {
  const baseDir = await createTemplateDir({
    "main.md": "{% role:system %}你是{{course|数学}}老师{% endrole %}{% role:user %}你好{% endrole %}"
  });

  const engine = new TemplateEngine({ baseDir });
  const messages = await engine.render("main.md", { course: "英语" });

  expect(messages).toEqual([
    { role: "system", content: "你是英语老师" },
    { role: "user", content: "你好" }
  ]);
});

test("renders include + if + image multimodal", async () => {
  const baseDir = await createTemplateDir({
    "main.md": `{% include "./partials/system.md" %}\n{% role:user %}\n{% if level == "advanced" %}高级题目{% else %}基础题目{% endif %}\n{% image %}\nurl: {{img}}\ndetail: high\n{% endimage %}\n{% endrole %}`,
    "partials/system.md": "{% role:system %}系统提示{{suffix|}}{% endrole %}"
  });

  const engine = new TemplateEngine({ baseDir });
  const messages = await engine.render("main.md", {
    level: "advanced",
    img: "https://example.com/a.png",
    suffix: "-A"
  });

  expect(messages[0]).toEqual({ role: "system", content: "系统提示-A" });
  expect(messages[1]?.role).toBe("user");
  expect(Array.isArray(messages[1]?.content)).toBe(true);
  if (Array.isArray(messages[1]?.content)) {
    const textParts = messages[1].content.filter(
      (part): part is { type: "text"; text: string } => part.type === "text"
    );
    expect(textParts.some((part) => part.text.includes("高级题目"))).toBe(true);

    const imagePart = messages[1].content.find(
      (part): part is { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } } =>
        part.type === "image_url"
    );

    expect(imagePart).toEqual({
      type: "image_url",
      image_url: {
        url: "https://example.com/a.png",
        detail: "high"
      }
    });
  }
});

test("invalidates cache when file mtime changes", async () => {
  const baseDir = await createTemplateDir({
    "main.md": "{% role:system %}v1{% endrole %}"
  });

  const engine = new TemplateEngine({ baseDir, cache: new MemoryCache() });
  const first = await engine.render("main.md");
  expect(first[0]?.content).toBe("v1");

  await Bun.sleep(5);
  await writeFile(path.join(baseDir, "main.md"), "{% role:system %}v2{% endrole %}", "utf-8");

  const second = await engine.render("main.md");
  expect(second[0]?.content).toBe("v2");
});

test("throws on circular includes", async () => {
  const baseDir = await createTemplateDir({
    "a.md": "{% include \"./b.md\" %}",
    "b.md": "{% include \"./a.md\" %}"
  });

  const engine = new TemplateEngine({ baseDir });
  await expect(engine.render("a.md")).rejects.toThrow("Circular include detected");
});

test("throws when non-whitespace text appears at top-level", async () => {
  const baseDir = await createTemplateDir({
    "main.md": "plain text"
  });

  const engine = new TemplateEngine({ baseDir });
  await expect(engine.render("main.md")).rejects.toThrow("Top-level content must be wrapped in role blocks.");
});

test("uses else branch when if condition is false", async () => {
  const baseDir = await createTemplateDir({
    "main.md": "{% if level == \"advanced\" %}{% role:user %}A{% endrole %}{% else %}{% role:user %}B{% endrole %}{% endif %}"
  });

  const engine = new TemplateEngine({ baseDir });
  const messages = await engine.render("main.md", { level: "basic" });
  expect(messages).toEqual([{ role: "user", content: "B" }]);
});

test("throws for strict undefined variables", async () => {
  const baseDir = await createTemplateDir({
    "main.md": "{% role:user %}hello {{name}}{% endrole %}"
  });

  const engine = new TemplateEngine({ baseDir, strictUndefinedVariables: true });
  await expect(engine.render("main.md", {})).rejects.toThrow("Missing variable");
});

test("throws for invalid image detail", async () => {
  const baseDir = await createTemplateDir({
    "main.md": "{% role:user %}{% image %}url: https://example.com/a.png\ndetail: medium{% endimage %}{% endrole %}"
  });

  const engine = new TemplateEngine({ baseDir });
  await expect(engine.render("main.md")).rejects.toThrow("Invalid image detail");
});

test("defaults image detail to auto", async () => {
  const baseDir = await createTemplateDir({
    "main.md": "{% role:user %}{% image %}url: https://example.com/a.png{% endimage %}{% endrole %}"
  });

  const engine = new TemplateEngine({ baseDir });
  const messages = await engine.render("main.md");

  expect(messages[0]?.role).toBe("user");
  expect(messages[0]?.content).toEqual([
    {
      type: "image_url",
      image_url: {
        url: "https://example.com/a.png",
        detail: "auto"
      }
    }
  ]);
});

test("throws when include escapes baseDir", async () => {
  const baseDir = await createTemplateDir({
    "main.md": "{% include \"../escape.md\" %}"
  });

  const engine = new TemplateEngine({ baseDir });
  await expect(engine.render("main.md")).rejects.toThrow("escapes baseDir");
});

test("uses elseif branch when first if branch is false", async () => {
  const baseDir = await createTemplateDir({
    "main.md": `{% if level == "advanced" %}{% role:user %}A{% endrole %}{% elseif level == "middle" %}{% role:user %}B{% endrole %}{% else %}{% role:user %}C{% endrole %}{% endif %}`
  });

  const engine = new TemplateEngine({ baseDir });
  const messages = await engine.render("main.md", { level: "middle" });
  expect(messages).toEqual([{ role: "user", content: "B" }]);
});

test("resolves nested includes", async () => {
  const baseDir = await createTemplateDir({
    "main.md": `{% include "./a.md" %}`,
    "a.md": `{% include "./b.md" %}`,
    "b.md": `{% role:system %}nested{% endrole %}`
  });

  const engine = new TemplateEngine({ baseDir });
  const messages = await engine.render("main.md");
  expect(messages).toEqual([{ role: "system", content: "nested" }]);
});

test("supports include inside role block", async () => {
  const baseDir = await createTemplateDir({
    "main.md": `{% role:user %}before {% include "./snippet.md" %} after{% endrole %}`,
    "snippet.md": `inside`
  });

  const engine = new TemplateEngine({ baseDir });
  const messages = await engine.render("main.md");

  expect(messages).toEqual([{ role: "user", content: "before inside after" }]);
});

test("non-strict mode falls back to empty for undefined variables", async () => {
  const baseDir = await createTemplateDir({
    "main.md": "{% role:user %}hello {{name}}{% endrole %}"
  });

  const engine = new TemplateEngine({ baseDir, strictUndefinedVariables: false });
  const messages = await engine.render("main.md", {});
  expect(messages).toEqual([{ role: "user", content: "hello " }]);
});

test("throws when image appears at top-level", async () => {
  const baseDir = await createTemplateDir({
    "main.md": "{% image %}url: https://example.com/a.png{% endimage %}"
  });

  const engine = new TemplateEngine({ baseDir });
  await expect(engine.render("main.md")).rejects.toThrow("Image blocks must be inside role blocks");
});

test("throws on nested role blocks", async () => {
  const baseDir = await createTemplateDir({
    "main.md": "{% role:user %}{% include \"./inner.md\" %}{% endrole %}",
    "inner.md": "{% role:assistant %}x{% endrole %}"
  });

  const engine = new TemplateEngine({ baseDir });
  await expect(engine.render("main.md")).rejects.toThrow("Nested role blocks are not supported");
});

test("trims role boundary newlines for text and multimodal content", async () => {
  const baseDir = await createTemplateDir({
    "plain.md": "{% role:system %}\nhello\n{% endrole %}",
    "multi.md": "{% role:user %}\n题目如下\n{% image %}\nurl: https://example.com/x.png\n{% endimage %}\n请给出答案\n{% endrole %}"
  });

  const engine = new TemplateEngine({ baseDir });

  const plain = await engine.render("plain.md");
  expect(plain).toEqual([{ role: "system", content: "hello" }]);

  const multi = await engine.render("multi.md");
  expect(multi).toEqual([
    {
      role: "user",
      content: [
        { type: "text", text: "题目如下" },
        { type: "image_url", image_url: { url: "https://example.com/x.png", detail: "auto" } },
        { type: "text", text: "请给出答案" }
      ]
    }
  ]);
});

test("normalizes control-tag and image-tag boundary newlines as expected", async () => {
  const baseDir = await createTemplateDir({
    "example.md": `{% role:system %}
你是一名{{course|初中数学}}老师
{% if level == "advanced" %}
- 你要给出更深入的解题步骤
{% else %}
- 你要用更直观的方式讲解
{% endif %}
{% endrole %}

{% role:user %}
请分析这道题
{% image %}
url: https://example.com/question.png
detail: high
{% endimage %}
{% endrole %}`
  });

  const engine = new TemplateEngine({ baseDir });
  const messages = await engine.render("example.md", { course: "英语", level: "advanced" });

  expect(messages).toEqual([
    {
      role: "system",
      content: "你是一名英语老师\n- 你要给出更深入的解题步骤"
    },
    {
      role: "user",
      content: [
        { type: "text", text: "请分析这道题" },
        {
          type: "image_url",
          image_url: {
            url: "https://example.com/question.png",
            detail: "high"
          }
        }
      ]
    }
  ]);
});
