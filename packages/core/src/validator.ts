import path from "node:path";
import type { TemplateNode } from "./parser/ast";
import { parseTemplate } from "./parser/index";
import { resolveTemplatePath } from "./utils/path-resolver";

export interface ValidationIssue {
  type: "syntax" | "structure" | "include";
  message: string;
  filePath: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
}

export interface ValidateTemplateOptions {
  baseDir: string;
  checkIncludes?: boolean;
}

function collectIncludePaths(nodes: TemplateNode[]): string[] {
  const includePaths: string[] = [];

  for (const node of nodes) {
    if (node.type === "include") {
      includePaths.push(node.path);
      continue;
    }

    if (node.type === "role" || node.type === "for") {
      includePaths.push(...collectIncludePaths(node.children));
      continue;
    }

    if (node.type === "if") {
      for (const branch of node.branches) {
        includePaths.push(...collectIncludePaths(branch.children));
      }
    }
  }

  return includePaths;
}

export async function validateTemplate(
  templatePath: string,
  options: ValidateTemplateOptions
): Promise<ValidationResult> {
  const errors: ValidationIssue[] = [];
  const shouldCheckIncludes = options.checkIncludes ?? true;

  const visit = async (absolutePath: string, stack: Set<string>) => {
    let content = "";

    try {
      content = await Bun.file(absolutePath).text();
    } catch (error) {
      errors.push({
        type: "include",
        message: `Failed to read template: ${(error as Error).message}`,
        filePath: absolutePath
      });
      return;
    }

    let nodes: TemplateNode[] = [];
    try {
      nodes = parseTemplate(content);
    } catch (error) {
      errors.push({
        type: "syntax",
        message: (error as Error).message,
        filePath: absolutePath
      });
      return;
    }

    if (!shouldCheckIncludes) {
      return;
    }

    const includePaths = collectIncludePaths(nodes);
    for (const includePath of includePaths) {
      let includeAbsolutePath = "";

      try {
        includeAbsolutePath = resolveTemplatePath(path.dirname(absolutePath), includePath);
      } catch (error) {
        errors.push({
          type: "structure",
          message: (error as Error).message,
          filePath: absolutePath
        });
        continue;
      }

      if (stack.has(includeAbsolutePath)) {
        errors.push({
          type: "structure",
          message: `Circular include detected: ${includeAbsolutePath}`,
          filePath: absolutePath
        });
        continue;
      }

      const nextStack = new Set(stack);
      nextStack.add(includeAbsolutePath);
      await visit(includeAbsolutePath, nextStack);
    }
  };

  const rootPath = resolveTemplatePath(options.baseDir, templatePath);
  await visit(rootPath, new Set([rootPath]));

  return {
    valid: errors.length === 0,
    errors
  };
}
