import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { TemplateEngine } from "guodu-prompt-engine-core";
import { toLangChainMessages } from "./index";

const createdDirs: string[] = [];

afterEach(async () => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function createTemplateDir(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "prompt-engine-lc-"));
  createdDirs.push(dir);

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(dir, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, "utf-8");
  }

  return dir;
}

test("converts core output to langchain messages", async () => {
  const baseDir = await createTemplateDir({
    "main.md": `{% role:system %}S{% endrole %}{% role:user %}U{% image %}\nurl: https://example.com/a.png\n{% endimage %}{% endrole %}{% role:assistant %}A{% endrole %}`
  });

  const engine = new TemplateEngine({ baseDir });
  const rendered = await engine.render("main.md");
  const mapped = toLangChainMessages(rendered);

  expect(mapped.map((m) => m.role)).toEqual(["system", "human", "ai"]);
  expect(mapped[1]?.content).toEqual([
    { type: "text", text: "U" },
    { type: "image_url", image_url: { url: "https://example.com/a.png" } }
  ]);
});
