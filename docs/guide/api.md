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

## validateTemplate

```ts
validateTemplate(templatePath: string, options: { baseDir: string; checkIncludes?: boolean }): Promise<ValidationResult>
```

仅做语法与结构校验，不执行渲染。

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

## 缓存实现

```ts
import { MemoryCache, LRUCache } from "guodu-prompt-engine-core";

const memory = new MemoryCache();
const lru = new LRUCache({ maxSize: 100 });
```
