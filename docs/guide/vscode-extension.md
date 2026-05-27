# VS Code 扩展

`guodu-prompt-engine-vscode` 为 `.gdprompt` 文件提供一体化编辑体验，语法基于 Markdown 并叠加模板标签能力。

## 功能

- 语法高亮：变量、标签、角色值高亮。
- 诊断提示：未知标签、缺少结束标签、角色非法、include 路径不合法、image 属性错误等。
- include 跳转：支持 F12 与可点击链接跳转到 `{% include %}` 目标文件。
- 代码折叠：`role` / `if` / `image` 成对标签支持折叠。
- 片段补全：`role`、`if/elseif/else`、`for`、`include`、`image`、变量插值。
- 悬浮文档：核心标签与逻辑运算符提示。
- 内置格式化器：提供语义安全优先的 `.gdprompt` 格式化。

## 格式化器

扩展注册了 `.gdprompt` 的 Document Formatter：

- 规范标签空白：`{% ... %}`
- 规范控制标签：`role/if/elseif/else/endif/for/endfor/include/image/endimage`
- 规范 image 属性行为 `key: value`
- 清理行尾空白并保留单个文件末尾换行
- 模板存在语法问题时自动进入最小安全格式化模式

可配置项：

- `gdprompt.formatter.enabled`（默认 `true`）
- `gdprompt.formatter.normalizeIncludeQuotes`（默认 `true`）
- `gdprompt.formatter.maxConsecutiveBlankLines`（默认 `1`）
- `gdprompt.formatter.alignControlTags`（默认 `false`）

## 开发与构建

```bash
bun run --filter guodu-prompt-engine-vscode build
```

打包 VSIX：

```bash
bun run package:vscode
```

VSIX 文件会生成在 `packages/vscode-extension` 目录下。
