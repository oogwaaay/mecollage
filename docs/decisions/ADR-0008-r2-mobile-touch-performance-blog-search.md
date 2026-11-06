# ADR-0008: R2 —— 移动触控回归、博客搜索与性能预算

- 状态：**Proposed**（R2-A/B/C 已实现并本地验收；单层 IA / Contact 表单待用户决策；未 commit / 未部署，待 Preview / 维护者批准）
- 日期：2026-11-06
- 分支：`feat/r2-mobile-performance-blog-search`（从 `main` `94c4cb6` 起）
- 关联：[INTERACTION-AUDIT.md](../design/INTERACTION-AUDIT.md)（P2-3/P2-4/§5 R2 路线）、[prototypes/r2/README.md](../design/prototypes/r2/README.md)（R2 战略原型与决策点）、[DESIGN-TOKENS.md](../design/DESIGN-TOKENS.md) §4.10（性能预算）、[ADR-0006](ADR-0006-design-token-single-source.md)、[ADR-0007](ADR-0007-interaction-refinement.md)、L-20261106-37/38/39

## 背景

Phase G（ADR-0006/0007）已把「设计 token 单一事实源 + R0/R1 交互」上线（生产 41/0/2）。INTERACTION-AUDIT §5 的 R2 战略项里，本批只做**低风险、可独立验收**的三块：移动端触控回归（R2-A）、博客列表搜索（R2-B）、性能预算 + 战略原型（R2-C）；单层 IA 重构与 Contact 表单**不在本批实现**（需要产品决策，见「未做 / 后续」）。

驱动事实：

1. **R1 的移动交互没有自动化覆盖**：functional `run-tests.mjs` 是 1440×1000 桌面回归；触摸事件、移动导航/语言抽屉的打开态、滚动后导出、移动端触控目标都没有断言。用 390×844 + 真实触摸事件跑第一版回归时，发现两个**静态首屏门禁测不到**的产品缺陷（L-38）：
   - 底栏移动端 8 个按钮被 flex-shrink 压到 **14–24px**（R0 加 undo/redo 后；check-layout C 项默认 WARN 且只量首屏）；
   - 点按 ☰ 后导航面板 `getBoundingClientRect().y = 4524`（视口 844）——bundle 在 ≤768 把 `.ghibli-nav` 设为 `position: static`，绝对定位面板以整页 `.app-container` 为包含块，渲染到页面最底部，用户首屏看不到菜单。
2. **博客列表没有搜索**（P2-4）：8 张文章卡；bundle 里有 `blog-search` 死样式。需要客户端即时过滤、渐进增强、不改 URL（URL 结构受 H9 保护）。
3. **性能缺少可执行门禁**：审计的 R2 建议包含「移动端 blur/图片/字体性能预算」，但 headless Chrome 的 `requestAnimationFrame` 锁 60fps、GPU 合成被虚拟化——A/B 缩减 blur **实测无差异**（avg 16.66 vs 16.63ms、p95 16.98 vs 16.91ms；首页 48 个 backdrop 元素）。没有真机证据就不应做「blur 缩减」，但可以建立**可复现、能防回归**的预算（L-37）。
4. **单层 IA / Contact 需要先对齐方案**：单层导航涉及 95 页 × 5 语言的 DOM/URL/SEO；Contact 表单需要后端/第三方（H8 账户级）与隐私政策更新。R2-C 先做原型与决策清单，不直接改站点。

## 决策

### D1 移动触控回归门禁（R2-A）+ 两处 CSS 修复

- 新增 `scripts/functional-audit/run-mobile-touch.mjs`（v1.0.0）：零依赖 CDP，`Emulation.setDeviceMetricsOverride(390×844, mobile:true)` + `setTouchEmulationEnabled(maxTouchPoints:5)` + `Input.dispatchTouchEvent`，经 `pointerdown/move/up` 与 `click` 驱动真实交互；6 个用例 **MT-01~MT-06**（导航结构 / 导航开合 / 语言抽屉 / 触控拖拽 / 滚动后导出 / 触控目标）。
- 修复两个「交互后才出现」的状态（`assets/css/components.css`）：
  - **§15**：≤768 给 `body .ghibli-nav` 补 `position: relative`（展开面板从 y=4524 回到 y=60，顶栏下方）；
  - **§17**：`body.mc-collage-page .bottom-toolbar` 满宽 + 内部横向滚动 + `.toolbar-btn` `flex: 0 0 auto` 且 44×44（8 个按钮从 14–24px 回到 44px；页面本身 `scrollWidth` 保持 390）。
- 结果：`run-mobile-touch.mjs` **PASS 6 / FAIL 0 / WARN 0**；触摸模拟与真机的差异（系统滚动惯性、iOS 手势、长按菜单）明确写进限制，不伪装通过。

### D2 博客搜索（R2-B）：客户端渐进增强，不改 URL/head/链接

- `blog/index.html` 增加 `.blog-search-panel`（`type="search"` + 关联 label + `role="status" aria-live="polite"` 结果数 + 空状态/清除）；`assets/js/blog-search.js`（defer）即时过滤 8 张卡；`components.css §20` 提供视觉；i18n 5 语言新增 `blog.search.*`（**5 键**：placeholder / results `{n}` / **result_one** / empty / clear）。
- 匹配规则：标题 `.blog-post-title` + 摘要 `.blog-post-excerpt`；`NFKC` 归一化 + 大小写不敏感 + 空白分词 AND；CJK 原样子串匹配；**不**做拼音/翻译。
- 渐进增强：无 JS 时 8 篇全部可见；无 i18n.js 时英文兜底；过滤只改 DOM 状态（`hidden`/`display`/文本），**不改 URL/canonical/文章链接**（不做 `?q=`，避免可索引重复页/sitemap/analytics 风险）。
- 验收：CDP 26 PASS / 0 FAIL（`audit/design-migration/r2/blog-search/verify-report.*`）+ functional **IDX-24/25** PASS；顺带补齐 zh-tw/ja/es 缺失的 5 个 `blog.ai_enhancements.*` 键（Phase C 遗留，5 语言键集合已齐）。

### D3 R2-C 战略原型与决策点（不实现）

- `docs/design/prototypes/r2/`：`single-layer-nav.html`、`contact-form.html`、`blog-search.html`、`index.html` + README + review/clean 截图（复用既有 CDP 捕获脚本，零外部依赖）。
- **单层 IA 与 Contact 表单尚未实现**，等用户/维护者决策：
  - Contact 三方案：**A mailto（推荐，零后端/零第三方）** / B 第三方表单服务（需账户操作 + 隐私政策更新，H8）/ C 自建后端（不推荐本轮）；或按审计 P2-3 第二选项改名 Support。
  - 单层导航：**不动 URL**（保持真实 `<a href>`、不新增/删除可索引 URL，H9）；页脚保留 Tools 内链；工具页灰度 → 全站 95 页 × 5 语言；需要 ADR + Preview + 维护者批准。

### D4 性能预算门禁（R2-C2）：只防可测量回归，不拿 headless FPS 当证据

- 新增 `scripts/design-audit/check-performance.mjs` + `scripts/design-audit/performance-budget.json`：
  - **A 静态 gzip 体积**：tokens/components/旧 bundle/pages/main/ui/i18n/首页 HTML/壁纸；
  - **B 390×844 渲染结构**：单页 DOM 节点 ≤600、深度 ≤16、`backdrop-filter` 元素 ≤60、样式表 ≤8、外部脚本 ≤2、本地脚本 ≤6（5 个代表页）；
  - **C 滚动 A/B 参考**：`--bench` 记录 FPS/长任务，**只记录不设门槛**（headless 无证据）。
- 判定：超预算 → FAIL（exit 1）；>90% 预算 → WARN；当前 **PASS**（A 项 1 WARN：旧 bundle gzip 11,189 / 12,000B；B 全 PASS；C INFO 无差异）。
- 规则：**禁止**用 headless FPS 差异作为「blur 优化」依据（L-37）；真机性能在 Preview 用 Chrome DevTools / Safari 复核；新增阻塞脚本/把 AI 库放回首屏/DOM 超预算都算回归。

### D5 治理门禁扩展：H11 从四道门禁扩为六道

- AGENTS H11：**token 审计 + functional 回归 + 移动触摸回归（`run-mobile-touch`）+ 移动布局门禁（`check-layout`）+ 性能预算（`check-performance`）+ 多语言/SEO 不回归**；命令与阈值写清；行为变更同批更新断言；导出/截图在已滚动状态验收；交互后才出现的控件必须在交互后断言（L-31~L-39）。
- 教训回灌：L-37（headless FPS 不能证明 GPU 性能）、L-38（交互态门禁缺口）、L-39（CSS `display` 覆盖 `[hidden]`）；runbook §4.6、GOVERNANCE C2 矩阵、scripts/functional-audit 与 design-audit README 同步。

## 备选方案与拒绝理由

| 方案 | 拒绝理由 |
|---|---|
| 以 headless FPS 差异证明「缩减 blur 提升性能」 | 实测无差异（16.66 vs 16.63ms avg；p95 16.98 vs 16.91）；headless 锁 60fps、GPU 合成虚拟化，不能代表真机（L-37）；无证据的视觉降级不可接受 |
| 博客搜索用 `?q=` URL 状态 | 产生可索引重复页，污染 sitemap/analytics，需要 canonical/hreflang 处理，与 L-05 同类 URL 风险；本轮保持无 URL 变化 |
| 本批直接实现单层导航/IA 重构 | 涉及 95 页 × 5 语言 DOM/URL/SEO（H9），需 ADR + 全量重定向/内链矩阵 + 维护者批准 + 灰度；原型先行（D3） |
| 本批直接上 Contact 表单 | 无后端方案未定；第三方服务需账户操作（H8）与隐私政策更新；改 Support 也需产品决策 |
| 用 Playwright/Puppeteer 做移动回归 | 违背站点零依赖验收原则；既有 CDP harness 已可模拟触摸/设备指标 |
| 长期用 JS 写 inline `display` 隐藏卡片 | 掩盖 CSS `[hidden]` 失效，换实现/降级易漏；应由 CSS 兜底 + JS 只切 `hidden`（L-39） |

## 影响

- **代码/资源**：新增 `run-mobile-touch.mjs`、`check-performance.mjs`、`performance-budget.json`、`assets/js/blog-search.js`；`components.css` +107 行（§15 nav relative、§17 底栏、§20 博客搜索）；`blog/index.html` +15 行（搜索面板 + script）；i18n 5 语言新增 `blog.search.*` 5 键并补齐 5 个 `blog.ai_enhancements.*`；functional `run-tests.mjs` +2 用例（IDX-24/25）。**未改** URL/信息架构/广告/Publisher ID/导出参数/后端。
- **风险**：合成触摸与真机存在差异（滚动惯性/手势/长按菜单未覆盖）；搜索依赖 DOM 文本，文章结构大变需同步选择器；`[hidden]` 必须由 CSS 兜底（L-39）；性能预算不含外部 CDN/广告/真机 GPU；单层 IA/Contact 未实现，上线前仍需产品决策。
- **部署面**：`assets/js/blog-search.js` 为新增公开静态文件；`docs/`、`scripts/` 已在 `.vercelignore`；R2 原型不部署。

## 验证

- 本地门禁（2026-11-06，分支 `feat/r2-mobile-performance-blog-search` @ `94c4cb6`；Node v24.19.0 + 本机 Chrome；离线）：
  ```bash
  node scripts/functional-audit/run-tests.mjs          # 53 PASS / 0 FAIL / 2 WARN（共 55；IDX-24/25 博客搜索）
  node scripts/functional-audit/run-mobile-touch.mjs   # 6 PASS / 0 FAIL / 0 WARN（MT-01~06）
  node scripts/design-audit/run-token-audit.mjs        # PASS：273 token / hash 3db11395ede1 / 104 文件（含 R2-B 新增 blog-search.js）/ JS 0
  node scripts/design-audit/check-layout.mjs --full    # PASS 5 / FAIL 0 / WARN 0（95 页 × 4 宽度）
  node scripts/design-audit/check-performance.mjs      # PASS（A 项 1 WARN：旧 bundle gzip 11189/12000B）
  node scripts/seo-audit/run-seo-checks.mjs            # 32 PASS / 0 FAIL / 0 WARN
  ```
- **移动触控实测（390×844，CDP 触摸）**：MT-01 顶栏 **60px**、无横向溢出；MT-02 导航面板 **y=60**（修复前 y=4524）、链接 ≥44px、Esc 关闭 + 焦点返回；MT-03 语言抽屉 top 569 / bottom 844（视口内）、选项 ≥44px；MT-04 触控拖拽后图片顺序真实变化且无丢失；MT-05 `scrollTo(0,600)` 后导出 **684×684、nonWhite 44.1%**（L-36 防护）；MT-06 底栏 8 按钮全 **44×44**（修复前 14–24px）。证据 `audit/design-migration/r2/mobile-touch/report.{md,json}` + `screenshots/`。
- **博客搜索**：CDP **26 PASS / 0 FAIL**（`audit/design-migration/r2/blog-search/verify-report.*`；桌面 1440 + 移动 390、渐进增强/无 i18n 兜底/空状态/URL 不变/CJK fixture）；functional IDX-24/25 PASS；layout-check 95 页 PASS 5/0/0。
- **性能预算**：`audit/design-migration/r2/perf-budget.{json,md}` —— A 9 项（1 WARN 旧 bundle）、B 5 页全 PASS（首页 282 节点 / 深度 11 / backdrop 48 / 样式表 7 / 外部脚本 2）、C A/B 参考无差异（avg 16.66 vs 16.63ms、p95 16.98 vs 16.91ms）。
- 未做：Preview 部署、真机触摸手势/真机性能 profiling、单层 IA/Contact 实现（见下）。

## 未做 / 后续

- **单层 IA 重构未实现**：原型 `docs/design/prototypes/r2/single-layer-nav.html` 已就绪；需用户确认「是否保留页脚 Tools 内链 / 导航当前工具名 i18n / 灰度方式」，ADR + Preview + 全量内链/重定向矩阵 + 维护者批准后另批实施（H9）。
- **Contact 表单未实现**：等 D1 决策（A mailto 推荐 / B 第三方 / C 自建 / 或不加表单改名 Support）；选 B 需维护者账户操作（H8）+ 隐私政策更新；原型 `contact-form.html` 已给出三方案对比。
- **真机验证**：iOS Safari / Android Chrome 的触摸手势（拖拽惯性、长按菜单、滚动后导出）、真机性能（DevTools profiling）未做；headless/mobile-touch 只代表结构回归。
- **性能预算边界**：不含外部 CDN（html2canvas/字体/图标/广告）与真机 GPU；`--bench` 仅参考项；若未来引入第三方脚本/图片，需先更新预算并复核。
- 未做 `?q=` URL 搜索状态（有意，见 D2）；R2-C 未覆盖移动端 blur 真机收益（无证据不做）。

## 回滚

- **页面/样式**：`components.css` §15/§17 两处修复可单独 revert（回到 R1 行为：导航面板在页面底部 / 底栏按钮 14–24px 的缺陷会回归，需同时回滚 mobile-touch 门禁或标记 known-issue）。
- **博客搜索**：删除 `blog/index.html` 搜索面板 + `<script src="/assets/js/blog-search.js">`、`components.css §20`、5 语言 `blog.search.*` 键即可完全回滚；渐进增强保证无 JS 时 8 篇文章仍可见。
- **脚本/预算**：删除 `run-mobile-touch.mjs` / `check-performance.mjs` / `performance-budget.json` 并还原 README/AGENTS/GOVERNANCE/runbook 引用即可。
- **不改数据**：URL、导出参数、广告/统计、后端均未变，无数据迁移；回滚后按 runbook §4.6 复跑对应门禁。
