#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { TemplateEngine, validateTemplate } from "guodu-prompt-engine-core";

interface ParsedArgs {
  command?: string;
  templatePath?: string;
  baseDir: string;
  vars?: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  const [, , command, templatePath, ...rest] = argv;
  let baseDir = process.cwd();
  let vars: string | undefined;

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === "--base-dir") {
      baseDir = rest[i + 1] ?? baseDir;
      i += 1;
      continue;
    }

    if (arg === "--vars") {
      vars = rest[i + 1];
      i += 1;
      continue;
    }
  }

  return { command, templatePath, baseDir, vars };
}

async function readVars(raw: string | undefined): Promise<Record<string, unknown>> {
  if (!raw) {
    return {};
  }

  const maybeFilePath = path.resolve(process.cwd(), raw);
  try {
    const fileContent = await readFile(maybeFilePath, "utf-8");
    return JSON.parse(fileContent) as Record<string, unknown>;
  } catch {
    return JSON.parse(raw) as Record<string, unknown>;
  }
}

function printUsage(): void {
  console.log("Usage:");
  console.log("  gdprompt render <templatePath> [--base-dir <dir>] [--vars <json|file>]");
  console.log("  gdprompt validate <templatePath> [--base-dir <dir>]");
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv);

  if (!args.command || !args.templatePath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (args.command === "render") {
    try {
      const variables = await readVars(args.vars);
      const engine = new TemplateEngine({ baseDir: args.baseDir });
      const messages = await engine.render(args.templatePath, variables);
      console.log(JSON.stringify(messages, null, 2));
    } catch (error) {
      console.error((error as Error).message);
      process.exitCode = 1;
    }
    return;
  }

  if (args.command === "validate") {
    try {
      const result = await validateTemplate(args.templatePath, { baseDir: args.baseDir });
      console.log(JSON.stringify(result, null, 2));
      if (!result.valid) {
        process.exitCode = 1;
      }
    } catch (error) {
      console.error((error as Error).message);
      process.exitCode = 1;
    }
    return;
  }

  printUsage();
  process.exitCode = 1;
}

void run();
