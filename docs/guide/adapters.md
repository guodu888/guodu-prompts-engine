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

## AI SDK Adapter

```ts
import { toAISDKMessages } from "guodu-prompt-engine-ai-sdk";
import { TemplateEngine } from "guodu-prompt-engine-core";

const engine = new TemplateEngine({ baseDir: "./prompts" });
const coreMessages = await engine.render("demo.md");
const aiSdkMessages = toAISDKMessages(coreMessages);
```

映射规则：

- 角色保持一致（`system/user/assistant`），`tool/tool_result` 映射为 `tool`
- `image_url -> image`
- `tool_result` 映射为 `tool-result` content part（`toolCallId/toolName/result`）
