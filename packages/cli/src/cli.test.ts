import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

test("cli validate reports valid template", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "gdprompt-cli-"));
  await writeFile(path.join(dir, "main.md"), "{% role:user %}hello{% endrole %}", "utf-8");

  const result = spawnSync(
    "bun",
    [path.join(process.cwd(), "packages/cli/src/cli.ts"), "validate", "main.md", "--base-dir", dir],
    { encoding: "utf-8" }
  );

  expect(result.status).toBe(0);
  expect(result.stdout).toContain('"valid": true');
});
