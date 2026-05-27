# 模板语法

## 变量插值

```md
你是一名{{course}}老师
你是一名{{course|初中数学}}老师
模型为：{{config.model}}
```

支持点语法访问嵌套对象：<code v-pre>{{user.name}}</code>、<code v-pre>{{config.model}}</code>。

## 角色块

```md
{% role:system %}
你是一名优秀的 AI 助手
{% endrole %}

{% role:user %}
你好
{% endrole %}
```

支持角色：`system`、`user`、`assistant`、`tool`、`tool_result`。

## for 循环

```md
{% role:user %}
{% for item in items %}
- {{item.name}}
{% endfor %}
{% endrole %}
```

`for ... in ...` 支持数组与对象（对象按 value 迭代）。

## 条件渲染

```md
{% if course == "小学语文" %}
- 需要正确解析汉语拼音
{% elseif course == "初中数学" %}
- 公式输出为 span 格式
{% else %}
- 使用通用模式
{% endif %}
```

支持比较操作符：`==`、`!=`、`>`、`<`、`>=`、`<=`、`in`。

支持逻辑操作符与括号分组：

| 操作符 | 含义 | 优先级 |
|--------|------|--------|
| `!`    | 非（NOT） | 最高（单目） |
| `&&`   | 与（AND） | 高 |
| `\|\|`   | 或（OR）  | 低 |
| `()`   | 分组括号  | 最高 |

```md
{# 逻辑与 #}
{% if level == "advanced" && score > 60 %}
...高级且及格...
{% endif %}

{# 逻辑或 #}
{% if level == "advanced" || level == "expert" %}
...高级或专家...
{% endif %}

{# 括号分组，改变运算优先级 #}
{% if (level == "advanced" || level == "expert") && score > 90 %}
...高级/专家且高分...
{% elseif level == "beginner" || score < 60 %}
...新手或低分...
{% else %}
...其他情况...
{% endif %}

{# ! 与 in #}
{% if !(user.level == "beginner") && "name" in user %}
...允许进入...
{% endif %}
```

> `&&` 优先级高于 `||`，括号可以显式改变求值顺序。

## 注释

```md
{# 这是注释，不会输出 #}
```

支持多行注释：

```md
{#
	这是多行注释
	不会进入渲染结果
#}
```

## 异步变量

`TemplateEngine.render` 支持 Promise 变量值与 async resolver。`renderTemplateString` 是同步 API，不支持 Promise 变量。

## 文件包含

```md
{% include "./partials/prompt.md" %}
```

约束：

- include 路径必须带引号
- include 文件必须位于 `baseDir` 范围内
- 自动检测循环 include
- 在 `renderTemplateString` 中若使用 include，需提供 `includeResolver`

## 多模态图片

```md
{% role:user %}
题目信息如下：
{% image %}
url: https://example.com/image.png
detail: high
{% endimage %}
{% endrole %}
```

`detail` 支持：`low`、`high`、`auto`（默认值）。

## 结构约束

- 顶层非空文本必须放在 `role` 块内
- `image` 块必须位于 `role` 块内部
- 不支持嵌套 `role` 块
