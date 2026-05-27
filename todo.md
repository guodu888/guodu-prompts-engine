# guodu-prompts-engine 功能待办清单

## P0（高优先级）

- [x] 支持 `{% for %}` 循环语法（含 `for ... in ...` 与 `endfor`）
- [x] 支持点语法变量访问（如 `{{user.name}}`、`{{config.model}}`）
- [x] 条件表达式支持取反 `!` 与 `in` 操作符
- [x] 增加异步变量解析能力（变量可来自 `Promise` / async resolver）
- [x] 增加模板验证 API（仅校验语法与结构，不执行渲染）
- [x] 支持 `tool` / `tool_result` 等工具调用相关消息角色
- [x] 为 `langchain` 与 `ai-sdk` 适配器补齐工具调用消息映射
- [x] 提供 CLI（如 `render` / `validate`）用于本地调试与 CI

## P1（中优先级）

- [ ] 支持变量过滤器（如 `trim`、`upper`、`truncate`）
- [ ] 支持 `{% set %}` 模板内变量赋值
- [ ] 支持模板继承（`extends` / `block`）
- [ ] 增加批量渲染 API（并发渲染多个模板）
- [ ] 增加渲染生命周期 hooks（before/after/onInclude）
- [ ] strict 模式增强（未使用变量、include 规则等）


## P2（工程化与体验）

- [ ] VSCode 扩展：变量名补全
- [ ] VSCode 扩展：include 路径跳转（Go to Definition）
- [ ] VSCode 扩展：渲染预览面板
- [ ] 增加 watch 模式（模板变更自动重渲染）
- [ ] 建立 Playground 页面（在线编辑模板并查看消息输出）
- [ ] include 路径安全加固（防 path traversal）
- [ ] 增加渲染耗时统计与可观测元信息
- [ ] 增加模板注册表（命名模板管理）

## 多模态扩展（可选）

- [ ] 在 `{% image %}` 之外，扩展 `{% audio %}` / `{% video %}` 标签
- [ ] 明确多模态标签在不同模型适配器中的降级策略
