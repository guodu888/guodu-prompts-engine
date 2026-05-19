import type { MessageRole } from "../types";
import type { IfBranchNode, ParsedImageAttributes, TemplateNode } from "./ast";

interface ParseSequenceResult {
  nodes: TemplateNode[];
  stopTag?: {
    name: string;
    arg?: string;
  };
}

interface TagInfo {
  name: string;
  arg?: string;
}

function parseTagContent(rawTag: string): TagInfo {
  const content = rawTag.slice(2, -2).trim();

  if (content.startsWith("role:")) {
    return { name: "role", arg: content.slice(5).trim() };
  }

  if (content.startsWith("if ")) {
    return { name: "if", arg: content.slice(3).trim() };
  }

  if (content.startsWith("elseif ")) {
    return { name: "elseif", arg: content.slice(7).trim() };
  }

  if (content.startsWith("include ")) {
    return { name: "include", arg: content.slice(8).trim() };
  }

  return { name: content };
}

function extractIncludePath(rawArg: string | undefined): string {
  if (!rawArg) {
    throw new Error("Include tag requires a file path.");
  }

  const match = rawArg.match(/^['\"](.+)['\"]$/);
  if (!match?.[1]) {
    throw new Error(`Include path must be quoted: ${rawArg}`);
  }

  return match[1];
}

function ensureRole(value: string | undefined): MessageRole {
  if (value === "system" || value === "user" || value === "assistant") {
    return value;
  }

  throw new Error(`Invalid role: ${value ?? ""}`);
}

function parseImageAttributes(rawImageBlock: string): ParsedImageAttributes {
  const attrs: Record<string, string> = {};

  for (const line of rawImageBlock.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex <= 0) {
      throw new Error(`Invalid image attribute line: ${trimmed}`);
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    attrs[key] = value;
  }

  if (!attrs.url) {
    throw new Error("Image block requires url attribute.");
  }

  return {
    urlExpression: attrs.url,
    detailExpression: attrs.detail
  };
}

function tokenizeTemplate(template: string): string[] {
  const rawTokens = template.split(/({%[\s\S]*?%})/g);
  return rawTokens.filter((token) => token.length > 0);
}

export function parseTemplate(template: string): TemplateNode[] {
  const tokens = tokenizeTemplate(template);
  let position = 0;

  const parseSequence = (stopTags: string[]): ParseSequenceResult => {
    const nodes: TemplateNode[] = [];

    while (position < tokens.length) {
      const token = tokens[position] ?? "";

      if (!token.startsWith("{%")) {
        position += 1;
        nodes.push({ type: "text", value: token });
        continue;
      }

      const tag = parseTagContent(token);

      if (stopTags.includes(tag.name)) {
        position += 1;
        return { nodes, stopTag: { name: tag.name, arg: tag.arg } };
      }

      if (tag.name === "role") {
        position += 1;
        const role = ensureRole(tag.arg);
        const nested = parseSequence(["endrole"]);
        if (nested.stopTag?.name !== "endrole") {
          throw new Error("Role tag is missing endrole.");
        }
        nodes.push({ type: "role", role, children: nested.nodes });
        continue;
      }

      if (tag.name === "if") {
        if (!tag.arg) {
          throw new Error("If tag requires a condition expression.");
        }

        position += 1;
        const branches: IfBranchNode[] = [];
        let currentCondition: string | null = tag.arg;

        while (true) {
          const branch = parseSequence(["elseif", "else", "endif"]);
          branches.push({ condition: currentCondition, children: branch.nodes });

          if (branch.stopTag?.name === "elseif") {
            if (!branch.stopTag.arg) {
              throw new Error("Elseif tag requires a condition expression.");
            }
            currentCondition = branch.stopTag.arg;
            continue;
          }

          if (branch.stopTag?.name === "else") {
            const elseBranch = parseSequence(["endif"]);
            branches.push({ condition: null, children: elseBranch.nodes });
            if (elseBranch.stopTag?.name !== "endif") {
              throw new Error("If tag is missing endif.");
            }
          }

          if (!branch.stopTag || (branch.stopTag.name !== "endif" && branch.stopTag.name !== "else")) {
            throw new Error("If tag is missing endif.");
          }

          break;
        }

        nodes.push({ type: "if", branches });
        continue;
      }

      if (tag.name === "include") {
        position += 1;
        nodes.push({ type: "include", path: extractIncludePath(tag.arg) });
        continue;
      }

      if (tag.name === "image") {
        position += 1;
        let imageContent = "";
        let isClosed = false;

        while (position < tokens.length) {
          const imageToken = tokens[position] ?? "";
          if (imageToken.startsWith("{%")) {
            const imageTag = parseTagContent(imageToken);
            if (imageTag.name !== "endimage") {
              throw new Error("Image block can only contain plain text attributes.");
            }

            position += 1;
            isClosed = true;
            break;
          }

          imageContent += imageToken;
          position += 1;
        }

        if (!isClosed) {
          throw new Error("Image block is missing endimage.");
        }

        const attrs = parseImageAttributes(imageContent);
        nodes.push({ type: "image", ...attrs });
        continue;
      }

      throw new Error(`Unexpected tag: ${tag.name}`);
    }

    return { nodes };
  };

  const parsed = parseSequence([]);
  if (parsed.stopTag) {
    throw new Error(`Unexpected stop tag: ${parsed.stopTag.name}`);
  }

  return parsed.nodes;
}
