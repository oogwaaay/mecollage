# Phase G 摘要：Design Token 体系 + R0/R1 交互改造（已上线）

> 2026-11-06 · 维护者批准生产部署 · 生产验收 **41 PASS / 0 FAIL / 2 WARN（exit 0）**
> 关联：ADR-0006（token 单一事实源）、ADR-0007（交互精修）、[DESIGN-TOKENS.md](../design/DESIGN-TOKENS.md)、[INTERACTION-AUDIT.md](../design/INTERACTION-AUDIT.md)、[prototypes](../design/prototypes/README.md)

## 1. 做了什么

### Design Token 单一事实源（G0–G4）

- 新增 `assets/css/design-tokens.css`：**273 个 `--mc-*` token**（primitive / semantic / component 三层），改设计值只改这一处。
- 新增 `assets/css/components.css`：壁纸固定层 + scrim、排版、导航、按钮/卡片/表单、博客/FAQ/表格、focus、动效降级、Toast、移动导航、工具优先布局、触控目标、深色空位。
- **94 个内容页**（root + zh/tw/ja/es + blog + public/tools）接入统一层并完成 6,955 处精确 token 化；`404.html` 保持独立主题。
- 工具：`scripts/design-audit/run-token-audit.mjs`（含 JS 运行时裸色扫描 + 基线 + `--check-docs`）、`scripts/design-system/migrate.mjs`。

### R0 交互（反馈/可访问性）

- `alert()` **15 → 0**：`window.mcUI.toast`（四态 / aria-live / 最多 3 条 / action + 重试）。
- 可见 **Undo/Redo**、未保存 `beforeunload`、上传后 toast + 滚动 + 焦点。
- 移动导航 **270 → 60px**（品牌 + 语言 + 汉堡），语言菜单底部抽屉 + 键盘模型；触控目标 ≥44px；JS 裸色 5 → 0；空位白方块 → 深色玻璃。

### R1 交互（工具优先 / 导出 / AI / 触控）

- 移动端工具优先布局：首页上传区 **1148 → 109px**、工具页 **1193 → 259–434px**、工具导航 **374 → 62px**；DOM/SEO 文本与桌面布局不变。
- 导出：禁用/aria-busy/进度/成功（尺寸+大小）/失败重试；修复 html2canvas foreignObject + 滚动导致的全白导出（L-36）。
- AI 大库懒加载（onnxruntime/face-api）；触控拖拽排序（手柄长按 + pointer capture，鼠标 drag 保留）。
- 新增 `scripts/design-audit/check-layout.mjs`（95 页 × 4 宽度：溢出/壁纸/触控/alert/AI 预加载）与 `scripts/design-system/inject-ui.mjs`（94/94 页注入/回滚）。

## 2. 上线记录

| 阶段 | 结果 |
|---|---|
| 本地 | functional 51/0/2；SEO 32/0/0；token PASS；check-layout 5/0/0 |
| Preview | 38 PASS / 0 FAIL / 5 WARN（WARN 为跨主机检查 N/A） |
| 生产 | **41 PASS / 0 FAIL / 2 WARN**；冒烟全 PASS；生产渲染 390 首页 nav 60px / upload 109px / 0 溢出 |
| 合并 | PR #3 rebase → main `afbdb92`；生产 commit 与 main tree 一致 |

## 3. 治理内化

- AGENTS **H11**：UI/交互改动必须同时过 token + functional + check-layout + 多语言/SEO 四道门禁；禁止 alert / JS 裸设计值 / 移动溢出 / 触控 <44px；行为变更同批更新断言；导出须在滚动后验收。
- 教训 **L-31 ~ L-36**（索引 36 条）：JS 运行时裸色、alert 反馈、SEO-first 布局、移动溢出、断言同步、html2canvas 滚动全白。
- GOVERNANCE C2 UI/交互矩阵、Preview runbook §4.6、ADR-0007 发布记录。

## 4. 未做 / 后续

- R2：单层 IA 重构、博客搜索、Contact 表单、移动端 blur 性能预算。
- 真机复核：iOS Safari 菜单/滚动后导出、触控拖拽手感、AI 真实网络下载。
- `404.html` 未注入统一层（独立主题，保持现状）。
