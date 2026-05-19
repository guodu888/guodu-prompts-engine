<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";

type Role = "system" | "user" | "assistant";

type TextPart = {
  type: "text";
  text: string;
};

type ImagePart = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "low" | "high" | "auto";
  };
};

type Message = {
  role: Role;
  content: string | Array<TextPart | ImagePart>;
};

const template = ref(`{% role:system %}
你是一名{{course|初中数学}}老师
{% if level == "advanced" %}
- 你要给出更深入的解题步骤
{% else %}
- 你要用更直观的方式讲解
{% endif %}
{% endrole %}

{% role:user %}
请分析这道题
{% image %}
url: https://example.com/question.png
detail: high
{% endimage %}
{% endrole %}`);

const variablesText = ref(`{
  "course": "英语",
  "level": "advanced"
}`);

const shellRef = ref<HTMLElement | null>(null);
const rightColumnRef = ref<HTMLElement | null>(null);

const leftWidth = ref(58);
const topHeight = ref(42);

let dragMode: "vertical" | "horizontal" | null = null;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function stopDragging() {
  dragMode = null;
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", stopDragging);
  document.body.style.userSelect = "";
  document.body.style.cursor = "";
}

function onPointerMove(event: PointerEvent) {
  if (dragMode === "vertical") {
    const shell = shellRef.value;
    if (!shell) return;

    const rect = shell.getBoundingClientRect();
    const ratio = ((event.clientX - rect.left) / rect.width) * 100;
    leftWidth.value = clamp(ratio, 25, 75);
    return;
  }

  if (dragMode === "horizontal") {
    const right = rightColumnRef.value;
    if (!right) return;

    const rect = right.getBoundingClientRect();
    const ratio = ((event.clientY - rect.top) / rect.height) * 100;
    topHeight.value = clamp(ratio, 20, 80);
  }
}

function startVerticalDrag(event: PointerEvent) {
  event.preventDefault();
  dragMode = "vertical";
  document.body.style.userSelect = "none";
  document.body.style.cursor = "col-resize";
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", stopDragging);
}

function startHorizontalDrag(event: PointerEvent) {
  event.preventDefault();
  dragMode = "horizontal";
  document.body.style.userSelect = "none";
  document.body.style.cursor = "row-resize";
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", stopDragging);
}

onBeforeUnmount(() => {
  stopDragging();
});

const parsedVariables = computed<{
  ok: boolean;
  error: string;
  value: Record<string, unknown>;
}>(() => {
  try {
    const parsed = JSON.parse(variablesText.value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Variables 必须是 JSON 对象。");
    }
    return {
      ok: true,
      error: "",
      value: parsed as Record<string, unknown>
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Variables JSON 解析失败",
      value: {}
    };
  }
});

function resolveVariable(nameRaw: string, fallbackRaw: string | undefined, vars: Record<string, unknown>): string {
  const name = nameRaw.trim();
  const value = vars[name];

  if (value === undefined) {
    return fallbackRaw !== undefined ? fallbackRaw : "";
  }

  if (value === null) {
    return "";
  }

  return String(value);
}

function interpolate(input: string, vars: Record<string, unknown>): string {
  return input.replace(/{{\s*([^{}|]+?)\s*(?:\|\s*([^{}]*?)\s*)?}}/g, (_, name: string, fallback?: string) => {
    return resolveVariable(name, fallback, vars);
  });
}

function parsePrimitiveOperand(raw: string, vars: Record<string, unknown>): string | number | boolean {
  const token = raw.trim();

  const quoted = token.match(/^['\"]([\s\S]*)['\"]$/);
  if (quoted?.[1] !== undefined) {
    return quoted[1];
  }

  if (token === "true") return true;
  if (token === "false") return false;

  if (/^-?\d+(\.\d+)?$/.test(token)) {
    return Number(token);
  }

  const value = vars[token];
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  return resolveVariable(token, undefined, vars);
}

function evalCondition(expr: string, vars: Record<string, unknown>): boolean {
  const match = expr.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(==|!=|>=|<=|>|<)\s*([\s\S]+)$/);
  if (!match) {
    throw new Error(`不支持的条件表达式: ${expr}`);
  }

  const left = parsePrimitiveOperand(match[1] ?? "", vars);
  const op = match[2] ?? "";
  const right = parsePrimitiveOperand(match[3] ?? "", vars);

  if (op === "==") return String(left) === String(right);
  if (op === "!=") return String(left) !== String(right);

  if (typeof left !== "number" || typeof right !== "number") {
    throw new Error(`运算符 ${op} 仅支持数值比较。`);
  }

  if (op === ">") return left > right;
  if (op === "<") return left < right;
  if (op === ">=") return left >= right;
  return left <= right;
}

function renderIfBlocks(input: string, vars: Record<string, unknown>): string {
  let output = input;
  const ifBlockRegex = /{%\s*if\s+([\s\S]*?)\s*%}([\s\S]*?){%\s*endif\s*%}/g;

  let changed = true;
  while (changed) {
    changed = false;
    output = output.replace(ifBlockRegex, (_full, firstCondition: string, body: string) => {
      changed = true;

      const segments = body.split(/({%\s*elseif\s+[\s\S]*?\s*%}|{%\s*else\s*%})/g).filter(Boolean);
      const branches: Array<{ condition: string | null; content: string }> = [];

      let currentCondition: string | null = firstCondition;
      let currentContent = "";

      for (const segment of segments) {
        if (/^{%\s*elseif\s+/.test(segment)) {
          branches.push({ condition: currentCondition, content: currentContent });
          currentContent = "";
          const elseifMatch = segment.match(/{%\s*elseif\s+([\s\S]*?)\s*%}/);
          currentCondition = elseifMatch?.[1]?.trim() ?? "";
          continue;
        }

        if (/^{%\s*else\s*%}/.test(segment)) {
          branches.push({ condition: currentCondition, content: currentContent });
          currentContent = "";
          currentCondition = null;
          continue;
        }

        currentContent += segment;
      }

      branches.push({ condition: currentCondition, content: currentContent });

      for (const branch of branches) {
        if (branch.condition === null) {
          return branch.content;
        }

        if (evalCondition(branch.condition, vars)) {
          return branch.content;
        }
      }

      return "";
    });
  }

  return output;
}

function parseImageBlock(raw: string, vars: Record<string, unknown>): ImagePart {
  const attrs: Record<string, string> = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const sep = trimmed.indexOf(":");
    if (sep <= 0) {
      throw new Error(`Image 属性格式错误: ${trimmed}`);
    }

    const key = trimmed.slice(0, sep).trim();
    const value = trimmed.slice(sep + 1).trim();
    attrs[key] = interpolate(value, vars);
  }

  if (!attrs.url) {
    throw new Error("Image 块缺少 url 属性。");
  }

  const detail = (attrs.detail ?? "auto").toLowerCase();
  if (detail !== "low" && detail !== "high" && detail !== "auto") {
    throw new Error(`Image detail 非法: ${detail}`);
  }

  return {
    type: "image_url",
    image_url: {
      url: attrs.url,
      detail: detail as "low" | "high" | "auto"
    }
  };
}

function renderRoleContent(contentRaw: string, vars: Record<string, unknown>): string | Array<TextPart | ImagePart> {
  const imageRegex = /{%\s*image\s*%}([\s\S]*?){%\s*endimage\s*%}/g;

  const parts: Array<TextPart | ImagePart> = [];
  let lastIndex = 0;

  for (const match of contentRaw.matchAll(imageRegex)) {
    const index = match.index ?? 0;
    const before = contentRaw.slice(lastIndex, index);
    if (before) {
      parts.push({ type: "text", text: interpolate(before, vars) });
    }

    parts.push(parseImageBlock(match[1] ?? "", vars));
    lastIndex = index + (match[0]?.length ?? 0);
  }

  const tail = contentRaw.slice(lastIndex);
  if (tail) {
    parts.push({ type: "text", text: interpolate(tail, vars) });
  }

  if (parts.some((part) => part.type === "image_url")) {
    return parts.filter((part) => part.type !== "text" || part.text.length > 0);
  }

  return parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

function renderTemplate(input: string, vars: Record<string, unknown>): Message[] {
  if (/{%\s*include\s+/.test(input)) {
    throw new Error("Playground 浏览器模式暂不支持 include，请在本地使用 core 引擎验证 include。");
  }

  const withConditions = renderIfBlocks(input, vars);
  const roleRegex = /{%\s*role:(system|user|assistant)\s*%}([\s\S]*?){%\s*endrole\s*%}/g;

  const messages: Message[] = [];
  for (const match of withConditions.matchAll(roleRegex)) {
    const role = (match[1] ?? "") as Role;
    const contentRaw = match[2] ?? "";
    messages.push({
      role,
      content: renderRoleContent(contentRaw, vars)
    });
  }

  if (messages.length === 0) {
    throw new Error("模板中没有解析出 role 块。请至少包含一个 {% role:* %} ... {% endrole %}。");
  }

  return messages;
}

const output = computed(() => {
  const variableState = parsedVariables.value;

  if (!variableState.ok) {
    return {
      ok: false,
      error: variableState.error,
      json: ""
    };
  }

  try {
    const messages = renderTemplate(template.value, variableState.value);
    return {
      ok: true,
      error: "",
      json: JSON.stringify(messages, null, 2)
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "渲染失败",
      json: ""
    };
  }
});
</script>

<template>
  <div style="padding: 1em;">
    在这个页面中可以直接输入模板和变量，实时预览最终 `messages` JSON 结构。
    <ul>
      <li>支持：`role`、变量插值、`if/elseif/else`、`image`</li>
      <li>不支持：`include`（浏览器环境不具备文件系统读取能力）</li>
    </ul>
  </div>
  <div ref="shellRef" class="playground-shell"
    :style="{ '--left-width': `${leftWidth}%`, '--top-height': `${topHeight}%` }">
    <section class="panel editor-panel">
      <header class="panel-head">
        <h3>Template Editor</h3>
        <span class="badge">左侧</span>
      </header>
      <textarea v-model="template" class="editor" spellcheck="false" />
    </section>

    <div class="splitter splitter-vertical" @pointerdown="startVerticalDrag" />

    <section ref="rightColumnRef" class="right-column">
      <div class="panel params-panel">
        <header class="panel-head">
          <h3>Input Variables (JSON)</h3>
          <span class="badge">右上</span>
        </header>
        <textarea v-model="variablesText" class="editor small" spellcheck="false" />
      </div>

      <div class="splitter splitter-horizontal" @pointerdown="startHorizontalDrag" />

      <div class="panel output-panel">
        <header class="panel-head">
          <h3>Rendered Messages</h3>
          <span class="badge">右下</span>
        </header>
        <p v-if="!output.ok" class="error">{{ output.error }}</p>
        <pre v-else>{{ output.json }}</pre>
        <p class="note">提示：该 Playground 运行在浏览器内，`include` 需要文件系统，暂不在此页支持。</p>
      </div>
    </section>
  </div>

  <div class="mobile-hint">
    移动端自动切换为纵向布局；在桌面端可拖拽分隔条调整三栏尺寸。
  </div>
  <div class="mobile-layout">
    <div class="panel">
      <header class="panel-head">
        <h3>Template Editor</h3>
      </header>
      <textarea v-model="template" class="editor" spellcheck="false" />
    </div>
    <div class="panel">
      <header class="panel-head">
        <h3>Input Variables (JSON)</h3>
      </header>
      <textarea v-model="variablesText" class="editor small" spellcheck="false" />
    </div>
    <div class="panel output-panel">
      <header class="panel-head">
        <h3>Rendered Messages</h3>
      </header>
      <p v-if="!output.ok" class="error">{{ output.error }}</p>
      <pre v-else>{{ output.json }}</pre>
    </div>
  </div>
</template>

<style scoped>
.playground-shell {
  --pg-accent: #0d9488;
  --pg-accent-strong: #0f766e;
  --pg-bg-soft: color-mix(in srgb, var(--vp-c-bg-soft) 85%, white 15%);
  --pg-panel-bg: color-mix(in srgb, var(--vp-c-bg) 88%, var(--pg-accent) 12%);
  --pg-border: color-mix(in srgb, var(--vp-c-divider) 70%, var(--pg-accent) 30%);
  --pg-shadow: 0 8px 28px rgba(2, 34, 31, 0.12);
  display: grid;
  grid-template-columns: minmax(280px, var(--left-width)) 12px minmax(340px, 1fr);
  gap: 0;
  min-height: 78vh;
  border: 1px solid var(--pg-border);
  border-radius: 16px;
  overflow: hidden;
  background:
    radial-gradient(1200px 340px at -10% -10%, rgba(13, 148, 136, 0.14), rgba(13, 148, 136, 0) 68%),
    radial-gradient(700px 260px at 120% 100%, rgba(20, 184, 166, 0.18), rgba(20, 184, 166, 0) 72%),
    var(--pg-bg-soft);
  box-shadow: var(--pg-shadow);
}

.panel {
  border: 0;
  padding: 16px;
  background: color-mix(in srgb, var(--pg-panel-bg) 92%, transparent 8%);
  display: flex;
  flex-direction: column;
  min-height: 0;
  backdrop-filter: blur(6px);
}

.output-panel {
  min-height: 0;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.panel h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.15px;
}

.badge {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pg-accent) 20%, white 80%);
  color: var(--pg-accent-strong);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  border: 1px solid color-mix(in srgb, var(--pg-accent) 38%, white 62%);
}

.right-column {
  display: grid;
  grid-template-rows: minmax(140px, var(--top-height)) 12px minmax(180px, 1fr);
  min-height: 0;
}

.editor {
  width: 100%;
  min-height: 0;
  height: 100%;
  border: 1px solid color-mix(in srgb, var(--vp-c-divider) 75%, var(--pg-accent) 25%);
  border-radius: 10px;
  padding: 12px;
  background:
    linear-gradient(180deg, rgba(13, 148, 136, 0.04), rgba(13, 148, 136, 0)),
    var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.52;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
  resize: none;
}

.editor:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--pg-accent) 55%, white 45%);
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.18);
}

.editor.small {
  min-height: 0;
}

.output-panel pre {
  overflow: auto;
  max-height: none;
  height: 100%;
  border: 1px solid color-mix(in srgb, var(--vp-c-divider) 72%, var(--pg-accent) 28%);
  border-radius: 10px;
  padding: 12px;
  background:
    linear-gradient(180deg, rgba(15, 118, 110, 0.05), rgba(15, 118, 110, 0)),
    var(--vp-c-bg);
  margin: 0;
  font-size: 12.5px;
  line-height: 1.52;
  min-height: 0;
}

.error {
  color: #b91c1c;
  font-weight: 600;
  margin: 0 0 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(220, 38, 38, 0.3);
  background: rgba(220, 38, 38, 0.08);
}

.note {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.splitter {
  position: relative;
  background: color-mix(in srgb, var(--vp-c-divider) 55%, var(--pg-accent) 45%);
}

.splitter::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(13, 148, 136, 0.06);
  transition: background 0.15s ease, transform 0.15s ease;
}

.splitter:hover::after {
  background: rgba(13, 148, 136, 0.3);
}

.splitter::before {
  content: "";
  position: absolute;
  background: rgba(13, 148, 136, 0.45);
  border-radius: 999px;
  pointer-events: none;
}

.splitter-vertical {
  cursor: col-resize;
}

.splitter-vertical::before {
  top: 50%;
  left: 50%;
  width: 3px;
  height: 34px;
  transform: translate(-50%, -50%);
}

.splitter-horizontal {
  cursor: row-resize;
}

.splitter-horizontal::before {
  top: 50%;
  left: 50%;
  width: 34px;
  height: 3px;
  transform: translate(-50%, -50%);
}

.mobile-layout,
.mobile-hint {
  display: none;
}

@media (max-width: 1024px) {
  .playground-shell {
    display: none;
  }

  .mobile-hint {
    display: block;
    margin: 10px 0;
    color: var(--vp-c-text-2);
    font-size: 12px;
  }

  .mobile-layout {
    display: grid;
    gap: 14px;
  }

  .mobile-layout .panel {
    border: 1px solid var(--pg-border);
    border-radius: 12px;
    background: color-mix(in srgb, var(--vp-c-bg-soft) 90%, var(--pg-accent) 10%);
    box-shadow: 0 5px 16px rgba(15, 23, 42, 0.08);
  }

  .mobile-layout .editor {
    min-height: 220px;
  }

  .mobile-layout .editor.small {
    min-height: 140px;
  }

  .mobile-layout .output-panel pre {
    height: auto;
    max-height: 360px;
    overflow: auto;
  }
}
</style>
