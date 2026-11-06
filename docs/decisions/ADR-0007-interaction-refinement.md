# ADR-0007: 交互精修 R0/R1 —— 工具优先、产品级反馈与移动布局门禁

- 状态：**Accepted（已实施并上线生产）** — 2026-11-06：本地四门禁全绿 → Preview 38/0/5（exit 0）→ 维护者「批准生产部署」→ 生产验收 **41/0/2（exit 0）** → 维护者「批准」合并 PR #3（rebase → main `afbdb92`）
- 日期：2026-11-06
- 分支：`docs/design-tokens`（基线 `fedc3ee` → 3 commits → PR #3 → main `afbdb92`）；生产部署 commit `28bd972`，生产别名 `https://www.mecollage.top`
- 关联：[INTERACTION-AUDIT.md](../design/INTERACTION-AUDIT.md)（审计与 P0/P1）、[prototypes/README.md](../design/prototypes/README.md)（原型与截图）、[PAGE-PATTERNS.md](../design/PAGE-PATTERNS.md)（页面族/内联块）、[DESIGN-TOKENS.md](../design/DESIGN-TOKENS.md) §4.8/§4.9、[ADR-0006](ADR-0006-design-token-single-source.md)、L-20261106-31~36

## 背景

ADR-0006 解决的是「设计值没有单一事实源」；[INTERACTION-AUDIT.md](../design/INTERACTION-AUDIT.md) 解决的是「视觉统一了，但产品还不像一个工具」。审计（代码层 + 本地渲染层 1440×900 / 390×844，离线 CDP）给出的核心事实：

1. **主操作被埋在首屏以下**：移动端首页上传区 top = **1148px**（1.36 屏），工具页 = **1193px**；页面顶部叠了全局导航 **270px** + 标题 181px + 工具导航 **374px** + 首页重复工具卡 **218px**；桌面工具页上传区也在 y=485–607px（INTERACTION-AUDIT §1）。
2. **导航两层且互相竞争**：全局 nav + 工具 nav + 首页 2 张重复工具卡；"Home" 出现 2–3 次，工具名不统一（Square Image / Square Image Converter / Collage Maker）。
3. **反馈原始**：`assets/js/mecollage-main.js`（HEAD `fedc3ee`）有 **15 处阻塞式 `alert()`**（行号 316/320/327/345/1848/1852/1907/1949/1957/1994/2065/2067/2071/2089/2127），多数硬编码英文、本地化页不翻译；站点里有 `.toast` 样式但**没有任何 JS 使用**（死代码）；导出无进度/成功反馈，AI 模型下载只有按钮文字变化。
4. **关键操作不可见/不可用**：撤销/重做只有键盘快捷键（无按钮、无提示）；移动端**不能拖动排序**（只实现 HTML5 drag，无 touch/pointer）；部分触控目标 24–36px（< 44px）。
5. **移动端不是"移动优先"**：270px 堆叠导航、无折叠菜单；编辑器初始 HTML 首屏是营销与 SEO 内容。
6. **改造前移动端存在横向溢出**：390 宽下 7 页溢出（首页 `scrollWidth=608`，+218px），320 宽下 30 个指南/专题页各溢出 11px；固定壁纸层只覆盖视口，横向拖动会露出 `html` 深色兜底（[MOBILE-OVERFLOW.md](../../audit/design-migration/MOBILE-OVERFLOW.md)）。

同时，两个"旧机制"让修复本身有风险：① functional harness 的 IDX-19/IDX-21 断言直接读取 **`alert` dialog 文本**（HEAD `scripts/functional-audit/run-tests.mjs:787-820,874-898`），行为一改就会**假 FAIL**；② 设计 token 体系只覆盖 HTML/CSS，**JS 直接写内联样式会绕过 token**（`createAddImageButton()`/`removeBtn` 曾写死 `#f1f5f9`/`#94a3b8`/`#64748b`/`rgba(255,255,255,.95)` 等，见 L-31）。

结论：这不是"加功能"，而是把**工具顶到第一屏、把反馈做成产品级、把移动布局变成可执行门禁**，并且必须同时修"验收口径"和"审计盲区"，否则改一次就误报一次/漂移一次。

## 决策

> 实施状态（2026-11-06 03:2x，本地工作区）：**D1–D6 均已实施**（R0 完成、R1 完成；R2 未做）；验收证据见「验证」。

### D1 移动端「工具优先」：CSS order 覆盖层，DOM/SEO 文本不变（已实施）

- 仅 `@media (max-width: 768px)`：首页 `order` 为 **工具区/上传 → 页头 → 工具导航 → 重复工具卡 → 内容/FAQ → footer**；工具页为 **紧凑页头 → 工具区（upload → editor）→ 横向工具导航 → 意图条 → SEO/FAQ → footer**（`assets/css/components.css` §17）。
- 页面类型由 `assets/js/ui.js` 在 `body` 上打标：`mc-collage-page`（编辑器首页）/ `mc-tool-page`（4 个工具页），CSS 只对这些 body 类生效。
- **DOM 结构、文本内容、URL、head/SEO 全部不动**；只改视觉顺序（CSS `order`），可爬文本完整保留。桌面（>768px）布局零变化。
- 理由：直接重排 95 页 HTML 会同时动 SEO 文本顺序、5 语言副本与 functional 断言，风险远大于收益；CSS order 覆盖层可回滚（移除 components.css 引用即恢复）。

### D2 导航收敛：移动端单层顶栏 + 折叠菜单，GitHub 退出主导航（已实施）

- ≤768px 顶栏高度 ≤ `--mc-mobile-nav-height`（56px）：品牌 + 语言 + 菜单按钮；导航链接折叠进面板（`body.mc-nav-open`），GitHub 移入菜单/页脚；桌面端导航与既有结构不变。
- 工具导航在移动端改为**横向可滚动 pill 行**（可横滑、44px 高），不再竖排 374px；首页重复工具卡由 3 步说明（Add → Arrange → Export）替代（原型方案，见 prototypes/README.md §2.1）。
- 保持真实 `<a href>` 与既有语言切换结构（SEO，L-09/L-24）。

### D3 反馈产品化：统一 toast + i18n + 状态反馈，禁止 alert（已实施）

- 新增 `assets/js/ui.js`（`window.mcUI`）：`toast(message,{type,single...})` 四态（success/info/error/undo）、同屏最多 3 条、`role="status"` + `aria-live="polite"`、可带 action/关闭；`announcePhotosAdded(n)`（toast + 滚动画布 + 聚焦）、`setBusy(el,busy,label)`、`mobileNav`、`onReady`。
- `mecollage-main.js` 的 15 处 `alert()` 全部替换为 toast（文案走 i18n：`toast.*`/`export.*`/`ai.*`/`beforeunload.unsaved`）；**不保留 alert 回退**：`ui.js` 缺失时用 main.js 内置的非阻塞 fallback toast（`#mc-toast-stack` 视觉由 components.css §14 提供）。
- 导出：按钮 `disabled` + `aria-busy` + 进度提示 → 成功 toast（文件名/大小）/失败 toast + 重试；上传后滚动+聚焦+「N 张照片已添加」；有未导出照片时 `beforeunload` 提示。
- 可见 Undo/Redo 按钮（`#undoBtn`/`#redoBtn`，禁用态可见、保留快捷键）；图标按钮补 `aria-label`。
- i18n 新增 `toast.*` / `toolbar.*` / `export.*` / `ai.*` / `nav.menu|close` / `photos.*` / `beforeunload.*`，5 语言（en/zh/zh-tw/ja/es）同步补齐。

### D4 直接操作与可访问性：触控拖拽、44px 热区、语言菜单键盘模型（已实施）

- 照片排序在保留 HTML5 drag（鼠标路径）之外增加 **pointer events 触控/笔路径**（长按 250ms 启动、`setPointerCapture`、ghost、`elementFromPoint` 找目标后复用既有 reorder 逻辑）；触控目标统一 ≥ `--mc-tap-target-min`（44px）——视觉尺寸可不动，用 padding/`::after` 扩热区。
- 语言菜单补键盘模型：`Esc` 关闭并焦点回按钮、`ArrowUp/Down`、`Home/End`、打开时聚焦首项；不改变真实链接结构。
- 原则：**只统一、不重设计**（ADR-0006 D4 延续）——不加新渐变/发光/动画库，不引入 UI 框架，不删 SEO 文本。

### D5 资源与性能：AI 大库懒加载，导出依赖保持静态（已实施）

- 删除 5 个首页初始 HTML 中的 `onnxruntime-web` / `@vladmandic/face-api` 静态 `<script>`；改为 `ensureLibs()` 在用户点击 AI 功能时动态加载（loading、失败 toast + 重试、只加载一次、失败清缓存可重试）。
- `html2canvas` 保留静态引入（导出是核心路径，动态化收益小、失败风险大）。
- 不改导出结果字节：白底、`scale 2`、PNG `quality 1.0`、工具页 canvas 默认值全部保持不变（ADR-0006 D4）。

### D6 门禁与验收口径：新增布局门禁 + token 审计覆盖 JS + 行为变更同步断言（已实施）

- 新增 `scripts/design-audit/check-layout.mjs`（v1.0.0）：A 横向溢出（四宽度，`scrollWidth - innerWidth > 1` → FAIL）、B 固定壁纸层（非 404 页 `position:fixed` + 覆盖视口 + `wallImage`）、C 触控目标 ≥44×44（默认 WARN，`--strict-touch` 升级 FAIL）、D 禁止 `alert()`（`assets/js/*.js`，注释除外）、E 初始 HTML 不得预加载 AI 大库（onnxruntime/face-api）。默认 390 全量 + 代表页 1440/360/320；`--full` 四宽度全量；exit 0/1/2。
- `run-token-audit.mjs` v1.1 增加 **JS 运行时裸色扫描**（`fillStyle/borderColor/color/gradient:` 对象字面量与 `.style.X = '#...'`、`.style.cssText`），堵住 v1.0 只扫 HTML/CSS 的盲区（L-31）。
- **行为变更必须同步验收断言**（L-35）：R0 把 alert→toast 的同一次变更内，把 harness IDX-19/IDX-21 从"只读 dialog 文本"改为 `readFeedback()`（dialog + `#mc-toast-stack` 文本，保留旧口径兼容）。
- 门禁写入 GOVERNANCE §4.1 C2 专项矩阵与 AGENTS H11；发布前由 runbook §4.6 统一执行。

## 备选方案与拒绝理由

| 方案 | 拒绝理由 |
|---|---|
| 重写 95 页 HTML 把工具区放到最前 | 会同时改动 5 语言副本、SEO 文本顺序、functional/US SEO 断言与可爬性；与 ADR-0006「渐进、可回滚」冲突。用 CSS order 覆盖层可达同一视觉目标且零 DOM 风险 |
| 移动端删除/隐藏 SEO 长文 | 伤害可爬文本与既有排名（INTERACTION-AUDIT §7 明确「只调顺序不删文本」）；且 Phase B/C/E 的 SEO 资产会被破坏 |
| 引入 UI 框架/组件库（React/Vue/Tailwind 等） | 项目零构建、无依赖是刻意约束（AGENTS §3）；会改变部署链路与验证方式，且本次只需 CSS/原生 JS |
| 保留 alert，仅换文案/翻译 | 阻塞式反馈在移动端体验差、无法带 action/撤销、无法被 toast 门禁覆盖；与「产品级反馈」目标冲突 |
| 用 `overflow-x: hidden` 掩盖移动溢出 | 只是裁剪，仍会裁掉内容/破坏 fixed 层语义；必须修根因（容器宽度/表格/长词/网格 minmax） |
| 用 JS 重排 DOM 实现工具优先 | 首屏执行前仍是旧顺序、爬虫看到 DOM 顺序、与 CSS order 方案相比收益低风险高；CSS 方案桌面零影响 |
| 行为改了但不动 harness 断言 | 会产生假 FAIL（旧断言读 `page.dialogs`）或假 PASS（断言过期），验收失真（L-35） |

## 影响

- **页面/代码**：94 个页面接入 `design-tokens.css` + `components.css` + `assets/js/ui.js`（`inject-ui.mjs --apply` **94/94** 页，404 排除；404 保持独立主题）；`components.css` 新增 §14–§18（toast/移动导航/触控热区/工具优先/空位占位）；新增 `assets/js/ui.js`；`mecollage-main.js` 行为与反馈改造；5 个首页 HTML 增加 Undo/Redo 按钮并移除 AI 大库静态引用；i18n 5 语言补键。设计 token 新增 `--mc-color-info` / `--mc-color-warning` / `--mc-tap-target-min` / `--mc-toast-radius` / `--mc-toast-max-width` / `--mc-mobile-nav-height` 等反馈与触控 token，以及壁纸压暗 `--mc-surface-scrim`，总数 **273**（`DESIGN-TOKENS.md` §3）。未改 URL/信息架构/文案内容（仅修复部分文案缺陷）/广告/Publisher ID/导出默认值。
- **门禁**：新增 `check-layout.mjs`；`run-token-audit.mjs` 增加 JS 运行时扫描；AGENTS H11、GOVERNANCE C2 交互矩阵、runbook §4.6 同步。
- **风险**：R1 视觉顺序变化（移动端）需 5 语言 × 首页/工具页逐页截图核对（已按 390×844 抽样，见验证）；`ui.js` 已注入 94/94 页（幂等；`inject-ui.mjs --remove` 可回滚）；`aria-label`/i18n 需 5 语言一致；触控拖拽只在本地模拟，真机手感需 Preview/真机抽查。
- **部署面**：`assets/js/ui.js`、`assets/css/components.css` 为新增公开静态文件（会部署）；`docs/`、`scripts/`、`AGENTS.md` 等已在 `.vercelignore`。

## 验证

- 本地门禁（离线；Node v24.19.0 + 本机 Chrome；不联网）：
  ```bash
  node scripts/design-audit/run-token-audit.mjs    # token 273 个；含 JS 运行时扫描；期望无新增漂移
  node scripts/design-audit/check-layout.mjs       # 溢出/壁纸/触控/alert/AI 预加载；期望 PASS（触控 WARN 允许）
  node scripts/functional-audit/run-tests.mjs      # 期望 0 FAIL（IDX-19/IDX-21 已按 toast 口径更新）
  node scripts/seo-audit/run-seo-checks.mjs        # 期望 32 项 0 FAIL（R1 只视觉重排，DOM/文本不变）
  node scripts/design-audit/check-layout.mjs --full --json audit/design-migration/r1/layout-check-full.json \
    --md audit/design-migration/r1/layout-check-full.md
  ```
- **最终门禁结果（2026-11-06 03:2x，本地工作区，未提交）**：
  - `run-token-audit.mjs`：**PASS** —— token 273 / hash `3db11395ede1` / 扫描 103 文件 / token 外颜色 338（**JS 裸色 0**）/ font-size 18 / 圆角 153 / 内联 style 1560；`--check-docs` PASS；基线已 `--update-baseline` 刷新（103 文件、tokenHash `3db11395ede1`）。
  - `check-layout.mjs --full`（95 页 × 1440/390/360/320）：**PASS 5 / FAIL 0 / WARN 0** —— A 横向溢出 0、B 固定壁纸全过（404 豁免）、C 触控目标全过、D alert 0、E AI 预加载 0；证据 `audit/design-migration/r1/layout-check-full.{json,md}`。
  - `functional-audit/run-tests.mjs`：**51 PASS / 0 FAIL / 2 WARN**（共 53；WARN = IDX-13 导出跨环境观感、ENV-02 人工确认项，均非产品 FAIL）；证据 `audit/evidence/phase-f/browser/report.{md,json}`（43 张截图）。
  - `seo-audit/run-seo-checks.mjs`：**32 PASS / 0 FAIL / 0 WARN**；证据 `audit/evidence/phase-b/seo-report.{md,json}`。
  - `inject-ui.mjs --apply`：**94/94 页**插入（404 排除；`--remove --apply` 可逐字节回滚）；报告 `audit/design-migration/r0/ui/inject-ui-apply.{md,json}`。
- **R1 关键实测（390×844，本地 CDP）**：首页上传区 top **1148 → 109px**；工具页上传区 **1193 → 259–434px**（square 434 / roundedcorners 358 / es blurredframe 259）；移动顶栏 **270 → 60px**；工具导航 **374 → 62px** 横向滚动；首页 390 横向溢出 **+218 → 0**；桌面 >768 布局不变。截图 `audit/design-migration/r1/*-mobile.png`，汇总 `audit/design-migration/R1-RESULTS.md` §2。
- **实现中发现并回灌的 P0（导出全白，L-36）**：R0 上传后 `scrollIntoView` 使 `scrollY≈450–500`，html2canvas 1.4.1 `foreignObjectRendering:true` 默认按 `window.pageXOffset/pageYOffset` 计算克隆偏移，而导出 wrapper 是 `position:fixed;left:0;top:0` → 内容被移出画布，导出纯白（FNV hash `d2b3285`；本地复算 0 非白像素）。修法：导出 options **仅新增 `scrollX:0, scrollY:0`**（其余白底/scale 2/quality/1.0/useCORS/allowTaint/foreignObjectRendering 与 HEAD 逐字一致）；修复后 IDX-14/15/16 的导出像素 hash 随参数变化且 ≠ 纯白，`audit/design-migration/r0/export-result-1200.png` 正常。规则：导出/截图类功能必须在“页面已滚动”状态验收（已写入 L-36、AGENTS §8 第 16 条、runbook §4.6）。
- 已知证据（改造前/修复后，代码层 + 本地渲染层）：移动溢出修复后 **390/360/320/1440 × 94 页 0 溢出**（MOBILE-OVERFLOW.md）；壁纸固定性/覆盖 **280/280 断言 PASS**、scrim 38% 后亮云区最差对比度 **3.75:1 → 7.55:1**（WALLPAPER.md §4；独立复核 min 2.16→4.91、median 2.75→5.92）；`alert()` **15→0**（HEAD `git show HEAD:assets/js/mecollage-main.js` vs 当前工作区）。
- 未做：Preview 部署、真机 iOS Safari/Android 抽查（含触控拖拽手感）、AdSense/GA4 未改动确认（H5）、GSC 影响观察。

## 未做 / 后续

- **R0/R1 已完成**（2026-11-06）：`ui.js` 注入 94/94 页（404 排除）；`alert()` 15→0；可见 Undo/Redo（5 首页 toolbar）、beforeunload、上传后 toast+滚动+focus；移动导航 ≤768 单行 **60px**（原 270px）、语言菜单底部抽屉+键盘、触控 ≥44px、占位白色方块→深色玻璃（JS 裸色 0）；R1 工具优先（首页上传 **1148→109px**、工具页 **1193→259–434px**、工具导航 **374→62px**、390 溢出 0、桌面 >768 不变）；导出禁用+进度+成功/失败重试（并修滚动后空白导出：html2canvas `scrollX/scrollY:0`）；AI 库懒加载可重试；触控拖拽手柄长按 250ms + pointer capture。
- **R2（战略）不做**：全站单层 IA 重构、博客搜索、Contact 表单（或改名 Support）、移动端 blur 性能预算、移动菜单打开时锁 body 滚动；需产品决策 + ADR（INTERACTION-AUDIT §5）。
- 待 Preview/真机确认：触控拖拽从照片其他区域长按可能被页面滚动截获（`pointercancel` 安全清理，未真机测）、AI 模型真实网络下载/进度、`prefers-reduced-motion`、语言菜单屏幕阅读器、iOS Safari `position:fixed` 行为；`404.html` 独立主题未注入 ui.js/components（C3 边界，保持独立）。
- i18n：新增键 5 语言已补；历史遗留的 5 个 `blog.ai_enhancements.*` 键在 zh-tw/ja/es 缺失属既有问题（非本次引入），由 SEO/i18n 后续统一处理。

## 回滚

- **视觉层**：移除 94 页的 `components.css` / `ui.js` 引用即恢复到 ADR-0006 G1 状态（`inject-ui.mjs --remove` 可回滚注入；`components.css` 变量/选择器均限定在统一层，不改变存量 HTML/CSS）。
- **单点回滚**：`git revert` 对应提交；R1 CSS 与 R0 JS 应分提交，回滚粒度 = 单批。
- **不改数据**：导出图片字节、画布默认值、URL、广告/统计均未变，回滚无需数据迁移。
- 回滚后按 runbook §4.1 复跑 `verify-site` + §4.6 交互矩阵，确认移动端溢出/壁纸/反馈无回归。


---

## 发布记录（2026-11-06，已上线）

| 阶段 | 结果 | 证据 |
|---|---|---|
| 本地四门禁 | token PASS（273/`3db11395ede1`/103 文件/JS 0）；functional 51/0/2；SEO 32/0/0；check-layout --full 5/0/0（95 页 × 1440/390/360/320） | R1-RESULTS.md、`audit/design-migration/r1/` |
| Preview | **38 PASS / 0 FAIL / 5 WARN（exit 0）**；WARN 为跨主机检查 N/A | `audit/evidence/phase-a/verification/preview-28bd972.*` |
| 生产批准 | 维护者明确批准「批准生产部署」（H1 记录见 `audit/evidence/design-tokens/production-approval.md`） | 同上 |
| 生产部署 | `npx vercel deploy --prod --yes`，Ready 14s；URL `mecollage-11sx4fpuj-...vercel.app` → 别名 `www.mecollage.top` | `prod-deploy-28bd972.log` |
| 生产验收 | **41 PASS / 0 FAIL / 2 WARN（exit 0）**；冒烟全 PASS；生产渲染 390 首页 nav 60px / upload 109px / 0 溢出 | `prod-verify-28bd972-*.json/md`、`prod-smoke-28bd972.txt`、`prod-render/` |
| 合并 | 维护者「批准」→ `gh pr merge 3 --rebase`；main `afbdb92`（线性 3 commits）；生产 commit 与 main tree 完全一致（`git diff` 为空） | PR #3、`merge-approval.md` |

回滚：Vercel Dashboard → 上一版生产 → Promote/Rollback；或 revert 三个提交后重新部署；仅回滚注入用 `inject-ui.mjs --remove --apply`。真机/Preview 复核项（iOS Safari 菜单/导出、触控拖拽手感、AI 真实网络）保持开放。
