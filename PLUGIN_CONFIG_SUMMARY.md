# Guodu Prompt Engine VS Code 扩展配置总结

## 已完成的配置更新

### 1. 插件基本信息
- **插件名称**: `guodu-prompt-engine-vscode`
- **显示名称**: Guodu Prompt Engine
- **文件后缀**: `.gdprompt`
- **语言 ID**: `gdprompt`
- **基础语法**: Markdown

### 2. 文件关联配置
- **唯一支持后缀**: `.gdprompt`
- **scopeName**: `source.gdprompt`
- **TextMate 语法文件**: `syntaxes/guodu-template.tmLanguage.json`
- **语法继承**: 先加载 `text.html.markdown`，再叠加自定义标签

### 3. 更新的配置项

#### VS Code 设置
- `gdprompt.validateOnType` (boolean): 控制是否在输入时验证文件

#### 激活事件
- `onLanguage:gdprompt`: 当打开 `.gdprompt` 文件时激活

### 4. 已验证的功能

✅ 语法高亮 - 通过 TextMate 语法规则  
✅ 实时诊断 - 标签/变量/条件验证  
✅ 智能补全 - role、if、include、image 等标签的 snippet 补全  
✅ include 跳转 - 支持 F12 和可点击文件链接跳转到被包含文件  
✅ 可折叠块 - role/if/image 成对标签块支持折叠  
✅ 悬浮提示 - 标签文档提示  

## 编译状态
✅ TypeScript 编译通过  
✅ 所有包 typecheck 通过  

## 使用方式

### 开发调试
1. 在 VS Code 中打开该项目
2. 在 `packages/vscode-extension` 文件夹中按 `F5` 启动调试扩展宿主窗口
3. 创建或打开任何 `.gdprompt` 文件，扩展会自动激活

### 构建
```bash
bun run build:vscode
```

### 类型检查
```bash
bun run typecheck
```

## 配置文件路径

- **扩展配置**: `packages/vscode-extension/package.json`
- **语言配置**: `packages/vscode-extension/language-configuration.json`
- **TextMate 语法**: `packages/vscode-extension/syntaxes/guodu-template.tmLanguage.json`
- **扩展源码**: `packages/vscode-extension/src/extension.ts`
- **根工作区配置**: `package.json`（包含构建脚本）

## 后缀说明

当前插件只支持 `.gdprompt` 文件后缀，不再提供其它后缀兼容或自定义映射。

## Markdown 说明

`.gdprompt` 文件仍然可以正常使用 Markdown 的标题、列表、加粗、斜体、代码块和链接语法；模板标签和变量只是额外叠加的能力。
