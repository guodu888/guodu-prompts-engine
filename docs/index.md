# Guodu Prompt Engine

面向 AI 大模型的消息模板引擎，目标输出结构对齐 OpenAI `chat/completions` 的 `messages` 参数，同时支持跨生态适配：

- `guodu-prompt-engine-core`
- `guodu-prompt-engine-langchain`
- `guodu-prompt-engine-ai-sdk`

## 你可以用它做什么

- 用模板生成结构化 `messages`
- 复用 prompt 片段（`include`）
- 按变量分支渲染（`if/elseif/else`）
- 支持文本 + 图片的多模态消息
- 一键转换到 LangChain / AI SDK 消息结构

## Monorepo 结构

```text
packages/
  core/
  langchain/
  ai-sdk/
```

## 快速入口

- 从 [快速开始](/guide/getting-started) 开始
- 查看 [模板语法](/guide/template-syntax)
- 阅读 [Core API](/guide/api)
