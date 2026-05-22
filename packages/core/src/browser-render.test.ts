import { expect, test } from "bun:test";
import { renderTemplateString } from "./browser-render";

test("renders template string with shared parser/render behavior", () => {
  const messages = renderTemplateString(
    `{% role:system %}
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
{% endrole %}`,
    { course: "英语", level: "advanced" }
  );

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

test("throws without includeResolver when include exists", () => {
  expect(() => renderTemplateString(`{% include "./a.md" %}`)).toThrow(
    "Include is not supported in string rendering mode"
  );
});

test("supports for loops in string rendering", () => {
  const messages = renderTemplateString(
    `{% role:user %}{% for item in items %}{{item}} {% endfor %}{% endrole %}`,
    { items: ["a", "b"] }
  );

  expect(messages).toEqual([{ role: "user", content: "a b " }]);
});

test("throws in sync mode when variable is Promise", () => {
  expect(() =>
    renderTemplateString(`{% role:user %}{{name}}{% endrole %}`, {
      name: Promise.resolve("async")
    })
  ).toThrow("cannot be resolved in sync mode");
});
