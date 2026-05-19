# Core API

## TemplateEngine

```ts
new TemplateEngine(options: TemplateEngineOptions)
```

### options

- `baseDir: string` 模板根目录
- `cache?: Cache` 自定义缓存实现
- `strictUndefinedVariables?: boolean` 缺失变量时是否抛错

## render

```ts
render(templatePath: string, variables?: Record<string, unknown>): Promise<Message[]>
```

## 核心类型

```ts
type MessageRole = "system" | "user" | "assistant";

interface Message {
  role: MessageRole;
  content: string | Array<TextContent | ImageContent>;
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
```

## 缓存实现

```ts
import { MemoryCache, LRUCache } from "guodu-prompt-engine-core";

const memory = new MemoryCache();
const lru = new LRUCache({ maxSize: 100 });
```
