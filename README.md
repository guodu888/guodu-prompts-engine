# AI大模型提示词模板引擎

一个强大的模板引擎，用于生成符合AI大模型接口标准的 `messages` 参数。支持变量插值、条件渲染、文件包含、多角色消息和多模态内容等功能。

## 特性

- ✅ **变量插值** - 支持 `{{variable}}`、`{{variable|defaultValue}}` 与点语法 `{{user.name}}`
- ✅ **文件包含** - 使用 `{% include "./file.md" %}` 引入其他模板文件
- ✅ **条件渲染** - 支持 `!`、`in`、`&&`、`||`、`()` 逻辑组合
- ✅ **循环渲染** - 支持 `{% for item in items %}...{% endfor %}`
- ✅ **多角色消息** - 支持 `system`, `user`, `assistant`, `tool`, `tool_result`
- ✅ **多模态内容** - 支持文本和图片混合内容
- ✅ **异步变量解析** - 变量可来自 `Promise` 或 async resolver
- ✅ **模板校验 API** - 仅校验语法与结构，不执行渲染
- ✅ **CLI** - 提供 `render` / `validate` 用于本地调试与 CI
- ✅ **智能缓存** - 基于文件 mtime 的自动缓存机制，文件更新时自动失效
- ✅ **类型安全** - 完整的 TypeScript 类型定义

## 安装

```bash
bun add guodu-prompt-engine-core
bun add guodu-prompt-engine-langchain
bun add guodu-prompt-engine-ai-sdk
```

## Monorepo 架构

项目现在采用 Bun workspace monorepo，拆分为四个包：

- `guodu-prompt-engine-core`：模板引擎核心能力与消息类型定义
- `guodu-prompt-engine-langchain`：将 core 输出转换为 LangChain 可用消息格式
- `guodu-prompt-engine-ai-sdk`：将 core 输出转换为 AI SDK 可用消息格式
- `gdprompt-cli`：命令行渲染与校验工具

目录结构：

```text
packages/
  core/
  langchain/
  ai-sdk/
  cli/
```

依赖方向：

```text
langchain adapter ---> core
ai-sdk adapter   ---> core
```

当前阶段 adapter 仅提供转换函数，不包含 render + transform 组合 API。

## 快速开始

```ts
import { TemplateEngine } from 'guodu-prompt-engine-core';

const engine = new TemplateEngine({
  baseDir: './prompts',
});

const messages = await engine.render('demo01.md', {
  course: '英语',
});

console.log(messages);
// [
//   { role: 'system', content: '...' },
//   { role: 'user', content: '...' },
//   { role: 'assistant', content: '...' }
// ]
```

## 模板语法

### 1. 变量插值

使用双大括号语法进行变量插值，支持默认值：

```markdown
你是一名{{course}}老师
你是一名{{course|初中数学}}老师  <!-- 带默认值 -->
```

### 2. 角色定义

使用 `{% role:roleName %}` 定义消息角色：

```markdown
{% role:system %}
你是一名优秀的AI助手
{% endrole %}

{% role:user %}
你好
{% endrole %}

{% role:assistant %}
你好！有什么可以帮助你的吗？
{% endrole %}
```

### 3. 文件包含

使用 `{% include %}` 引入其他文件：

```markdown
{% role:user %}
{% include "./demo03-1.md" %}
{% endrole %}
```

### 4. 条件渲染

支持条件判断和分支，以及 `&&`、`||`、`()` 逻辑运算：

```markdown
{% if course == "小学语文" %}
- 需要正确解析汉语拼音
{% elseif course == "初中数学" %}
- 公式输出为`<span data-latex="公式" data-type="inline-math"></span>`格式
{% endif %}

{# 使用 && 和 || 进行逻辑组合 #}
{% if (level == "advanced" || level == "expert") && score > 90 %}
- 开启高阶模式
{% elseif level == "beginner" || score < 60 %}
- 开启基础辅导模式
{% else %}
- 使用标准模式
{% endif %}
```

比较操作符：`==`、`!=`、`>`、`<`、`>=`、`<=`、`in`  
逻辑操作符：`!`（非）、`&&`（与）、`||`（或）、`()`（括号分组，`&&` 优先级高于 `||`）

### 5. 循环渲染

```markdown
{% role:user %}
{% for item in items %}
- {{item.name}}
{% endfor %}
{% endrole %}
```

### 6. 异步变量

```ts
const engine = new TemplateEngine({
  baseDir: "./prompts",
  variableResolver: async (variablePath) => {
    if (variablePath === "profile.name") return "Alice";
    return undefined;
  }
});
```

### 7. 图片内容

使用 `{% image %}` 标签添加图片：

```markdown
{% role:user %}
题目信息如下：
{% image %}
url: https://example.com/image.png
detail: high
{% endimage %}
{% endrole %}
```

图片标签支持以下属性：
- `url`: 图片URL（必需）
- `detail`: 图片细节级别，可选值：`low`, `high`, `auto`（默认：`auto`）

## API 文档

### TemplateEngine

模板引擎主类。

#### 构造函数

```ts
new TemplateEngine(options: TemplateEngineOptions)
```

**参数：**
- `options.baseDir` (string): 模板文件的基础目录
- `options.cache` (Cache, 可选): 自定义缓存实现，默认为 `MemoryCache`

#### 方法

##### render

渲染模板并生成消息数组。

```ts
render(templatePath: string, variables?: Record<string, any>): Promise<Message[]>
```

**参数：**
- `templatePath` (string): 模板文件路径（相对于 baseDir）
- `variables` (Record<string, any>, 可选): 模板变量对象

**返回：**
- `Promise<Message[]>`: 符合AI大模型接口标准的消息数组

**示例：**

```ts
const messages = await engine.render('demo01.md', {
  course: '英语',
  level: '初级',
});
```

##### validateTemplate

```ts
import { validateTemplate } from 'guodu-prompt-engine-core';

const result = await validateTemplate('demo01.md', {
  baseDir: './prompts'
});
```

仅做语法与结构校验，不执行渲染。

## CLI

```bash
gdprompt render <templatePath> [--base-dir <dir>] [--vars <json|file>]
gdprompt validate <templatePath> [--base-dir <dir>]
```

### 缓存

引擎内置两种缓存实现：

#### MemoryCache

基于内存Map的缓存实现，总是检查文件的 mtime 以确保缓存准确性。

```ts
import { MemoryCache } from 'guodu-prompt-engine-core';

const engine = new TemplateEngine({
  baseDir: './prompts',
  cache: new MemoryCache(),
});
```

#### LRUCache

基于LRU算法的缓存实现，自动淘汰最久未使用的缓存项，控制内存使用。

```ts
import { LRUCache } from 'guodu-prompt-engine-core';

const engine = new TemplateEngine({
  baseDir: './prompts',
  cache: new LRUCache({ maxSize: 100 }),
});
```

### 类型定义

```ts
// 消息角色
type MessageRole = 'system' | 'user' | 'assistant' | 'tool' | 'tool_result';

// 消息接口
interface Message {
  role: MessageRole;
  content: MessageContent; // string | (TextContent | ImageContent | ToolResultContent)[]
}

// 图片内容
interface ImageContent {
  type: 'image_url';
  image_url: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}

// 文本内容
interface TextContent {
  type: 'text';
  text: string;
}

// 工具结果内容
interface ToolResultContent {
  type: 'tool_result';
  tool_call_id: string;
  tool_name?: string;
  output: unknown;
  is_error?: boolean;
}
```

## 完整示例

### 示例 1: 简单单轮对话

**模板文件 (demo01.md):**

```markdown
{% role:system %}
# 角色
你是一名优秀的{{course}}老师，擅长{{course}}教学。

# 能力
- 能够根据学生的需求，提供个性化的{{course}}教学服务。
{% endrole %}

{% role:user %}
# 用户
你好老师
{% endrole %}

{% role:assistant %}
你好呀，有什么可以帮你的吗？
{% endrole %}
```

**使用：**

```ts
const messages = await engine.render('demo01.md', {
  course: '英语',
});
```

### 示例 2: 多模态内容

**模板文件 (demo02.md):**

```markdown
{% role:user %}
题目信息如下：
{% image %}
url: https://example.com/image.png
detail: high
{% endimage %}
{% endrole %}
```

### 示例 3: 文件包含和条件渲染

**模板文件 (demo04.md):**

```markdown
{% role:system %}
你是一名{{course|初中数学}}老师
{% if course == "小学语文" %}
- 需要正确解析汉语拼音
{% elseif course == "初中数学" %}
- 公式输出为`<span data-latex="公式" data-type="inline-math"></span>`格式
{% endif %}
{% endrole %}
```

## 缓存机制

引擎使用基于文件修改时间（mtime）的智能缓存机制：

1. **自动检测文件更新** - 每次读取文件时检查 mtime，如果文件已更新则自动清除缓存
2. **内存优化** - 使用 LRU 缓存可以限制缓存大小，自动淘汰最久未使用的项
3. **准确性保证** - 即使使用缓存，也会验证文件是否被外部修改

## 开发

```bash
# 安装所有 workspace 依赖
bun install

# 全量类型检查
bun run typecheck

# 构建全部包
bun run build

# 测试
bun test
```

## 许可证

MIT
