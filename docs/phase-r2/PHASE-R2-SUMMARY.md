# Phase R2 摘要：移动触控回归 + 博客搜索 + 性能预算 + 导航角色分离（本地验收完成，未上线）

> 2026-11-06 · R2-A/B/C：分支 `feat/r2-mobile-performance-blog-search`（`main` `94c4cb6` 起）；导航角色分离 Phase 1+2A：分支 `feat/nav-role-separation`（`main` `5ad5adf` 起）· 状态：**本地门禁通过、未 commit / 未部署**；Phase 2B / Contact 表单 / 真机**待用户/维护者决策**
> 关联：[ADR-0008](../decisions/ADR-0008-r2-mobile-touch-performance-blog-search.md)、[ADR-0009](../decisions/ADR-0009-nav-role-separation-phase1.md)、[ADR-0007](../decisions/ADR-0007-interaction-refinement.md)、[INTERACTION-AUDIT.md](../design/INTERACTION-AUDIT.md) R2 路线、[prototypes/r2/README.md](../design/prototypes/r2/README.md)、L-20261106-37/38/39/40

## 1. 做了什么

### R2-A 移动触控回归 + 两处 CSS 修复（补 R1 的移动端自动化缺口）

- 新增 `scripts/functional-audit/run-mobile-touch.mjs`（v1.0.0）：零依赖 CDP，390×844 + `setTouchEmulationEnabled` + `Input.dispatchTouchEvent`，6 个用例 MT-01~MT-06（导航结构/开合、语言抽屉、触控拖拽、滚动后导出、触控目标）。
- 首跑发现两个**静态首屏门禁测不到**的产品缺陷并修复（`assets/css/components.css`）：
  - §15：≤768 `body .ghibli-nav { position: relative }` → 导航展开面板从页面底部 **y=4524** 回到顶栏下方 **y=60**；
  - §17：底栏满宽 + 内部横向滚动 + `.toolbar-btn` 44×44 → 8 个按钮从 **14–24px** 回到 **44px**（页面仍 0 横向溢出）。
- 结果：**6 PASS / 0 FAIL / 0 WARN**；规则回灌 L-38。

### R2-B 博客列表客户端搜索（渐进增强）

- `blog/index.html` 增加搜索面板（`type="search"` + 关联 label + `role="status" aria-live="polite"` 结果数 + 空状态/清除）；新增 `assets/js/blog-search.js`；`components.css §20` 视觉；i18n 5 语言新增 `blog.search.*` **5 键**（含单数 `result_one`）。
- 匹配标题 + 摘要（NFKC + 大小写不敏感 + 空白分词 AND、CJK 原样）；**不改 URL/head/链接**（不做 `?q=`）；无 JS 时 8 篇全可见；无 i18n 时英文兜底。
- 顺带补齐 zh-tw/ja/es 缺失的 5 个 `blog.ai_enhancements.*` 键（Phase C 遗留），5 语言键集合已齐。
- 结果：CDP **26 PASS / 0 FAIL**；functional **IDX-24/25** PASS；layout-check 95 页 PASS 5/0/0。

### R2-C 战略原型 + 性能预算（不实现 IA/Contact）

- `docs/design/prototypes/r2/`：`single-layer-nav` / `contact-form` / `blog-search` / `index` + README + review/clean 截图（零外部依赖，复用 CDP 捕获）。
- 新增 `scripts/design-audit/check-performance.mjs` + `performance-budget.json`：A 静态 gzip 体积、B 390×844 渲染结构（DOM/深度/backdrop/样式表/脚本）、C 滚动 A/B 参考（INFO，不设门槛）。
- **不做无证据的 blur 缩减**：headless A/B 实测无差异（avg 16.66 vs 16.63ms、p95 16.98 vs 16.91ms），规则回灌 L-37；性能判定改为预算门禁（当前 PASS，A 项 1 WARN 旧 bundle 11,189/12,000B）。

### R2 Phase 2A 导航角色分离（Phase 1 + Phase 2A，2026-11-06）

- **角色定义**：全局导航 = wayfinding（Home/Blog/About/Contact，**不放具体工具**）；工具切换 = 页面上下文（`.tool-nav`）+ 页脚 `.footer-tools`。
- **Phase 1**（`scripts/design-system/nav-role-separation.mjs`，dry-run/--apply 幂等）：94 页扫描 / **85 处变更 / 0 异常**——20 工具页 `.tool-nav` 去 Home、10 about/contact 内容页移除 `.tool-nav`、1 首页移除 `.home-tool-entry` 重复卡、54 页注入本地化 `.footer-tools`（5 真实链接，270 链接全 200）；**40 个无 footer 页跳过（Phase 2B 遗留）**。桌面 `.tool-nav` **84px → 44px** 轻量上下文 tab（透明/无第二层容器），移动保持横向滚动，footer 链接 ≥44px。
- **Phase 2A**（`scripts/design-system/nav-global-cleanup.mjs`）：94 页扫描 / **54 处变更 / 0 异常**——54 个有全局导航（`.nav-left`）的页面把 `data-page="square"`（Square Image 工具链接）替换为对应语言 **Contact 真实 `<a href>`**（`/contact/`、`/zh/contact/`、`/tw/contact/`、`/ja/contact/`、`/es/contact/`）；i18n 新增 `nav.contact` **5 语言键**；**40 个无全局导航落地页跳过（Phase 2B 评估）**。
- **门禁**：`check-layout` F 项扩展（tool-nav 无 Home / 内容页无 tool-nav / 首页无重复卡 / 有 footer 必有 footer-tools 5 链接 / 有 `.nav-left` 必有 `data-page="contact"` 且无工具链接），**PASS 6/6（95 页）**。
- **结果**：工具入口只在 tool-nav + footer-tools；全局 nav = [Home, Blog, About, Contact]；不减少可爬路径（270 footer 链接全 200）。

### 治理内化

- AGENTS **H11** 从四道门禁扩为**六道**：token + functional + **mobile-touch** + check-layout + **performance** + 多语言/SEO；新增 L-37~L-40（索引 **40 条**）。
- ADR-0008（R2 总决策）、ADR-0009（导航角色分离 Phase 1+2A）；GOVERNANCE C2 矩阵、runbook §4.6、`scripts/README`、functional-audit/design-audit README 同步。

## 2. 验证数字（2026-11-06，本地工作区，未提交）

| 门禁 | 结果 | 证据 |
|---|---|---|
| functional（桌面 1440×1000，55 用例） | **53 PASS / 0 FAIL / 2 WARN**（WARN=IDX-13 用例本身 WARN 级 + ENV-02 覆盖说明） | `audit/evidence/phase-f/browser/report.{md,json}` |
| mobile-touch（390×844 触摸，6 用例） | **6 PASS / 0 FAIL / 0 WARN** | `audit/design-migration/r2/mobile-touch/report.{md,json}` |
| token 审计（含 JS 运行时） | **PASS**：273 token / hash `3db11395ede1` / **104 文件**（写稿时实测，含 R2-B 新增 `blog-search.js`）/ JS 裸色 0；基线 **338/153/1560 → 334/151/1553**（导航迁移后下降，已刷新） | `scripts/design-audit/baseline-design-tokens.json` |
| check-layout（95 页，含 F 导航角色分离） | **PASS 6/6（A–F）/ FAIL 0 / WARN 0** | `audit/design-migration/r2/nav-final-layout.{json,md}`；Phase 2A 后复跑 6/6（本机 `/tmp/mc/nav2a-layout.out`） |
| SEO / 多语言 | **32 PASS / 0 FAIL / 0 WARN** | `audit/evidence/phase-b/seo-report.{md,json}` |
| 性能预算 | **PASS**（A 1 WARN 旧 bundle、B 全 PASS、C INFO 无差异） | `audit/design-migration/r2/perf-budget.{json,md}` |

## 3. 关键实测（390×844，CDP 触摸/本地服务器）

| 指标 | 修复前 | 修复后 |
|---|---:|---:|
| 移动顶栏高度（MT-01） | 270px（Phase G 前） | **60px** |
| 导航展开面板 top（MT-02） | **y=4524**（页面底部，视口 844） | **y=60**（顶栏下方、链接在视口内） |
| 语言抽屉（MT-03） | — | top 569 / bottom **844**（完整在视口内）、选项 ≥44px |
| 底栏按钮宽度（MT-06） | **14–24px**（undo/redo 19、text 14、其余 24） | **8×44×44**（页面 scrollWidth 390） |
| 滚动后导出（MT-05） | L-36 风险（滚动后可能全白） | `scrollTo(0,600)` → **684×684、nonWhite 44.1%** |
| 触控拖拽排序（MT-04） | 仅鼠标 HTML5 drag | 长按 250ms + pointer capture，顺序真实变化且无丢失 |
| 博客搜索（CDP 26 断言） | 无搜索 | `mobile`→1、`COLLAGE`→8、`mobile tips`→1、`tips`→4、`design`→2、空结果态/清除/URL 不变/无 JS 兜底 全 PASS |
| 导航角色分离（Phase 1+2A） | 两层 nav 含 Home/Square、内容页带 tool-nav、首页重复工具卡、桌面 84px 第二层导航 | 工具页 tool-nav **4 links 无 Home**；about `toolNav:false`；首页 `homeCards:0`、tool-nav **44px**；全局 nav = **[Home, Blog, About, Contact]**（无具体工具）；390 nav **60** / upload **109** / **0 溢出**；270 footer 链接全 **200** |

## 4. 未做 / 待决策（不影响本批合并，但阻塞 Phase 完整目标）

- **Phase 2B（待用户确认）**：40 个无 footer 的本地化/指南页补 `.footer-tools`（补完后 F 规则可扩为"所有页面必须有 footer-tools"）；评估是否需要「全局 Tools 下拉」（当前全局导航已不含具体工具、工具入口在 tool-nav + footer-tools，下拉属可选增强）；40 个无全局导航落地页是否纳入统一 nav。参考原型：`single-layer-nav.html`。
- **Contact 表单未实现**：等方案决策 A mailto（推荐）/ B 第三方表单（H8 账户级 + 隐私政策）/ C 自建后端，或不加表单改名 Support。原型：`contact-form.html`。本 Phase 已把全局导航 Contact 链接接到既有 contact 页。
- **真机**：iOS Safari / Android Chrome 的触摸手势（拖拽惯性、长按菜单、滚动后导出）与真机性能 profiling 未做；headless/合成触摸只代表结构回归。
- **上线**：未 commit / 未 Push / 未 Preview / 未生产；按 H1/H2 需维护者批准后走 runbook（Preview 38/0/5 预期 → 生产 41/0/2 复跑）。
- 有意不做：`?q=` URL 搜索状态（避免可索引重复页/sitemap/analytics 风险）；无证据的移动端 blur 缩减。

## 5. 证据与回滚

- 证据目录（本机、不入库）：`audit/design-migration/r2/mobile-touch/`、`audit/design-migration/r2/blog-search/`、`audit/design-migration/r2/perf-budget.{json,md}`、`audit/evidence/phase-f/browser/report.{md,json}`、`audit/evidence/phase-b/seo-report.{md,json}`。
- 导航角色分离证据：`audit/design-migration/r2/nav-role-separation-{dryrun,apply}.{md,json}`（94 页/85 变更/0 异常/40 跳过）、`nav-global-{dryrun,apply}.{md,json}`（94 页/54 变更/0 异常）、`nav-phase1/*.png`（桌面/移动截图）、`nav-final-layout.{json,md}`（check-layout 含 F）。
- 回滚：`git revert` 本分支提交；业务级最小回滚 = 删博客搜索面板/script/§20/`blog.search.*` 键（渐进增强保证列表仍可用）+ 单独 revert CSS §15/§17；导航类改动 = revert 两个迁移脚本对应提交并恢复 `*.html`/`i18n/`（脚本幂等，不会半写）。不涉及 URL/数据/广告变更。
- 未部署，无需 Vercel 回滚；若上线后异常按 runbook §6 处理。
