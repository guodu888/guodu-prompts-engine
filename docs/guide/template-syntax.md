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

当前支持比较操作符：`==`、`!=`、`>`、`<`、`>=`、`<=`。

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
