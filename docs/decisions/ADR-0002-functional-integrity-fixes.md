# ADR-0002 — Phase F 功能真实性修复（预览/导出几何统一、布局重写、文案对齐）

| 字段 | 值 |
|---|---|
| 状态 | **Proposed**（分支已实现并通过浏览器回归 52 PASS / 0 FAIL / 1 WARN；生产未部署，待维护者批准后转 Accepted） |
| 日期 | 2026-11-05 |
| Preview 分支部署 | `fix/functional-integrity` @ `5aa864a` → `https://mecollage-ehvuw4gb4-keeey-is-projects.vercel.app`（state success） |
| Preview 验收 | 部署层：**38 PASS / 0 FAIL / 5 WARN**（与 Phase A 一致：安全头/404/重定向/遗留文件/资产）；功能层：浏览器回归 **52 PASS / 0 FAIL / 1 WARN**。证据：`audit/evidence/phase-f/verification/preview.{md,json}` + browser-regression-final |
| 决策者 | 维护者（批准）+ 实施者（Lead/AI） |
| 关联 | [ADR-0001](ADR-0001-phase-a-security-hardening.md)、`audit/PHASE-F-REPORT.md`、`docs/lessons/L-20261105-19..22` |

## 背景

用户反馈大量功能“没有真正实现或实现有 bug”，尤其“按比例做圆/方、排列样式”。Phase F 静态审计 + 真实浏览器自动化确认 13 个 P0/P1 功能缺陷（首页 3 组根因 + 工具页 6 个 P0），另有大量文案夸大。核心模式是：**预览与导出各自维护一套几何公式**、**CSS 约束覆盖 JS 计算的尺寸**、**宣称的选项实际未接线**。

## 决策

### D1. 预览与导出必须共用同一变换（不再各写一套公式）

- `squarecrop.downloadImage()` 改为复用预览变换的同比放大（`outScale=max(O/W,O/H)*zoom`、pan 归一）；
- `square.drawCroppedToCanvas()` 同理；
- `blurredframe` 抽取 `getTargetRatio()` / `computeFrameSize()` / `drawScene()`，预览与导出共用；
- 修复后用浏览器断言验证“预览/导出构图一致”，而不是只看导出尺寸。

### D2. 首页尺寸与布局以 JS 为唯一来源，运行时覆盖 CSS 限制

- `renderCollage()` 设置 `max-height:none`、`padding:0`，按视口计算并严格保持比例；
- 重写 `calculateGridLayout()`：容量必须 ≥ 图片(+加号)，最小化空格与单元格形变；
- 移除会导致行重叠的 `min-height:100px`；单图的“+”按钮移到网格外；
- 导出容器尺寸严格等于网格尺寸（消除 box-sizing/padding 裁切）。

### D3. 确认的 P0/P1 功能 bug 直接修；产品语义做最小决策

- square resize：按文案实现“真拉伸铺满”（不是改文案为白底 contain）；
- squarecrop：缩放下限 100%（cover 语义，避免露边），pan 加边界；
- blurredframe：输出保持所选比例，主图 contain，背景 cover，默认 mainScale=80；
- roundedcorners 1080：最长边 1080 等比输出（不再强制 16:9）。

### D4. 文案必须与实现一致（不做虚假承诺）

- HEIC → WEBP（多数浏览器不能解码 HEIC）；删除“20+ templates”“PNG or JPG”“unlimited images”等夸大；
- roundedcorners 删除不存在的“纯色背景/color picker”；
- blurredframe 的“边框 5–40%/模糊 1–100”改为实际控件语义“主图缩放 50–200%/模糊 0–200”。

### D5. 验收门禁：浏览器回归必须 0 FAIL

- `scripts/functional-audit/run-tests.mjs`（零依赖 CDP）作为功能层门禁，修复后 **52 PASS / 0 FAIL / 1 WARN**；
- WARN 仅限 AI 成功路径/真实下载/触屏/跨浏览器观感等无法 headless 自动判定的项，列入手工 QA 清单；
- 部署层仍由 `scripts/verify-site.mjs` 在 Preview/生产验证（本 ADR 不改 404/安全头/重定向）。

## 备选方案与取舍

| 方案 | 取舍 |
|---|---|
| 只改文案、保留白底 contain | 会让“拉伸”承诺消失，且未解决导出几何错误；不选 |
| 直接把预览 canvas 放大当导出 | 简单但受预览分辨率限制；不选（仍用独立输出尺寸 + 共用变换） |
| 引入 Playwright/Puppeteer | 违背零依赖约束且需下载浏览器；不选（自建 CDP） |
| 重做整个编辑器架构 | 超出 Phase F 范围；不选（最小改动 + 回归验证） |

## 后果（正面 / 负面）

- 正面：用户看到的功能与描述一致；导出与预览一致；真实浏览器回归可重复；后续修改有门禁。
- 负面/代价：新增/修改测试与文档；`fix/functional-integrity` 分支改动面较大（31 文件，主要 5 个工具页 + 首页 JS + i18n 文案）；完整 undo/触屏交互仍留待 Phase G。

## 验证

- 基线（`8a92d87`）：42 PASS / 7 FAIL / 4 WARN；
- 修复后：**52 PASS / 0 FAIL / 1 WARN（exit 0）**；
- 证据：`audit/evidence/phase-f/verification/browser-regression-{baseline,final}.{md,json}`、`audit/PHASE-F-REPORT.md`。

## 上线与回滚

- 仍遵循 H1/H2：分支 → Preview → 维护者批准 → 生产；生产部署为手动（L-18）。
- 回滚：`git revert` 本分支提交；生产若异常，Vercel Dashboard 回滚上一部署 + 重跑回归。
