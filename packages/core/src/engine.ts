import path from "node:path";
import { parseTemplate } from "./parser";
import { evaluateCondition } from "./renderer/condition-evaluator";
import { resolveTemplateString } from "./renderer/variable-resolver";
import type { ImageContent, Message, MessageContent, TemplateEngineOptions, TemplateVariables } from "./types";
import { resolveTemplatePath } from "./utils/path-resolver";

interface TemplateCacheEntry {
  mtimeMs: number;
  content: string;
}

type RenderTextPart = {
  type: "text";
  text: string;
};

type RenderImagePart = ImageContent;

type RenderRolePart = RenderTextPart | RenderImagePart;

function trimRoleBoundaryStart(text: string): string {
  return text.replace(/^[ \t]*\r?\n/, "");
}

function trimRoleBoundaryEnd(text: string): string {
  return text.replace(/\r?\n[ \t]*$/, "");
}

function trimBeforeControlEndTag(text: string): string {
  return text.replace(/[ \t]*\r?\n$/, "");
}

function trimBeforeNonTextTag(text: string): string {
  return text.replace(/[ \t]*\r?\n$/, "");
}

function trimAfterNonTextTag(text: string): string {
  return text.replace(/^\r?\n[ \t]*/, "");
}

export class TemplateEngine {
  public readonly options: TemplateEngineOptions;

  constructor(options: TemplateEngineOptions) {
    this.options = options;
  }

  private get strictUndefined(): boolean {
    return this.options.strictUndefinedVariables ?? false;
  }

  private async readTemplate(absolutePath: string): Promise<string> {
    const stat = await Bun.file(absolutePath).stat();
    const typedCache = this.options.cache as
      | {
          get(key: string): TemplateCacheEntry | undefined;
          set(key: string, value: TemplateCacheEntry): void;
        }
      | undefined;

    if (typedCache) {
      const cached = typedCache.get(absolutePath);
      if (cached && cached.mtimeMs === stat.mtimeMs) {
        return cached.content;
      }
    }

    const content = await Bun.file(absolutePath).text();

    if (typedCache) {
      typedCache.set(absolutePath, {
        mtimeMs: stat.mtimeMs,
        content
      });
    }

    return content;
  }

  private normalizeText(text: string): string {
    return resolveTemplateString(text, this.currentVariables, {
      strictUndefined: this.strictUndefined
    });
  }

  private currentVariables: TemplateVariables = {};

  private async parseTemplateFile(absolutePath: string) {
    const content = await this.readTemplate(absolutePath);
    return parseTemplate(content);
  }

  private resolveImageDetail(rawDetail: string | undefined): "low" | "high" | "auto" {
    if (!rawDetail) {
      return "auto";
    }

    const resolved = this.normalizeText(rawDetail).trim().toLowerCase();
    if (resolved === "low" || resolved === "high" || resolved === "auto") {
      return resolved;
    }

    throw new Error(`Invalid image detail: ${rawDetail}`);
  }

  private async renderRoleChildren(
    nodes: Awaited<ReturnType<typeof parseTemplate>>,
    currentDir: string,
    stack: Set<string>
  ): Promise<RenderRolePart[]> {
    const parts: RenderRolePart[] = [];
    let textBuffer = "";

    const flushTextBuffer = () => {
      if (textBuffer.length > 0) {
        parts.push({ type: "text", text: textBuffer });
        textBuffer = "";
      }
    };

    for (const node of nodes) {
      if (node.type === "text") {
        textBuffer += this.normalizeText(node.value);
        continue;
      }

      if (node.type === "image") {
        flushTextBuffer();
        const url = this.normalizeText(node.urlExpression).trim();
        if (!url) {
          throw new Error("Image url cannot be empty.");
        }

        parts.push({
          type: "image_url",
          image_url: {
            url,
            detail: this.resolveImageDetail(node.detailExpression)
          }
        });
        continue;
      }

      if (node.type === "if") {
        const branch = node.branches.find((item) => {
          if (item.condition === null) return true;
          return evaluateCondition(item.condition, this.currentVariables);
        });

        if (branch) {
          const nested = await this.renderRoleChildren(branch.children, currentDir, stack);
          const lastNested = nested[nested.length - 1];
          if (lastNested?.type === "text") {
            lastNested.text = trimBeforeControlEndTag(lastNested.text);
          }
          flushTextBuffer();
          parts.push(...nested);
        }
        continue;
      }

      if (node.type === "include") {
        const includePath = resolveTemplatePath(currentDir, node.path);
        if (stack.has(includePath)) {
          throw new Error(`Circular include detected: ${includePath}`);
        }

        stack.add(includePath);
        try {
          const includeNodes = await this.parseTemplateFile(includePath);
          const nested = await this.renderRoleChildren(includeNodes, path.dirname(includePath), stack);
          flushTextBuffer();
          parts.push(...nested);
        } finally {
          stack.delete(includePath);
        }
        continue;
      }

      if (node.type === "role") {
        throw new Error("Nested role blocks are not supported.");
      }
    }

    flushTextBuffer();
    return parts;
  }

  private toMessageContent(parts: RenderRolePart[]): MessageContent {
    const normalizedParts = parts.map((part) => (part.type === "text" ? { ...part } : part));

    const firstTextIndex = normalizedParts.findIndex((part) => part.type === "text");
    if (firstTextIndex >= 0) {
      const part = normalizedParts[firstTextIndex]!;
      if (part.type === "text") {
        part.text = trimRoleBoundaryStart(part.text);
      }
    }

    const lastTextIndex = (() => {
      for (let i = normalizedParts.length - 1; i >= 0; i -= 1) {
        if (normalizedParts[i]?.type === "text") {
          return i;
        }
      }
      return -1;
    })();

    if (lastTextIndex >= 0) {
      const part = normalizedParts[lastTextIndex]!;
      if (part.type === "text") {
        part.text = trimRoleBoundaryEnd(part.text);
      }
    }

    for (let i = 0; i < normalizedParts.length - 1; i += 1) {
      const current = normalizedParts[i]!;
      const next = normalizedParts[i + 1]!;

      if (current.type === "text" && next.type === "text") {
        if (/\r?\n$/.test(current.text) && /^\r?\n/.test(next.text)) {
          next.text = next.text.replace(/^\r?\n/, "");
        }
      }

      if (current.type === "text" && next.type !== "text") {
        current.text = trimBeforeNonTextTag(current.text);
      }

      if (current.type !== "text" && next.type === "text") {
        next.text = trimAfterNonTextTag(next.text);
      }
    }

    const compactedParts = normalizedParts.filter((part) => {
      if (part.type === "text") {
        return part.text.length > 0;
      }
      return true;
    });

    const hasImage = parts.some((part) => part.type === "image_url");
    if (!hasImage) {
      return compactedParts
        .filter((part): part is RenderTextPart => part.type === "text")
        .map((part) => part.text)
        .join("");
    }

    return compactedParts;
  }

  private async renderTopLevelNodes(
    nodes: Awaited<ReturnType<typeof parseTemplate>>,
    currentDir: string,
    stack: Set<string>
  ): Promise<Message[]> {
    const messages: Message[] = [];

    for (const node of nodes) {
      if (node.type === "text") {
        if (this.normalizeText(node.value).trim().length > 0) {
          throw new Error("Top-level content must be wrapped in role blocks.");
        }
        continue;
      }

      if (node.type === "role") {
        const parts = await this.renderRoleChildren(node.children, currentDir, stack);
        messages.push({
          role: node.role,
          content: this.toMessageContent(parts)
        });
        continue;
      }

      if (node.type === "if") {
        const branch = node.branches.find((item) => {
          if (item.condition === null) return true;
          return evaluateCondition(item.condition, this.currentVariables);
        });

        if (branch) {
          const branchMessages = await this.renderTopLevelNodes(branch.children, currentDir, stack);
          messages.push(...branchMessages);
        }
        continue;
      }

      if (node.type === "include") {
        const includePath = resolveTemplatePath(currentDir, node.path);
        if (stack.has(includePath)) {
          throw new Error(`Circular include detected: ${includePath}`);
        }

        stack.add(includePath);
        try {
          const includeNodes = await this.parseTemplateFile(includePath);
          const includeMessages = await this.renderTopLevelNodes(
            includeNodes,
            path.dirname(includePath),
            stack
          );
          messages.push(...includeMessages);
        } finally {
          stack.delete(includePath);
        }
        continue;
      }

      if (node.type === "image") {
        throw new Error("Image blocks must be inside role blocks.");
      }
    }

    return messages;
  }

  async render(templatePath: string, variables: TemplateVariables = {}): Promise<Message[]> {
    this.currentVariables = variables;

    const absolutePath = resolveTemplatePath(this.options.baseDir, templatePath);
    const stack = new Set<string>([absolutePath]);
    const nodes = await this.parseTemplateFile(absolutePath);
    return this.renderTopLevelNodes(nodes, path.dirname(absolutePath), stack);
  }
}
