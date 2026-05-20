import path from "node:path";

import * as vscode from "vscode";

type TagName =
  | "role"
  | "endrole"
  | "if"
  | "elseif"
  | "else"
  | "endif"
  | "include"
  | "image"
  | "endimage";

interface TagToken {
  name: string;
  raw: string;
  content: string;
  range: vscode.Range;
}

interface IncludeTarget {
  includePath: string;
  pathRange: vscode.Range;
}

const LANGUAGE_ID = "gdprompt";
const DIAGNOSTIC_SOURCE = "gdprompt";
const ALLOWED_ROLES = new Set(["system", "user", "assistant"]);
const TAG_SET = new Set<TagName>([
  "role",
  "endrole",
  "if",
  "elseif",
  "else",
  "endif",
  "include",
  "image",
  "endimage"
]);

const tagDocs: Record<string, string> = {
  role: "`{% role:system|user|assistant %}` 定义一个消息角色块。",
  endrole: "`{% endrole %}` 结束角色块。",
  if: "`{% if condition %}` 条件开始，支持 == != > < >= <=。",
  elseif: "`{% elseif condition %}` 条件分支。",
  else: "`{% else %}` 默认分支。",
  endif: "`{% endif %}` 结束条件块。",
  include: "`{% include \"./partial.gdprompt\" %}` 引入模板文件，路径必须带引号。",
  image: "`{% image %}` 开始图片块，仅允许纯文本属性行（url/detail）。",
  endimage: "`{% endimage %}` 结束图片块。"
};

function isTemplateDocument(document: vscode.TextDocument): boolean {
  return document.languageId === LANGUAGE_ID;
}

function parseIncludeTarget(rawArg: string | undefined): string | undefined {
  if (!rawArg) {
    return undefined;
  }

  const match = rawArg.match(/^['"](.+)['"]$/);
  return match?.[1];
}

function findIncludeTargetAtPosition(document: vscode.TextDocument, position: vscode.Position): IncludeTarget | undefined {
  for (const tag of collectTagTokens(document)) {
    if (tag.name !== "include" || !tag.range.contains(position)) {
      continue;
    }

    const parsed = parseTagContent(tag.raw);
    const includePath = parseIncludeTarget(parsed.arg);
    if (!includePath || !parsed.arg) {
      return undefined;
    }

    const tagStartOffset = document.offsetAt(tag.range.start);
    const rawArgOffset = tag.raw.indexOf(parsed.arg);
    if (rawArgOffset < 0) {
      return undefined;
    }

    const pathOffset = tagStartOffset + rawArgOffset + 1;
    const pathRange = new vscode.Range(
      document.positionAt(pathOffset),
      document.positionAt(pathOffset + includePath.length)
    );

    if (!pathRange.contains(position)) {
      return undefined;
    }

    return { includePath, pathRange };
  }

  return undefined;
}

async function resolveIncludeUri(document: vscode.TextDocument, includePath: string): Promise<vscode.Uri | undefined> {
  if (document.uri.scheme !== "file") {
    return undefined;
  }

  try {
    const resolvedPath = path.resolve(path.dirname(document.uri.fsPath), includePath);
    const uri = vscode.Uri.file(resolvedPath);
    await vscode.workspace.fs.stat(uri);
    return uri;
  } catch {
    return undefined;
  }
}

function parseTagContent(rawTag: string): { name: string; arg?: string } {
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

function collectTagTokens(document: vscode.TextDocument): TagToken[] {
  const tokens: TagToken[] = [];
  const text = document.getText();
  const regex = /{%[\s\S]*?%}/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    const { name } = parseTagContent(raw);
    const start = document.positionAt(match.index);
    const end = document.positionAt(match.index + raw.length);

    tokens.push({
      name,
      raw,
      content: raw.slice(2, -2).trim(),
      range: new vscode.Range(start, end)
    });
  }

  return tokens;
}

function addDiagnostic(
  diagnostics: vscode.Diagnostic[],
  range: vscode.Range,
  message: string,
  severity: vscode.DiagnosticSeverity
): void {
  diagnostics.push(new vscode.Diagnostic(range, message, severity));
}

function validateVariables(document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
  const text = document.getText();

  const openRegex = /{{/g;
  let match: RegExpExecArray | null;
  while ((match = openRegex.exec(text)) !== null) {
    const closeIndex = text.indexOf("}}", match.index + 2);
    if (closeIndex < 0) {
      const start = document.positionAt(match.index);
      const end = document.positionAt(Math.min(match.index + 2, text.length));
      addDiagnostic(
        diagnostics,
        new vscode.Range(start, end),
        "变量插值缺少结束符 `}}`。",
        vscode.DiagnosticSeverity.Error
      );
      break;
    }
  }
}

function validateImageBlockAttributes(
  document: vscode.TextDocument,
  text: string,
  imageStart: TagToken,
  imageEnd: TagToken,
  diagnostics: vscode.Diagnostic[]
): void {
  const startOffset = document.offsetAt(imageStart.range.end);
  const endOffset = document.offsetAt(imageEnd.range.start);
  const content = text.slice(startOffset, endOffset);

  const attrs = new Map<string, string>();
  const lines = content.split(/\r?\n/);
  let runningOffset = startOffset;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      runningOffset += line.length + 1;
      continue;
    }

    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex <= 0) {
      const start = document.positionAt(runningOffset);
      const end = document.positionAt(runningOffset + line.length);
      addDiagnostic(
        diagnostics,
        new vscode.Range(start, end),
        "image 块内属性行格式错误，必须是 `key: value`。",
        vscode.DiagnosticSeverity.Error
      );
      runningOffset += line.length + 1;
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    attrs.set(key, value);

    if (key !== "url" && key !== "detail") {
      const start = document.positionAt(runningOffset);
      const end = document.positionAt(runningOffset + line.length);
      addDiagnostic(
        diagnostics,
        new vscode.Range(start, end),
        `未知 image 属性: ${key}。仅支持 url/detail。`,
        vscode.DiagnosticSeverity.Warning
      );
    }

    runningOffset += line.length + 1;
  }

  if (!attrs.has("url")) {
    addDiagnostic(
      diagnostics,
      imageStart.range,
      "image 块缺少必填属性 `url`。",
      vscode.DiagnosticSeverity.Error
    );
  }

  const detail = attrs.get("detail");
  if (detail && !["low", "high", "auto"].includes(detail) && !detail.includes("{{")) {
    addDiagnostic(
      diagnostics,
      imageStart.range,
      "detail 建议使用 low/high/auto，或通过变量表达式渲染。",
      vscode.DiagnosticSeverity.Warning
    );
  }
}

function validateDocument(document: vscode.TextDocument, collection: vscode.DiagnosticCollection): void {
  if (!isTemplateDocument(document)) {
    return;
  }

  const diagnostics: vscode.Diagnostic[] = [];
  const text = document.getText();
  const tags = collectTagTokens(document);

  validateVariables(document, diagnostics);

  const stack: TagToken[] = [];

  for (const tag of tags) {
    const parsed = parseTagContent(tag.raw);
    const tagName = parsed.name;

    if (!TAG_SET.has(tagName as TagName)) {
      addDiagnostic(
        diagnostics,
        tag.range,
        `未知标签: ${tagName}`,
        vscode.DiagnosticSeverity.Error
      );
      continue;
    }

    if (tagName === "role") {
      const role = parsed.arg ?? "";
      if (!ALLOWED_ROLES.has(role)) {
        addDiagnostic(
          diagnostics,
          tag.range,
          `无效角色: ${role || "(空)"}，只允许 system/user/assistant。`,
          vscode.DiagnosticSeverity.Error
        );
      }

      if (stack.some((item) => parseTagContent(item.raw).name === "role")) {
        addDiagnostic(
          diagnostics,
          tag.range,
          "不支持嵌套 role 块。",
          vscode.DiagnosticSeverity.Error
        );
      }

      stack.push(tag);
      continue;
    }

    if (tagName === "endrole") {
      const openerIndex = [...stack].reverse().findIndex((item) => parseTagContent(item.raw).name === "role");
      if (openerIndex < 0) {
        addDiagnostic(diagnostics, tag.range, "endrole 缺少对应的 role 起始标签。", vscode.DiagnosticSeverity.Error);
      } else {
        const index = stack.length - 1 - openerIndex;
        stack.splice(index, 1);
      }
      continue;
    }

    if (tagName === "if") {
      if (!parsed.arg || parsed.arg.trim().length === 0) {
        addDiagnostic(diagnostics, tag.range, "if 标签必须包含条件表达式。", vscode.DiagnosticSeverity.Error);
      }
      stack.push(tag);
      continue;
    }

    if (tagName === "elseif") {
      if (!parsed.arg || parsed.arg.trim().length === 0) {
        addDiagnostic(diagnostics, tag.range, "elseif 标签必须包含条件表达式。", vscode.DiagnosticSeverity.Error);
      }

      const hasIfInStack = [...stack].reverse().some((item) => parseTagContent(item.raw).name === "if");
      if (!hasIfInStack) {
        addDiagnostic(diagnostics, tag.range, "elseif 必须位于 if 块内部。", vscode.DiagnosticSeverity.Error);
      }
      continue;
    }

    if (tagName === "else") {
      const hasIfInStack = [...stack].reverse().some((item) => parseTagContent(item.raw).name === "if");
      if (!hasIfInStack) {
        addDiagnostic(diagnostics, tag.range, "else 必须位于 if 块内部。", vscode.DiagnosticSeverity.Error);
      }
      continue;
    }

    if (tagName === "endif") {
      const openerIndex = [...stack].reverse().findIndex((item) => parseTagContent(item.raw).name === "if");
      if (openerIndex < 0) {
        addDiagnostic(diagnostics, tag.range, "endif 缺少对应的 if 起始标签。", vscode.DiagnosticSeverity.Error);
      } else {
        const index = stack.length - 1 - openerIndex;
        stack.splice(index, 1);
      }
      continue;
    }

    if (tagName === "include") {
      if (!parsed.arg) {
        addDiagnostic(diagnostics, tag.range, "include 标签需要文件路径参数。", vscode.DiagnosticSeverity.Error);
      } else if (!/^['\"].+['\"]$/.test(parsed.arg)) {
        addDiagnostic(diagnostics, tag.range, "include 路径必须使用引号包裹。", vscode.DiagnosticSeverity.Error);
      }
      continue;
    }

    if (tagName === "image") {
      stack.push(tag);
      continue;
    }

    if (tagName === "endimage") {
      const openerIndex = [...stack].reverse().findIndex((item) => parseTagContent(item.raw).name === "image");
      if (openerIndex < 0) {
        addDiagnostic(diagnostics, tag.range, "endimage 缺少对应的 image 起始标签。", vscode.DiagnosticSeverity.Error);
      } else {
        const index = stack.length - 1 - openerIndex;
        const [imageStart] = stack.splice(index, 1);
        if (imageStart) {
          validateImageBlockAttributes(document, text, imageStart, tag, diagnostics);
        }
      }
    }
  }

  for (const item of stack) {
    const { name } = parseTagContent(item.raw);
    const closer = name === "role" ? "endrole" : name === "if" ? "endif" : name === "image" ? "endimage" : "结束标签";
    addDiagnostic(
      diagnostics,
      item.range,
      `${name} 标签缺少对应的 ${closer}。`,
      vscode.DiagnosticSeverity.Error
    );
  }

  collection.set(document.uri, diagnostics);
}

function provideCompletions(): vscode.CompletionItem[] {
  const items: vscode.CompletionItem[] = [];

  const roleSnippet = new vscode.CompletionItem("role block", vscode.CompletionItemKind.Snippet);
  roleSnippet.insertText = new vscode.SnippetString("{% role:${1|system,user,assistant|} %}\n$0\n{% endrole %}");
  roleSnippet.documentation = "插入 role 块";
  items.push(roleSnippet);

  const ifSnippet = new vscode.CompletionItem("if block", vscode.CompletionItemKind.Snippet);
  ifSnippet.insertText = new vscode.SnippetString(
    "{% if ${1:course} == \"${2:value}\" %}\n$0\n{% elseif ${1:course} == \"${3:other}\" %}\n{% else %}\n{% endif %}"
  );
  ifSnippet.documentation = "插入 if/elseif/else/endif 块";
  items.push(ifSnippet);

  const includeSnippet = new vscode.CompletionItem("include", vscode.CompletionItemKind.Snippet);
  includeSnippet.insertText = new vscode.SnippetString('{% include "${1:./partials/prompt.gptpl}" %}');
  includeSnippet.documentation = "插入 include 标签";
  items.push(includeSnippet);

  const imageSnippet = new vscode.CompletionItem("image block", vscode.CompletionItemKind.Snippet);
  imageSnippet.insertText = new vscode.SnippetString("{% image %}\nurl: ${1:https://example.com/image.png}\ndetail: ${2|auto,low,high|}\n{% endimage %}");
  imageSnippet.documentation = "插入 image 块";
  items.push(imageSnippet);

  const variableSnippet = new vscode.CompletionItem("variable", vscode.CompletionItemKind.Snippet);
  variableSnippet.insertText = new vscode.SnippetString("{{${1:variable}|${2:defaultValue}}}");
  variableSnippet.documentation = "插入变量插值";
  items.push(variableSnippet);

  return items;
}

export function activate(context: vscode.ExtensionContext): void {
  const diagnostics = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_SOURCE);
  context.subscriptions.push(diagnostics);

  const completionProvider = vscode.languages.registerCompletionItemProvider(
    { language: LANGUAGE_ID },
    {
      provideCompletionItems(document) {
        if (!isTemplateDocument(document)) {
          return [];
        }

        return provideCompletions();
      }
    },
    "{",
    "%",
    "|",
    ":"
  );

  context.subscriptions.push(completionProvider);

  const hoverProvider = vscode.languages.registerHoverProvider({ language: LANGUAGE_ID }, {
    provideHover(document, position) {
      if (!isTemplateDocument(document)) {
        return undefined;
      }

      const range = document.getWordRangeAtPosition(position, /[A-Za-z_][A-Za-z0-9_-]*/);
      if (!range) {
        return undefined;
      }

      const word = document.getText(range);
      const doc = tagDocs[word];
      if (!doc) {
        return undefined;
      }

      return new vscode.Hover(new vscode.MarkdownString(doc), range);
    }
  });

  context.subscriptions.push(hoverProvider);

  const definitionProvider = vscode.languages.registerDefinitionProvider({ language: LANGUAGE_ID }, {
    async provideDefinition(document, position) {
      if (!isTemplateDocument(document)) {
        return undefined;
      }

      const target = findIncludeTargetAtPosition(document, position);
      if (!target) {
        return undefined;
      }

      const uri = await resolveIncludeUri(document, target.includePath);
      if (!uri) {
        return undefined;
      }

      return new vscode.Location(uri, new vscode.Position(0, 0));
    }
  });

  context.subscriptions.push(definitionProvider);

  const documentLinkProvider = vscode.languages.registerDocumentLinkProvider({ language: LANGUAGE_ID }, {
    provideDocumentLinks(document) {
      if (!isTemplateDocument(document)) {
        return [];
      }

      const links: vscode.DocumentLink[] = [];
      for (const tag of collectTagTokens(document)) {
        if (tag.name !== "include") {
          continue;
        }

        const parsed = parseTagContent(tag.raw);
        const includePath = parseIncludeTarget(parsed.arg);
        if (!includePath || !parsed.arg) {
          continue;
        }

        const tagStartOffset = document.offsetAt(tag.range.start);
        const rawArgOffset = tag.raw.indexOf(parsed.arg);
        if (rawArgOffset < 0) {
          continue;
        }

        const pathOffset = tagStartOffset + rawArgOffset + 1;
        const range = new vscode.Range(
          document.positionAt(pathOffset),
          document.positionAt(pathOffset + includePath.length)
        );

        const resolvedPath = path.resolve(path.dirname(document.uri.fsPath), includePath);
        links.push(new vscode.DocumentLink(range, vscode.Uri.file(resolvedPath)));
      }

      return links;
    }
  });

  context.subscriptions.push(documentLinkProvider);

  const validateOnType = () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return true;
    const setting = vscode.workspace.getConfiguration().get<boolean>("gdprompt.validateOnType", true);
    if (!setting && editor.document.uri.fsPath !== "") {
      return false;
    }
    return true;
  };

  const runValidation = (document: vscode.TextDocument) => {
    if (validateOnType()) {
      validateDocument(document, diagnostics);
    }
  };

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(runValidation),
    vscode.workspace.onDidChangeTextDocument((event) => runValidation(event.document)),
    vscode.workspace.onDidSaveTextDocument(runValidation),
    vscode.workspace.onDidCloseTextDocument((document) => diagnostics.delete(document.uri))
  );

  for (const document of vscode.workspace.textDocuments) {
    runValidation(document);
  }
}

export function deactivate(): void {
  // noop
}
