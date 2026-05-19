# 快速开始

## 安装

```bash
bun add guodu-prompt-engine-core
bun add guodu-prompt-engine-langchain
bun add guodu-prompt-engine-ai-sdk
```

## 初始化引擎

```ts
import { TemplateEngine } from "guodu-prompt-engine-core";

const engine = new TemplateEngine({
  baseDir: "./prompts"
});

const messages = await engine.render("demo01.md", {
  course: "英语"
});
```

## 启动文档站

在本仓库开发时：

```bash
bun run docs:dev
```

## 构建文档站

```bash
bun run docs:build
bun run docs:preview
```
