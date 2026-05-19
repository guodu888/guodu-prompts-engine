import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { TemplateEngine } from "guodu-prompt-engine-core";
import { toAISDKMessages } from "./index";

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
  const dir = await mkdtemp(path.join(os.tmpdir(), "prompt-engine-ai-sdk-"));
  createdDirs.push(dir);

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(dir, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, "utf-8");
  }

  return dir;
}

test("converts core output to ai-sdk messages", async () => {
  const baseDir = await createTemplateDir({
    "main.md": `{% role:user %}Q{% image %}\nurl: https://example.com/a.png\ndetail: high\n{% endimage %}{% endrole %}`
  });

  const engine = new TemplateEngine({ baseDir });
  const rendered = await engine.render("main.md");
  const mapped = toAISDKMessages(rendered);

  expect(mapped).toEqual([
    {
      role: "user",
      content: [
        { type: "text", text: "Q" },
        { type: "image", image: "https://example.com/a.png" }
      ]
    }
  ]);
});
