# 测试与发布

## 本地测试

```bash
bun run test
bun run typecheck
bun run build
```

## 覆盖率

```bash
bun test packages/*/src --coverage
```

## 当前测试策略

- parser 分支与错误路径
- renderer 插值与条件评估
- include 安全与循环检测
- cache 行为（memory / lru）
- core -> adapter 集成转换
- README 示例场景回归

## 发布建议

发布前建议执行：

1. `bun run test`
2. `bun run typecheck`
3. `bun run build`
4. `bun run docs:build`
