# Phase R2 摘要：移动触控回归 + 博客搜索 + 性能预算（本地验收完成，未上线）

> 2026-11-06 · 分支 `feat/r2-mobile-performance-blog-search`（从 `main` `94c4cb6` 起）· 状态：**本地门禁通过、未 commit / 未部署**；单层 IA 与 Contact 表单**待用户/维护者决策**
> 关联：[ADR-0008](../decisions/ADR-0008-r2-mobile-touch-performance-blog-search.md)、[ADR-0007](../decisions/ADR-0007-interaction-refinement.md)、[INTERACTION-AUDIT.md](../design/INTERACTION-AUDIT.md) R2 路线、[prototypes/r2/README.md](../design/prototypes/r2/README.md)、L-20261106-37/38/39

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

### 治理内化

- AGENTS **H11** 从四道门禁扩为**六道**：token + functional + **mobile-touch** + check-layout + **performance** + 多语言/SEO；新增 L-37~L-39（索引 39 条）。
- ADR-0008（Proposed）；GOVERNANCE C2 矩阵、runbook §4.6、`scripts/README`、functional-audit/design-audit README 同步。

## 2. 验证数字（2026-11-06，本地工作区，未提交）

| 门禁 | 结果 | 证据 |
|---|---|---|
| functional（桌面 1440×1000，55 用例） | **53 PASS / 0 FAIL / 2 WARN**（WARN=IDX-13 用例本身 WARN 级 + ENV-02 覆盖说明） | `audit/evidence/phase-f/browser/report.{md,json}` |
| mobile-touch（390×844 触摸，6 用例） | **6 PASS / 0 FAIL / 0 WARN** | `audit/design-migration/r2/mobile-touch/report.{md,json}` |
| token 审计（含 JS 运行时） | **PASS**：273 token / hash `3db11395ede1` / **104 文件**（写稿时实测，含 R2-B 新增 `blog-search.js`）/ JS 裸色 0 | `scripts/design-audit/baseline-design-tokens.json` |
| check-layout `--full`（95 页 × 1440/390/360/320） | **PASS 5 / FAIL 0 / WARN 0** | `audit/design-migration/r2/blog-search/layout-check.{json,md}` |
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

## 4. 未做 / 待决策（不影响本批合并，但阻塞 Phase 完整目标）

- **单层 IA 重构未实现**：等决策「页脚是否保留 Tools 内链 / 导航当前工具名 i18n / 灰度方式」；需 ADR + Preview + 全量内链/重定向矩阵 + 维护者批准（H9）。原型：`single-layer-nav.html`。
- **Contact 表单未实现**：等方案决策 A mailto（推荐）/ B 第三方表单（H8 账户级 + 隐私政策）/ C 自建后端，或不加表单改名 Support。原型：`contact-form.html`。
- **真机**：iOS Safari / Android Chrome 的触摸手势（拖拽惯性、长按菜单、滚动后导出）与真机性能 profiling 未做；headless/合成触摸只代表结构回归。
- **上线**：未 commit / 未 Push / 未 Preview / 未生产；按 H1/H2 需维护者批准后走 runbook（Preview 38/0/5 预期 → 生产 41/0/2 复跑）。
- 有意不做：`?q=` URL 搜索状态（避免可索引重复页/sitemap/analytics 风险）；无证据的移动端 blur 缩减。

## 5. 证据与回滚

- 证据目录（本机、不入库）：`audit/design-migration/r2/mobile-touch/`、`audit/design-migration/r2/blog-search/`、`audit/design-migration/r2/perf-budget.{json,md}`、`audit/evidence/phase-f/browser/report.{md,json}`、`audit/evidence/phase-b/seo-report.{md,json}`。
- 回滚：`git revert` 本分支提交；业务级最小回滚 = 删博客搜索面板/script/§20/`blog.search.*` 键（渐进增强保证列表仍可用）+ 单独 revert CSS §15/§17；不涉及 URL/数据/广告变更。
- 未部署，无需 Vercel 回滚；若上线后异常按 runbook §6 处理。
