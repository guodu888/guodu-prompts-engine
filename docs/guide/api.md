# Core API

## TemplateEngine

```ts
new TemplateEngine(options: TemplateEngineOptions)
```

### options

- `baseDir: string` 模板根目录
- `cache?: Cache` 自定义缓存实现
- `strictUndefinedVariables?: boolean` 缺失变量时是否抛错
- `variableResolver?: (variablePath, variables) => unknown | Promise<unknown>` 缺失变量时的自定义解析器

## render

```ts
render(templatePath: string, variables?: Record<string, unknown>): Promise<Message[]>
```

说明：

- 支持 Promise 变量与 async `variableResolver`
- 支持 `include`（文件系统模式）

## renderTemplateString

```ts
renderTemplateString(
  template: string,
  variables?: Record<string, unknown>,
  options?: {
    strictUndefinedVariables?: boolean;
    includeResolver?: (includePath: string) => string;
    variableResolver?: (variablePath: string, variables: Record<string, unknown>) => unknown | Promise<unknown>;
  }
): Message[]
```

说明：

- 这是浏览器/纯字符串场景的同步渲染 API
- 如果模板里使用 `{% include %}`，必须提供 `includeResolver`
- 不支持 Promise 变量值；检测到 async 变量会抛错，建议改用 `TemplateEngine.render`

## validateTemplate

```ts
validateTemplate(templatePath: string, options: { baseDir: string; checkIncludes?: boolean }): Promise<ValidationResult>
```

仅做语法与结构校验，不执行渲染。

`ValidationResult` 结构：

```ts
interface ValidationIssue {
  type: "syntax" | "structure" | "include";
  message: string;
  filePath: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
}
```

## 核心类型

```ts
type MessageRole = "system" | "user" | "assistant" | "tool" | "tool_result";

interface Message {
  role: MessageRole;
  content: string | Array<TextContent | ImageContent | ToolResultContent>;
}

interface TextContent {
  type: "text";
  text: string;
}

interface ImageContent {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "low" | "high" | "auto";
  };
}

interface ToolResultContent {
  type: "tool_result";
  tool_call_id: string;
  tool_name?: string;
  output: unknown;
  is_error?: boolean;
}
```

## 渲染约束

- 顶层非空文本必须放在 `role` 块内，否则抛错
- `image` 块必须位于 `role` 块内部
- 不支持嵌套 `role`
- `for` 可迭代数组或对象（对象按 value 迭代）

## 缓存实现

```ts
import { MemoryCache, LRUCache } from "guodu-prompt-engine-core";

const memory = new MemoryCache();
const lru = new LRUCache({ maxSize: 100 });
```
