import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const createdDirs: string[] = [];

export async function createTemplateDir(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "prompt-engine-core-"));
  createdDirs.push(dir);

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(dir, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, "utf-8");
  }

  return dir;
}

export async function cleanupTemplateDirs(): Promise<void> {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
}
