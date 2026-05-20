import { parseTemplate } from "./parser";
import { evaluateCondition } from "./renderer/condition-evaluator";
import { resolveTemplateString } from "./renderer/variable-resolver";
import type { ImageContent, Message, MessageContent, TemplateVariables } from "./types";

type RenderTextPart = {
  type: "text";
  text: string;
};

type RenderImagePart = ImageContent;

type RenderRolePart = RenderTextPart | RenderImagePart;

export interface StringTemplateRenderOptions {
  strictUndefinedVariables?: boolean;
  includeResolver?: (includePath: string) => string;
}

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

function toMessageContent(parts: RenderRolePart[]): MessageContent {
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

  const hasImage = compactedParts.some((part) => part.type === "image_url");
  if (!hasImage) {
    return compactedParts
      .filter((part): part is RenderTextPart => part.type === "text")
      .map((part) => part.text)
      .join("");
  }

  return compactedParts;
}

function resolveImageDetail(
  rawDetail: string | undefined,
  normalizeText: (text: string) => string
): "low" | "high" | "auto" {
  if (!rawDetail) {
    return "auto";
  }

  const resolved = normalizeText(rawDetail).trim().toLowerCase();
  if (resolved === "low" || resolved === "high" || resolved === "auto") {
    return resolved;
  }

  throw new Error(`Invalid image detail: ${rawDetail}`);
}

export function renderTemplateString(
  template: string,
  variables: TemplateVariables = {},
  options: StringTemplateRenderOptions = {}
): Message[] {
  const strictUndefined = options.strictUndefinedVariables ?? false;

  const normalizeText = (text: string): string =>
    resolveTemplateString(text, variables, {
      strictUndefined
    });

  const parseFromInclude = (includePath: string, stack: Set<string>) => {
    const resolver = options.includeResolver;
    if (!resolver) {
      throw new Error(`Include is not supported in string rendering mode: ${includePath}`);
    }

    if (stack.has(includePath)) {
      throw new Error(`Circular include detected: ${includePath}`);
    }

    stack.add(includePath);
    try {
      return parseTemplate(resolver(includePath));
    } finally {
      stack.delete(includePath);
    }
  };

  const renderRoleChildren = (
    nodes: Awaited<ReturnType<typeof parseTemplate>>,
    stack: Set<string>
  ): RenderRolePart[] => {
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
        textBuffer += normalizeText(node.value);
        continue;
      }

      if (node.type === "image") {
        flushTextBuffer();
        const url = normalizeText(node.urlExpression).trim();
        if (!url) {
          throw new Error("Image url cannot be empty.");
        }

        parts.push({
          type: "image_url",
          image_url: {
            url,
            detail: resolveImageDetail(node.detailExpression, normalizeText)
          }
        });
        continue;
      }

      if (node.type === "if") {
        const branch = node.branches.find((item) => {
          if (item.condition === null) return true;
          return evaluateCondition(item.condition, variables);
        });

        if (branch) {
          const nested = renderRoleChildren(branch.children, stack);
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
        const includeNodes = parseFromInclude(node.path, stack);
        const nested = renderRoleChildren(includeNodes, stack);
        flushTextBuffer();
        parts.push(...nested);
        continue;
      }

      if (node.type === "role") {
        throw new Error("Nested role blocks are not supported.");
      }
    }

    flushTextBuffer();
    return parts;
  };

  const renderTopLevelNodes = (
    nodes: Awaited<ReturnType<typeof parseTemplate>>,
    stack: Set<string>
  ): Message[] => {
    const messages: Message[] = [];

    for (const node of nodes) {
      if (node.type === "text") {
        if (normalizeText(node.value).trim().length > 0) {
          throw new Error("Top-level content must be wrapped in role blocks.");
        }
        continue;
      }

      if (node.type === "role") {
        const parts = renderRoleChildren(node.children, stack);
        messages.push({
          role: node.role,
          content: toMessageContent(parts)
        });
        continue;
      }

      if (node.type === "if") {
        const branch = node.branches.find((item) => {
          if (item.condition === null) return true;
          return evaluateCondition(item.condition, variables);
        });

        if (branch) {
          const branchMessages = renderTopLevelNodes(branch.children, stack);
          messages.push(...branchMessages);
        }
        continue;
      }

      if (node.type === "include") {
        const includeNodes = parseFromInclude(node.path, stack);
        const includeMessages = renderTopLevelNodes(includeNodes, stack);
        messages.push(...includeMessages);
        continue;
      }

      if (node.type === "image") {
        throw new Error("Image blocks must be inside role blocks.");
      }
    }

    return messages;
  };

  return renderTopLevelNodes(parseTemplate(template), new Set<string>());
}
