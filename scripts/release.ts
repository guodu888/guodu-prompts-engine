import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const corePackagePath = "packages/core/package.json";
const langchainPackagePath = "packages/langchain/package.json";
const aiSdkPackagePath = "packages/ai-sdk/package.json";

const packages = [corePackagePath, langchainPackagePath, aiSdkPackagePath];
const publishOrder = [
  "packages/core",
  "packages/langchain",
  "packages/ai-sdk",
];

const isDryRun = process.argv.includes("--dry");

function readJson(path: string) {
  return JSON.parse(readFileSync(resolve(root, path), "utf-8"));
}

function writeJson(path: string, data: unknown) {
  writeFileSync(resolve(root, path), JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function run(command: string, cwd = root) {
  execSync(command, { cwd, stdio: "inherit" });
}

function ensureCleanWorkingTree() {
  const output = execSync("git status --porcelain", {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
  })
    .toString()
    .trim();

  if (output.length > 0) {
    console.error("Working tree is not clean. Please commit or stash changes before release.");
    process.exit(1);
  }
}

ensureCleanWorkingTree();

// bumpp bumps the root version interactively.
run("bunx bumpp --no-push --no-commit --no-tag");

// Read the new version bumpp wrote to root package.json
const rootPkg = readJson("package.json");
const newVersion: string = rootPkg.version;

if (!newVersion) {
  console.error("Root package.json does not have a valid version after bumpp.");
  process.exit(1);
}

// Sync all sub-packages to the same version
for (const pkgPath of packages) {
  const pkg = readJson(pkgPath);
  pkg.version = newVersion;

  if (pkgPath === langchainPackagePath || pkgPath === aiSdkPackagePath) {
    pkg.dependencies = {
      ...(pkg.dependencies ?? {}),
      "guodu-prompt-engine-core": `^${newVersion}`,
    };
  }

  writeJson(pkgPath, pkg);
  console.log(`Updated ${pkgPath} to v${newVersion}`);
}

// Build all packages
console.log("\nBuilding packages...");
run("bun run build");

if (!isDryRun) {
  console.log("\nPublishing packages to npm...");
  for (const pkgDir of publishOrder) {
    run("npm publish --access public", resolve(root, pkgDir));
  }
}

if (!isDryRun) {
  // Git commit + tag
  run("git add -A");
  run(`git commit -m "chore: release v${newVersion}"`);
  run(`git tag v${newVersion}`);
}

if (isDryRun) {
  run("git checkout -- package.json packages/core/package.json packages/langchain/package.json packages/ai-sdk/package.json");
  console.log(`\nDry run completed for v${newVersion}. Version file changes were reverted.`);
} else {
  console.log(`\nRelease v${newVersion} completed. Run 'git push --follow-tags' to push git commit and tag.`);
}
