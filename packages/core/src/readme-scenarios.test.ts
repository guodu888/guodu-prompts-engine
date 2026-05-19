import { afterEach, expect, test } from "bun:test";
import { TemplateEngine } from "./engine";
import { cleanupTemplateDirs, createTemplateDir } from "./test-utils/template-fixture";

afterEach(async () => {
  await cleanupTemplateDirs();
});

test("README 示例1: 简单单轮对话", async () => {
  const baseDir = await createTemplateDir({
    "demo01.md": `{% role:system %}\n# 角色\n你是一名优秀的{{course}}老师，擅长{{course}}教学。\n\n# 能力\n- 能够根据学生的需求，提供个性化的{{course}}教学服务。\n{% endrole %}\n\n{% role:user %}\n# 用户\n你好老师\n{% endrole %}\n\n{% role:assistant %}\n你好呀，有什么可以帮你的吗？\n{% endrole %}`
  });

  const engine = new TemplateEngine({ baseDir });
  const messages = await engine.render("demo01.md", { course: "英语" });

  expect(messages).toHaveLength(3);
  expect(messages[0]?.role).toBe("system");
  expect(typeof messages[0]?.content).toBe("string");
  expect(String(messages[0]?.content)).toContain("英语老师");
  expect(messages[1]).toEqual({ role: "user", content: "\n# 用户\n你好老师\n" });
  expect(messages[2]).toEqual({ role: "assistant", content: "\n你好呀，有什么可以帮你的吗？\n" });
});

test("README 示例2: 多模态内容", async () => {
  const baseDir = await createTemplateDir({
    "demo02.md": `{% role:user %}\n题目信息如下：\n{% image %}\nurl: https://example.com/image.png\ndetail: high\n{% endimage %}\n{% endrole %}`
  });

  const engine = new TemplateEngine({ baseDir });
  const messages = await engine.render("demo02.md");

  expect(messages).toEqual([
    {
      role: "user",
      content: [
        { type: "text", text: "\n题目信息如下：\n" },
        {
          type: "image_url",
          image_url: {
            url: "https://example.com/image.png",
            detail: "high"
          }
        },
        { type: "text", text: "\n" }
      ]
    }
  ]);
});

test("README 示例3: 文件包含和条件渲染", async () => {
  const baseDir = await createTemplateDir({
    "demo03-partial.md": `- 需要正确解析汉语拼音`,
    "demo04.md": `{% role:system %}\n你是一名{{course|初中数学}}老师\n{% if course == "小学语文" %}\n{% include "./demo03-partial.md" %}\n{% elseif course == "初中数学" %}\n- 公式输出为<span data-latex="公式" data-type="inline-math"></span>格式\n{% endif %}\n{% endrole %}`
  });

  const engine = new TemplateEngine({ baseDir });
  const mathMessages = await engine.render("demo04.md", { course: "初中数学" });
  const cnMessages = await engine.render("demo04.md", { course: "小学语文" });

  expect(mathMessages).toHaveLength(1);
  expect(mathMessages[0]?.role).toBe("system");
  expect(String(mathMessages[0]?.content)).toContain("初中数学老师");
  expect(String(mathMessages[0]?.content)).toContain("data-latex");

  expect(cnMessages).toHaveLength(1);
  expect(String(cnMessages[0]?.content)).toContain("小学语文老师");
  expect(String(cnMessages[0]?.content)).toContain("需要正确解析汉语拼音");
});
