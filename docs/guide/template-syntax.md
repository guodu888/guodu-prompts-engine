# 模板语法

## 变量插值

```md
你是一名{{course}}老师
你是一名{{course|初中数学}}老师
```

## 角色块

```md
{% role:system %}
你是一名优秀的 AI 助手
{% endrole %}

{% role:user %}
你好
{% endrole %}
```

支持角色：`system`、`user`、`assistant`。

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

支持比较操作符：`==`、`!=`、`>`、`<`、`>=`、`<=`。

支持逻辑操作符与括号分组：

| 操作符 | 含义 | 优先级 |
|--------|------|--------|
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
```

> `&&` 优先级高于 `||`，括号可以显式改变求值顺序。

## 文件包含

```md
{% include "./partials/prompt.md" %}
```

约束：

- include 路径必须带引号
- include 文件必须位于 `baseDir` 范围内
- 自动检测循环 include

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
