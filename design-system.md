# MeCollage 设计系统（已迁移至 docs/design/）

> **唯一事实源：[`assets/css/design-tokens.css`](assets/css/design-tokens.css)（273 个 `--mc-*` token）。**
> 本文件已重写为入口指针；旧版内容（47 个变量、旧组件规范）已删除，**不要再按本文件做设计**。

## 先读这些

| 文档 | 用途 |
|---|---|
| [`docs/design/DESIGN-TOKENS.md`](docs/design/DESIGN-TOKENS.md) | token 规范：三层结构、273 个 token 总表、使用规则、G0–G4 存量迁移、审计门禁 |
| [`docs/design/COMPONENT-RECIPES.md`](docs/design/COMPONENT-RECIPES.md) | 组件配方：页面骨架/导航/按钮/卡片/表单/上传区/toast/footer/404/博客排版/专题页主题色 |
| [`docs/decisions/ADR-0006-design-token-single-source.md`](docs/decisions/ADR-0006-design-token-single-source.md) | 决策记录（Proposed）：单一事实源、渐进迁移、审计基线、「只统一、不重设计」原则 |
| [`scripts/design-audit/run-token-audit.mjs`](scripts/design-audit/run-token-audit.mjs) | 防漂移审计门禁（默认含 `DESIGN-TOKENS.md` 与 token 文件一致性检查） |
| [`docs/design/token-preview.html`](docs/design/token-preview.html)（DESIGN-TOKENS.md §11.2 记录的可视化预览页） | token 可视化预览（本地打开；不是事实源，事实源是 token 文件） |

新 UI / 样式改动流程：读 `DESIGN-TOKENS.md` → 只用 `var(--mc-*)` → 跑
`node scripts/design-audit/run-token-audit.mjs`（必须 PASS）→ 多语言 5 份同步（`/`、`/zh/`、`/tw/`、`/ja/`、`/es/`）→ 分支 → Preview → 证据。

## 旧版本文档的 3 类错误（不要再引用旧内容）

1. **变量未实现**：旧版声明 47 个变量，其中 42 个在产物 CSS 中从未定义（`--radius-*`、`--spacing-*`、`--breakpoint-*` 等）。
2. **主色与产物相反**：旧版写 `--primary-color: #8fd68f`（绿），而 `assets/index-vAuRGWiM.css` 的 `:root` 实际是 `#4A90E2`（蓝）；页面标题绿是硬编码的另一个值，不是该变量。
3. **事实不符**：旧版断点 576/1200 不存在（实际主断点是 768/992）；圆角 8/12/20/30 与产物实际值（6/10/12/14/15/16/18/20/24/30/50/999）不符。

## 变更记录

- 2026-11-06：重写为入口指针；旧版（47 变量 42 未实现、`--primary-color` 与产物相反）内容删除，规范迁移至 `docs/design/DESIGN-TOKENS.md`（ADR-0006 / L-20261106-30）。
