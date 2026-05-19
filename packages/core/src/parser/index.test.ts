import { expect, test } from "bun:test";
import { parseTemplate } from "./index";

test("parses role blocks", () => {
  const nodes = parseTemplate("{% role:system %}hello{% endrole %}");
  expect(nodes).toHaveLength(1);
  expect(nodes[0]?.type).toBe("role");
  if (nodes[0]?.type === "role") {
    expect(nodes[0].role).toBe("system");
    expect(nodes[0].children[0]).toEqual({ type: "text", value: "hello" });
  }
});

test("parses if-elseif-else branches", () => {
  const nodes = parseTemplate(
    "{% if level == \"a\" %}A{% elseif level == \"b\" %}B{% else %}C{% endif %}"
  );
  expect(nodes).toHaveLength(1);
  expect(nodes[0]?.type).toBe("if");
  if (nodes[0]?.type === "if") {
    expect(nodes[0].branches).toHaveLength(3);
    expect(nodes[0].branches[0]?.condition).toBe("level == \"a\"");
    expect(nodes[0].branches[1]?.condition).toBe("level == \"b\"");
    expect(nodes[0].branches[2]?.condition).toBeNull();
  }
});

test("parses include and image tags", () => {
  const nodes = parseTemplate(
    "{% include \"./a.md\" %}{% role:user %}{% image %}url: https://a.com/x.png\ndetail: high{% endimage %}{% endrole %}"
  );

  expect(nodes[0]).toEqual({ type: "include", path: "./a.md" });
  expect(nodes[1]?.type).toBe("role");
  if (nodes[1]?.type === "role") {
    expect(nodes[1].children[0]).toEqual({
      type: "image",
      urlExpression: "https://a.com/x.png",
      detailExpression: "high"
    });
  }
});

test("throws when role is not closed", () => {
  expect(() => parseTemplate("{% role:user %}hello")).toThrow("Role tag is missing endrole.");
});

test("throws when include path is not quoted", () => {
  expect(() => parseTemplate("{% include ./a.md %}")).toThrow("Include path must be quoted");
});

test("throws when image block is not closed", () => {
  expect(() => parseTemplate("{% role:user %}{% image %}url: https://a.com/x.png{% endrole %}")).toThrow(
    "Image block can only contain plain text attributes."
  );
});

test("throws on invalid role name", () => {
  expect(() => parseTemplate("{% role:moderator %}x{% endrole %}")).toThrow("Invalid role");
});

test("throws on missing if condition", () => {
  expect(() => parseTemplate("{% if %}x{% endif %}")).toThrow("If tag requires a condition expression");
});

test("throws on missing elseif condition", () => {
  expect(() => parseTemplate("{% if a == 1 %}x{% elseif %}y{% endif %}")).toThrow(
    "Elseif tag requires a condition expression"
  );
});

test("throws on unexpected stop tag", () => {
  expect(() => parseTemplate("{% endif %}")).toThrow("Unexpected tag: endif");
});

test("throws when include has no path", () => {
  expect(() => parseTemplate("{% include %}")).toThrow("Include tag requires a file path");
});

test("throws for invalid image attribute line", () => {
  expect(() =>
    parseTemplate("{% role:user %}{% image %}https://a.com/x.png{% endimage %}{% endrole %}")
  ).toThrow("Image block requires url attribute");
});

test("throws for invalid image attribute when key is empty", () => {
  expect(() =>
    parseTemplate("{% role:user %}{% image %}: broken{% endimage %}{% endrole %}")
  ).toThrow("Invalid image attribute line");
});

test("throws when if-else block misses endif", () => {
  expect(() => parseTemplate("{% if a == 1 %}x{% else %}y")).toThrow("If tag is missing endif");
});

test("throws when if block reaches EOF without endif", () => {
  expect(() => parseTemplate("{% if a == 1 %}x")).toThrow("If tag is missing endif");
});

test("throws when image block reaches EOF without endimage", () => {
  expect(() => parseTemplate("{% role:user %}{% image %}url: https://a.com/x.png")).toThrow(
    "Image block is missing endimage"
  );
});

test("throws on unknown tag", () => {
  expect(() => parseTemplate("{% unknown %}")).toThrow("Unexpected tag: unknown");
});
