# CLI

## 安装

在仓库内开发时：

```bash
bun run --filter gdprompt-cli build
```

全局安装后直接使用命令：

```bash
bun add -g gdprompt-cli
gdprompt
```

未提供参数时会打印 usage 并以非 0 退出。

## 命令

### render

```bash
gdprompt render <templatePath> [--base-dir <dir>] [--vars <json|file>]
```

示例：

```bash
gdprompt render main.md --base-dir ./prompts --vars '{"course":"英语"}'
gdprompt render main.md --base-dir ./prompts --vars ./vars.json
```

输出为 JSON 格式 messages。

### validate

```bash
gdprompt validate <templatePath> [--base-dir <dir>]
```

示例：

```bash
gdprompt validate main.md --base-dir ./prompts
```

- 校验通过：`"valid": true`
- 校验失败：返回 `errors` 并以非 0 退出

## 退出码

- `0`：命令执行成功，且（对于 `validate`）模板校验通过
- `1`：参数缺失、命令不支持、渲染失败、或校验失败

## CI 使用

```bash
gdprompt validate main.md --base-dir ./prompts
```

命令在校验失败时返回非 0 退出码，可直接用于 CI 阶段卡口。
