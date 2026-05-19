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
const otpArg = process.argv.find((arg) => arg.startsWith("--otp="));
const otp = otpArg?.split("=")[1] || process.env.NPM_OTP || process.env.NPM_CONFIG_OTP;

const versionFiles = ["package.json", ...packages];

function readJson(path: string) {
  return JSON.parse(readFileSync(resolve(root, path), "utf-8"));
}

function writeJson(path: string, data: unknown) {
  writeFileSync(resolve(root, path), JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function run(command: string, cwd = root) {
  execSync(command, { cwd, stdio: "inherit" });
}

function runCapture(command: string, cwd = root) {
  return execSync(command, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
  })
    .toString()
    .trim();
}

function ensureCleanWorkingTree() {
  const output = runCapture("git status --porcelain");

  if (output.length > 0) {
    console.error("Working tree is not clean. Please commit or stash changes before release.");
    process.exit(1);
  }
}

function ensureNpmAuth() {
  if (isDryRun) {
    return;
  }

  try {
    const npmUser = runCapture("npm whoami");
    console.log(`npm authenticated as ${npmUser}`);
  } catch {
    console.error("npm auth check failed. Please run 'npm login' first.");
    process.exit(1);
  }
}

function publishCommand() {
  const otpPart = otp ? ` --otp=${otp}` : "";
  return `npm publish --access public${otpPart}`;
}

function snapshotFiles(paths: string[]) {
  const snapshot = new Map<string, string>();
  for (const path of paths) {
    snapshot.set(path, readFileSync(resolve(root, path), "utf-8"));
  }
  return snapshot;
}

function restoreFiles(snapshot: Map<string, string>) {
  for (const [path, content] of snapshot.entries()) {
    writeFileSync(resolve(root, path), content, "utf-8");
  }
}

// ensureCleanWorkingTree();
ensureNpmAuth();

const fileSnapshot = snapshotFiles(versionFiles);

let newVersion = "";

try {
  // bumpp bumps the root version interactively.
  run("bunx bumpp --no-push --no-commit --no-tag");

  // Read the new version bumpp wrote to root package.json
  const rootPkg = readJson("package.json");
  newVersion = rootPkg.version;

  if (!newVersion) {
    throw new Error("Root package.json does not have a valid version after bumpp.");
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
    const cmd = publishCommand();
    for (const pkgDir of publishOrder) {
      run(cmd, resolve(root, pkgDir));
    }

    // Git commit + tag
    run("git add -A");
    run(`git commit -m "chore: release v${newVersion}"`);
    run(`git tag v${newVersion}`);
  }
} catch (error) {
  restoreFiles(fileSnapshot);
  console.error("\nRelease failed. Version file changes have been reverted.");
  throw error;
}

if (isDryRun) {
  restoreFiles(fileSnapshot);
  console.log(`\nDry run completed for v${newVersion}. Version file changes were reverted.`);
} else {
  console.log(`\nRelease v${newVersion} completed. Run 'git push --follow-tags' to push git commit and tag.`);
}
