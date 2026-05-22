# gdprompt Formatter 标准（V1）

本规范用于 `packages/vscode-extension` 中 `.gdprompt` 文件格式化器设计与实现。

## 1. 目标与原则

1. 语义不变：格式化前后渲染结果必须等价。
2. 幂等：同一文件连续格式化两次，第二次不应产生 diff。
3. 可预测：同一输入在任何机器上输出一致。
4. 渐进增强：先实现安全规则（V1），再逐步增加激进规则（V2+）。

## 2. 规则优先级

- P0（必须）：绝不改变模板语义。
- P1（应当）：统一标签写法与空白风格。
- P2（可选）：在不破坏 Markdown 结构的前提下优化可读性。

发生冲突时，按 `P0 > P1 > P2` 执行。

## 3. 语义安全边界（P0）

格式化器在 V1 必须遵守以下边界：

1. 不修改普通文本内容（包括空格、标点、换行顺序），除非该行完全由模板标签组成。
2. 不重排块结构顺序：`role/if/for/image/include` 的相对顺序不可调整。
3. 不改写变量表达式内部字符：`{{ ... }}` 中的变量路径、默认值、过滤语法（未来）保持原样。
4. 不改写条件表达式语义：`if/elseif` 中仅允许做外层空白整理，不做运算符重写。
5. 不跨越 Markdown 语义边界：不得把正文改为列表/代码块，也不得破坏现有列表/引用/表格结构。

## 4. 标签规范（P1）

### 4.1 通用标签空白

所有模板标签统一为：

- 起始：`{%` 后一个空格
- 结束：`%}` 前一个空格

示例：

- ` {%if a%} ` -> `{% if a %}`
- ` {%   endif%} ` -> `{% endif %}`

### 4.2 标签名规范

- 标签名统一小写：`role/endrole/if/elseif/else/endif/for/endfor/include/image/endimage`。
- 角色值统一小写：`system/user/assistant/tool/tool_result`。

### 4.3 role 标签

标准形态：

```gdprompt
{% role:system %}
...
{% endrole %}
```

约束：

1. `role:` 后不留空格。
2. `:` 两侧不出现多余空格。
3. role 行独占一行。

### 4.4 if / elseif / else / endif

标准形态：

```gdprompt
{% if condition %}
...
{% elseif otherCondition %}
...
{% else %}
...
{% endif %}
```

约束：

1. `if` 与条件之间保留一个空格。
2. `elseif` 与条件之间保留一个空格。
3. `else/endif` 不带参数。
4. `elseif/else/endif` 与对应 `if` 对齐（同列起始）。

### 4.5 for / endfor

标准形态：

```gdprompt
{% for item in items %}
...
{% endfor %}
```

约束：

1. `for` 后表达式统一为 `item in iterable`。
2. `in` 两侧一个空格。
3. `endfor` 独占一行。

### 4.6 include

标准形态：

```gdprompt
{% include "./path/to/file.gdprompt" %}
```

约束：

1. include 参数必须带引号。
2. V1 统一为双引号。
3. include 标签独占一行。

### 4.7 image / endimage

标准形态：

```gdprompt
{% image %}
url: https://example.com/image.png
detail: auto
{% endimage %}
```

约束：

1. `image/endimage` 各自独占一行。
2. image 块内属性行格式统一为 `key: value`。
3. key 统一小写，当前支持 `url`、`detail`。
4. `:` 后保留一个空格。

## 5. 空白与换行（P1）

1. 统一使用 `\n`（LF）。
2. 文件末尾保留单个换行。
3. 行尾空白移除。
4. 连续空白行最多保留 1 行。
5. 纯标签块之间建议保留 1 个空行，提高可读性（不进入正文段落内部）。

## 6. 缩进策略（V1 保守）

为了避免破坏 Markdown 语义，V1 默认不对正文做自动缩进调整。

仅允许：

1. 纯标签行按父级结构做对齐（可选，默认关闭）。
2. `image` 属性行可固定为无前导缩进或与 `image` 同列（项目内二选一，保持幂等）。

建议 V1 采用：不改正文缩进，仅规范标签与空白。

## 7. 注释处理

1. 模板注释 `{# ... #}` 保留原内容，不改写内部文本。
2. 仅规范注释标签外层空白：`{# note #}`。
3. 多行注释保持原行序，不重排。

## 8. 失败回退与鲁棒性

1. 当文档存在未闭合标签或解析错误时，formatter 进入“最小修复模式”：
   - 只做安全空白清理（行尾空白、文件末尾换行）。
   - 不做结构重排与标签归一化。
2. 任何无法确定语义安全的场景，必须放弃该处改写。

## 9. 验收标准

1. 幂等测试：输入执行两次格式化，输出一致。
2. 语义测试：格式化前后调用 core 渲染，消息结构深度相等。
3. 兼容测试：覆盖 `role/if/for/include/image/comment/variable` 混合场景。
4. 错误输入测试：未闭合 `if/role/image/for` 时不应产生破坏性修改。

## 10. 建议的配置项（VS Code）

- `gdprompt.formatter.enabled`（默认 `true`）
- `gdprompt.formatter.normalizeIncludeQuotes`（默认 `true`）
- `gdprompt.formatter.maxConsecutiveBlankLines`（默认 `1`）
- `gdprompt.formatter.alignControlTags`（默认 `false`）

## 11. 非目标（V1）

1. 不做表达式语义级重写（如 `a&&b` -> `a && b` 以外的逻辑变形）。
2. 不做变量默认值内容改写。
3. 不做跨段落内容合并/拆分。
4. 不做自动补全缺失结束标签。
