# Adapters

## LangChain Adapter

```ts
import { toLangChainMessages } from "guodu-prompt-engine-langchain";
import { TemplateEngine } from "guodu-prompt-engine-core";

const engine = new TemplateEngine({ baseDir: "./prompts" });
const coreMessages = await engine.render("demo.md", { topic: "grammar" });
const langchainMessages = toLangChainMessages(coreMessages);
```

映射规则：

- `system -> system`
- `user -> human`
- `assistant -> ai`
- `tool/tool_result -> tool`
- `image_url` 保持为 `image_url`（url 保留，detail 忽略）
- `tool_result` 内容映射为 tool message 文本内容，并保留 `tool_call_id/name/status`
- 若 `tool/tool_result` 消息中没有结构化 `tool_result` part，则会回退到 `tool_call_id: "unknown"`

## AI SDK Adapter

```ts
import { toAISDKMessages } from "guodu-prompt-engine-ai-sdk";
import { TemplateEngine } from "guodu-prompt-engine-core";

const engine = new TemplateEngine({ baseDir: "./prompts" });
const coreMessages = await engine.render("demo.md");
const aiSdkMessages = toAISDKMessages(coreMessages);
```

映射规则：

- 角色映射：`system/user/assistant` 保持一致，`tool/tool_result` 映射为 `tool`
- 用户消息：`image_url -> image`
- assistant/system 消息中的 `image_url` 会降级为文本 URL（AI SDK 对这两类角色不接受图片 part）
- `tool_result` 映射为 `tool-result` content part（`toolCallId/toolName/result/isError`）
- 若 `tool` 消息缺少结构化 `tool_result` part，会回退为 `toolCallId/toolName = "unknown"`
