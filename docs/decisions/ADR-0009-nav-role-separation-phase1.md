# ADR-0009: 导航角色分离 Phase 1+2A+2B-1 —— 全局 wayfinding 与页面上下文工具切换

- 状态：**Phase 1+2A 已生产部署（`d363e0f`，验收 41/0/2，PR #6 已合并）；Phase 2B-1 已实现并本地过门禁，待 Preview / 维护者批准**（Tools 下拉**不做**；Contact 表单/真机待）
- 日期：2026-11-06
- 分支：Phase 1+2A `feat/nav-role-separation`（从 `main` `5ad5adf` 起，生产部署 `d363e0f`，已合并）；Phase 2B-1 `feat/footer-tools-standalone`（从 `main` `87f8be5` 起）
- 关联：[ADR-0008](ADR-0008-r2-mobile-touch-performance-blog-search.md)（R2 总决策与性能预算）、[INTERACTION-AUDIT.md](../design/INTERACTION-AUDIT.md) P0-2（两层导航）/P2-3（Contact）/P2-4（博客搜索）、[prototypes/r2/README.md](../design/prototypes/r2/README.md)（`single-layer-nav` 原型）、L-20261106-40、`scripts/design-system/nav-role-separation.mjs`、`nav-global-cleanup.mjs`、`footer-tools-standalone.mjs`、`scripts/design-audit/check-layout.mjs` F 项

## 背景

R2 Phase 2（战略）中，用户批准「先做第三步」——**导航角色分离**；Contact 页由用户稍后自行布置。本 ADR 覆盖 **Phase 1（页面内角色分离）**、**Phase 2A（全局导航收口）** 与 **Phase 2B-1（无 footer 页只加 FooterTools）**：Phase 1 解决工具页/内容页/首页的工具入口角色，Phase 2A 解决全局导航里仍放具体工具的问题，Phase 2B-1 解决 40 个无 footer 页缺少工具入口/内链的问题。

用户对 Phase 2B-1 的明确决定（2026-11-06 生产批准原话）：「FE 是 2B，先不做……那 40 个没有 Footer 的本地化指南页不做（完整 footer）。（但）FooterTools，这个可以加吧？只要不做 Tools 下拉就可以吧？」——即：**40 页不重建完整 footer，只加 FooterTools；不做 Tools 下拉**。

现状问题（详见 L-20261106-40）：

1. **两层导航职责混淆**：全局 `.ghibli-nav`（Home/Blog/About/Square）与页面级 `.tool-nav` 都出现 Home/全站链接；工具页的 `.tool-nav` 含 Home（局部导航承担全局 wayfinding），Home 在页面上出现 2–3 次。
2. **内容页带工具导航**：about/contact 等非工具页也渲染 `.tool-nav`（局部导航对内容页无意义，且视觉上暗示"这里能操作工具"）。
3. **首页重复工具卡**：首页同时有 `.tool-nav`（5 个工具 pill）与 `.home-tool-entry`（2 张工具卡），工具入口重复。
4. **桌面第二层导航视觉权重过高**：`.tool-nav` 是 84px 玻璃工具栏（背景/边框/模糊/阴影），在视觉上构成"第二条导航"，与主内容/主操作竞争。
5. **内链/SEO 依赖导航**：工具入口只在顶部 nav；页脚没有工具链接，导航一旦收敛会损失全站工具内链（H9/SEO 资产）。
6. **i18n 语义漂移**：`blog/index.html` 的 tool-nav 首项文字是 "Collage Maker"，却使用 `data-i18n="nav.home"`（运行时会被翻译成 Home）。
7. **全局导航里仍放具体工具（Phase 2A 之前）**：54 个有 `.nav-left` 的页面把 `data-page="square"`（Square Image 工具链接）放在**全局导航**里——全局导航承担了工具入口，与"全局=wayfinding、工具=页面上下文"的角色定义冲突；而工具页/内容页又各有 tool-nav，工具入口进一步分散。
8. **40 个本地化/指南页没有 `<footer>`（Phase 2B-1 之前）**：这些页面（birthday/christmas/free-collage-maker、how-to、instagram-story、square-collage、vertical-collage、wedding 等 × 5 语言）没有页脚结构，因此也没有 footer-tools，全站工具内链在这些页面缺失（其余 54 页有 footer-tools）。用户决定**只加 FooterTools、不重建完整 footer**。

产品定位参考：**"字面单层导航"（把 5 个工具全塞进下拉）并非 Apple 的实际做法**——`https://www.apple.com/iphone/` 可见全局导航（Store/Mac/iPad/…）+ 产品局部导航（iPhone 17 Pro/Duo 等），即「1 个全局 wayfinding + 1 个页面上下文」两层。本 Phase 做**角色分离**，不是把工具塞进下拉（备选分析见下）。

## 决策

### D1 角色定义：全局导航 = wayfinding；工具切换 = 页面上下文

- **全局导航**：品牌 + 全站入口（**Home/Blog/About/Contact**），跨页面一致，负责"我在哪个站、还能去哪"；**不含具体工具**（Phase 2A 收口：54 页 `.nav-left` 的 Square Image 工具链接替换为对应语言 Contact 真实 `<a href>`）。
- **页面局部导航（`.tool-nav`）**：只出现在**工具页**，只在**工具之间**切换（Square Crop / Rounded Corners / Square Image / Blurred Frame），**不包含 Home、不包含内容页入口**。
- **内容页**（about/contact 等）**不渲染 `.tool-nav`**；首页不重复工具卡。
- **工具入口只出现在两处**：工具页 `.tool-nav`（4 链接）+ 页脚 `.footer-tools`（5 链接）；首页工具区（无重复卡）。
- 不采用「字面单层」：把 5 个工具塞进一个下拉会增加交互成本与移动端可发现性问题，并隐藏工具入口（内链/SEO 与首屏理解成本）。

### D2 迁移方式：一次性幂等脚本 + 小步可回滚

新增 `scripts/design-system/nav-role-separation.mjs`（dry-run 默认 / `--apply` 写盘；输出 json/md 报告；只处理被 git 跟踪的站点 HTML，排除 `404.html`）：

| 动作 | 数量 | 说明 |
|---|---:|---|
| `tool-nav:remove-home` | **20** | 20 个工具页 `.tool-nav` 去掉 Home（保留 4 个工具链接） |
| `tool-nav:remove(content-page)` | **10** | 10 个 about/contact 内容页移除 `.tool-nav` |
| `home-tool-entry:remove` | **1** | 首页移除重复工具卡 |
| `footer-tools:insert` | **54** | 有 `<footer>` 的页面注入本地化 `.footer-tools`（5 个真实链接/语言前缀按 i18n JSON 生成，静态文案无 JS 也可用，`data-i18n` 键保留） |
| 跳过（无 footer） | **40** | 本地化/指南页无 footer，**遗留**（Phase 2 补） |

apply 报告：扫描 94 页、变更 **85 处**、异常 **0**、跳过 40 页（`audit/design-migration/r2/nav-role-separation-apply.{md,json}`）。脚本幂等：重复 `--apply` 不产生新变化；配合 `git revert`/`git checkout -- '*.html'` 可回滚。

**Phase 2A（全局导航收口）**：新增 `scripts/design-system/nav-global-cleanup.mjs`（dry-run 默认 / `--apply`；幂等；只处理被 git 跟踪的站点 HTML，排除 `404.html`）——把 54 个有全局导航页面（`.nav-left`）里的 `data-page="square"`（Square Image 工具链接）替换为对应语言 **Contact 真实 `<a href>`**（`/contact/`、`/zh/contact/`、`/tw/contact/`、`/ja/contact/`、`/es/contact/`），并新增 i18n `nav.contact` 5 语言键（静态文案 + `data-i18n`，无 JS 也可用）。

| 动作 | 数量 | 说明 |
|---|---:|---|
| `global-nav:square->contact` | **54** | 54 个有 `.nav-left` 的页面，全局导航收口为 Home/Blog/About/Contact |
| 跳过（无全局导航） | **40** | 40 个无 `.nav-left` 的本地化/指南落地页，**遗留**（Phase 2B 评估） |

apply 报告：扫描 94 页、变更 **54 处**、异常 **0**（`audit/design-migration/r2/nav-global-apply.{md,json}`；dry-run 同目录 `nav-global-dryrun.*`）。

### D3 视觉降级：桌面 `.tool-nav` 从第二层导航条降为轻量上下文 tab

- 桌面（>768px）：`.tool-nav` 透明背景、无 `backdrop-filter`、无边框/阴影/容器，`tool-nav-link` 改为轻量 pill（`--mc-radius-pill`、透明底、muted 文字），active 用品牌 tint；高度从 **84px → 44px**，不再构成"第二条导航"。
- 移动（≤768px）：保持 R1 的横向滚动 pill 行；`.footer-tools a` 最小高度 `--mc-tap-target-min`（44px）；`footer-tools` 5 个链接按页面语言前缀生成（`/zh/`、`/tw/`、`/ja/`、`/es/` 或根路径）。
- 全部走 `components.css §21`（只新增/覆盖统一层，不改页面内联样式契约）。

### D4 内链/SEO 保护

- 每页保留**至少一个可爬工具入口**：工具页 `.tool-nav` 4 链接、首页工具入口、所有有 footer 页面 `.footer-tools` 5 链接（54 页 × 5 = **270 个链接全部 200**）。
- **不改** URL / `trailingSlash` / `cleanUrls` / 重定向 / canonical / hreflang / 文章链接（H9）；`footer-tools` 只是把已有工具路径以本地化前缀重新列出。
- 视觉收敛不减少可索引路径：原顶部 nav 的工具链接仍在（工具页 tool-nav + 首页工具入口 + footer-tools）。

### D5 门禁：`check-layout` 新增/扩展 F 项（静态，无需浏览器）

`scripts/design-audit/check-layout.mjs` 新增 **F. 导航角色分离**（对 95 页 HTML 静态检查，Phase 1 + 2A + 2B-1 规则）：

- `tool-nav` 内不得出现 Home（判据：`data-i18n="nav.home"` 或文本 `Home`；**不**用 `fa-home` 图标判定——Collage Maker 的图标就是 home）；
- about/contact 内容页不得有 `.tool-nav`；
- 首页不得有 `.home-tool-entry` 重复工具卡；
- **所有页面（除 `404.html`）必须有 `.footer-tools`**（Phase 2B-1 扩展：有 `<footer>` 的放 footer 内；无 footer 的用 `.footer-tools--standalone`）且恰好 **5 个链接**、链接前缀与页面语言一致；
- **Phase 2A 扩展**：有 `.nav-left` 的页面必须含 `data-page="contact"`（wayfinding 完整）；**不得**含 `data-page="square"` 或指向 `/tools/` 的工具链接（全局导航不放具体工具）；
- 类名检测用 **前缀匹配** `class="footer-tools`（兼容 `class="footer-tools"` 与 `class="footer-tools footer-tools--standalone"` 多类名；Phase 2B-1 修过此 bug）。

F 接入 H11/C2/runbook；迁移/导航类改动必须跑 `check-layout`（F PASS）+ `nav-role-separation --dry-run` / `nav-global-cleanup --dry-run` / `footer-tools-standalone --dry-run`（幂等，0 pending change）+ functional/mobile-touch/SEO。

### D6 全局导航收口（Phase 2A，与 D1 角色定义配套）

- 全局导航 = 品牌 Home + Blog + About + Contact + 语言；**具体工具链接一律移出全局导航**（工具入口只在 tool-nav/footer-tools）。
- 54 个有 `.nav-left` 的页面统一替换（`nav-global-cleanup.mjs`），文案本地化（i18n `nav.contact` 5 键），保留真实 `<a href>`（仍可爬、无 JS 可用）。
- 40 个无 `.nav-left` 的落地页跳过（它们的导航形态本就不同，Phase 2B 再评估），不影响可索引内容与 footer-tools 内链。
- **不动 URL**：Contact 是既有可索引页面（5 语言各有 `/contact/`），替换的是导航链接不是路由。

### D7 无 footer 页 FooterTools standalone（Phase 2B-1，用户明确定界）

- 用户决定：**40 页不做完整 footer，只加 FooterTools；不做 Tools 下拉**。因此 Phase 2B-1 只解决“这些页面没有工具入口/内链”，不重建页脚、不新增版权/语言/社交链接、不改页面结构与 URL。
- 新增 `scripts/design-system/footer-tools-standalone.mjs`（dry-run 默认 / `--apply` 写盘；幂等；只处理被 git 跟踪的站点 HTML，排除 `404.html`）：扫描 94 页 → 给 **40 个无 `<footer>` 且无 footer-tools** 的本地化/指南页在 `</body>` 前（`ui.js` script 之前）插入 `.footer-tools--standalone`，5 个真实工具链接（`/` + 4 个工具路径），语言前缀/文案来自 i18n JSON（静态无 JS 也正确，`data-i18n` 键保留）。
- CSS：`.footer-tools--standalone`（`border-top`、`max-width:900px`、居中换行、移动端 padding 缩小；不新增边框/版权/语言链接），复用 `.footer-tools` 的 44px 链接高度与 hover/focus 规则。
- 结果：**94/94 个非 404 页面都有 footer-tools**（54 页 footer 内 + 40 页 standalone），F 规则从“有 footer 的页面”扩展为“**所有页面必须有 footer-tools**”。
- 检测 bug 修复：F 首版用 `class="footer-tools"` 精确匹配，standalone 的多类名（`class="footer-tools footer-tools--standalone"`）会漏检 → 三个脚本（`check-layout.mjs`、`nav-role-separation.mjs`、`footer-tools-standalone.mjs`）统一改为**前缀匹配** `class="footer-tools`。

## 备选方案与拒绝理由

| 方案 | 拒绝理由 |
|---|---|
| A. 字面单层导航（5 工具全塞进一个下拉） | Apple 实际是「全局 nav + 产品局部 nav」两层（`apple.com/iphone/`）；单层下拉增加交互成本、移动端可发现性差，并隐藏工具入口（内链/SEO/首屏理解受损） |
| B. 维持现状（只统一视觉/文案） | 职责混淆仍在：Home 重复 2–3 次、内容页带工具导航、首页重复工具卡、84px 第二层导航抢主操作；用户明确要求"先做导航" |
| B2. 全局导航保留具体工具入口 | 全局导航承担工具入口、与内容页 tool-nav/首页工具卡重复，角色定义失效；Phase 2A 已收口为 Home/Blog/About/Contact，工具入口集中到 tool-nav + footer-tools |
| C. Mega menu（一列全站所有链接） | 无构建/95 页手写，维护成本高；移动端不可用；认知负担大，与「One obvious path」相反 |
| D. 直接重写 94 页 HTML | 用幂等迁移脚本可控制变更面（20/10/1/54 精确计数）并可回滚；手写重写 94 页回归风险不可控（L-02） |
| E. 只删导航、不补 footer 内链 | 工具入口/内链会减少，伤 Phase B/C/E 的 SEO 资产；footer-tools 保住 270 个可爬链接 |
| F. 把工具入口改成 JS 渲染的下拉 | 首屏/无 JS 不可见、爬虫与降级风险；本轮保持静态真实 `<a href>` |
| G. 给 40 个无 footer 页重建完整 footer | 用户明确“40 页不做（完整 footer）”；重建 footer 涉及版权/语言/社交链接与整站页脚规范，范围大、回归面广；FooterTools 已能解决工具入口/内链 |
| H. 做全局 Tools 下拉 | 用户明确“不做 Tools 下拉”；当前全局导航已不含具体工具，工具入口在 tool-nav + footer-tools 三处可爬，下拉属可选增强、收益低且增加交互面 |

## 影响

- **页面**：
  - Phase 1：94 页迁移（85 处变更，0 异常）：20 工具页去 Home、10 内容页去 tool-nav、1 首页去重复卡、54 页注入 footer-tools（270 链接）；40 页无 footer 跳过（Phase 2B-1 处理）。`components.css §21` 新增 footer-tools 与桌面上下文 tab 样式；`blog/index.html` tool-nav 首项 i18n 键修正（`nav.home` → `tool.collage_maker`，避免运行时变 Home）。
  - Phase 2A：`nav-global-cleanup.mjs` 迁移 **54 页**（54 处变更，0 异常）：全局导航 `.nav-left` 的 `data-page="square"` 工具链接 → 对应语言 Contact 真实 `<a href>`；i18n 新增 `nav.contact` 5 语言键；40 个无全局导航落地页跳过（Phase 2B 评估）。
  - Phase 2B-1：`footer-tools-standalone.mjs` 迁移 **40 页**（40 处变更，0 异常）：40 个无 footer 页插入 `.footer-tools--standalone`（5 真实链接/本地化前缀）；CSS 新增 `.footer-tools--standalone`；**94/94 非 404 页面都有 footer-tools**；不重建 footer、不做 Tools 下拉、不改 URL/结构。
- **门禁**：`check-layout` 新增/扩展 F 项（静态：tool-nav 无 Home / 内容页无 tool-nav / 首页无重复卡 / **所有页面必须有 footer-tools（footer 内或 standalone）**、5 链接、语言前缀 / 全局 nav 含 Contact 且无工具）；类名检测前缀匹配；H11/C2/runbook/scripts README/AGENTS/lessons 同步；token 基线随 HTML 变化下降并被人工复核刷新（**338/153/1560 → 334/151/1553**，token 273 / hash `3db11395ede1`）。
- **上线记录**：Phase 1+2A 于 2026-11-06 生产部署 `d363e0f`（Preview 38/0/5、生产 **41/0/2**，PR #6 已合并 `main` `87f8be5`）；Phase 2B-1 未上线（待 Preview/批准）。
- **风险**：桌面视觉变化（84→44px、透明 tab）与 standalone FooterTools 的视觉间距需 Preview 截图复核；40 页仍无完整 footer（用户明确不做）；footer-tools 文案由生成时 i18n JSON 决定，切换语言依赖 `data-i18n`（键保留）；不动 URL/广告/统计/导出。
- **部署面**：站点 HTML 会部署；`scripts/`、`docs/` 已在 `.vercelignore`；`404.html` 保持独立、不迁移。

## 验证

- 迁移与门禁（2026-11-06，本地工作区；Phase 2B-1 未 commit）：
  ```bash
  node scripts/design-system/nav-role-separation.mjs            # dry-run：幂等，期望 0 pending change
  node scripts/design-system/nav-global-cleanup.mjs             # dry-run：幂等，期望 0 pending change
  node scripts/design-system/footer-tools-standalone.mjs        # dry-run：幂等，期望 0 pending change
  node scripts/design-audit/check-layout.mjs                    # 期望 PASS 6/6（95 页，含 F）
  node scripts/functional-audit/run-tests.mjs                   # 53 PASS / 0 FAIL / 2 WARN（55）
  node scripts/functional-audit/run-mobile-touch.mjs            # 6 PASS / 0 FAIL / 0 WARN
  node scripts/seo-audit/run-seo-checks.mjs                     # 32 PASS / 0 FAIL / 0 WARN
  node scripts/design-audit/check-performance.mjs               # PASS（A 1 WARN 旧 bundle）
  node scripts/design-audit/run-token-audit.mjs                 # PASS（273/hash 3db11395ede1/104 文件/JS 0）
  ```
- **迁移报告**：Phase 1 —— 94 页 / **85 变更** / 0 异常 / 40 无 footer 跳过（`audit/design-migration/r2/nav-role-separation-apply.{md,json}`）；Phase 2A —— 94 页扫描 / **54 变更**（square→contact）/ 0 异常 / 40 无全局导航跳过（`audit/design-migration/r2/nav-global-apply.{md,json}`）；Phase 2B-1 —— 94 页扫描 / **40 变更** / 0 异常 / 0 跳过（`audit/design-migration/r2/footer-standalone-apply.{md,json}`，dry-run 同目录）。
- **Phase 2B-1 关键修复（类名检测 bug）**：F 首版用 `class="footer-tools"` 精确匹配，standalone 多类名（`class="footer-tools footer-tools--standalone"`）导致 40 页被误判“缺少 footer-tools”（`footer-layout.md` FAIL 5/1）；三个脚本统一前缀匹配 `class="footer-tools` 后复跑 **PASS 6/6**（`footer-layout2.md`，95 页）。
- **实测（本地 CDP）**：1440 首页全局导航 **[Home, Blog, About, Contact]**、`.tool-nav` 5 links/44px、`homeCards:0`、footer-tools 在 `<footer>` 内；工具页全局导航同 [Home, Blog, About, Contact] 且无 Square/`/tools/`、`.tool-nav` 4 links 无 Home；about `toolNav:false`；390×844 首页 nav **60px**、上传区 top **109px**、`scrollWidth=390`；**Phase 2B-1**：`birthday-collage-maker.html` 桌面 `.footer-tools--standalone` **5 links**（不在 footer 内，href `/`+/tools/*）；`es/free-collage-maker.html` 390 **5 links、`scrollWidth=390`（0 溢出）**；54 页 footer 内 footer-tools + 40 页 standalone → **94/94 页面有 footer-tools**；合计 **470 个 footer 工具链接全部 200**（54×5 = 270 已验证 + 40×5 = 200 本机复跑 `pages=40/links=200/badCount=0`）。截图 `audit/design-migration/r2/nav-phase1/*.png`、`audit/design-migration/r2/footer-standalone/{birthday-desktop-footer.png,es-free-collage-mobile-390.png}`。
- **门禁结果**：`check-layout` **PASS 6/6（95 页，A/B/C/D/E/F 全 PASS）**——Phase 1 后 `nav-final-layout.{json,md}`；Phase 2B-1 后 `footer-layout2.{json,md}`（15:06，95 页）；fingerprint 无 FAIL/WARN。production（Phase 1+2A）：`d363e0f` 生产验收 **41/0/2**（`audit/evidence/design-tokens/nav-prod-verify-d363e0f-*.md`）。
- 未做：Phase 2B-1 的 Preview/生产（待批准）、真机、Tools 下拉（用户明确不做）、Contact 表单（用户稍后布置）。

## 未做 / 后续

- **Phase 1+2A 已生产上线**（`d363e0f`，生产验收 41/0/2，PR #6 已合并 `main` `87f8be5`）；**Phase 2B-1 待 Preview/维护者批准**（本地门禁已过）。
- **Tools 下拉：不做**（用户明确）；工具入口已固定在 `.tool-nav` + `.footer-tools`（footer 内/standalone）且全站每页至少一个可爬工具入口（470 链接全 200）。
- **40 页不做完整 footer**（用户明确）：这些页面只有 `.footer-tools--standalone`，没有版权/语言/社交等完整页脚；若未来需要统一整站页脚，另立 ADR。
- **Contact 表单**：由用户稍后自行布置（三方案见 ADR-0008 D3：A mailto 推荐 / B 第三方 / C 自建；B 需 H8 账户操作 + 隐私政策更新）；本 ADR 只把全局导航的 Contact 链接接到既有 contact 页。
- **Preview + 真机**：桌面 84→44px、standalone FooterTools 的间距/视觉需 Preview 截图复核；移动端真实手势/长按菜单（mobile-touch 已覆盖结构，真机未测）。
- **R2-B 博客搜索的视觉/CSS** 与导航/页脚交叉处（blog 页全局 nav/tool-nav/footer-tools）需在 Preview 一起抽查。
- 旧 bundle 体积 WARN（性能预算 A 项）仍在，不属本 Phase。

## 回滚

- `git revert` 本 Phase 的提交（Phase 1：迁移脚本 + `components.css §21` + 94 页迁移；Phase 2A：`nav-global-cleanup.mjs` + i18n `nav.contact` + 54 页迁移；Phase 2B-1：`footer-tools-standalone.mjs` + `components.css .footer-tools--standalone` + 40 页迁移；以 `git log main..HEAD` 实际提交为准）；或 `git checkout -- '*.html' i18n/` 恢复页面与文案（三个迁移脚本均可重复执行、不会半写）。
- 只回滚 Phase 2B-1：删除 40 页的 `.footer-tools--standalone` 块并 revert F 规则“所有页面必须有 footer-tools” → 回到“有 footer 的页面才有 footer-tools”；或 `git revert` 对应提交。
- 只回滚 footer-tools：删除 `components.css §21` 中 `.footer-tools*` 并用 git revert 恢复页面（脚本无 `--remove`）。
- 只回滚 tool-nav 降级：revert 对应 CSS 提交（页面 HTML 不变，回到 84px 玻璃条）。
- 只回滚 Phase 2A：`git revert` 对应提交或把全局导航的 `data-page="contact"` 手动改回原 `data-page="square"` 链接（54 页）；F 门禁会因此 FAIL，需同步回滚 F 规则/记 known-issue。
- 不改 URL/数据/广告，无数据迁移；回滚后按 runbook §4.6 复跑 check-layout（F）/functional/mobile-touch/SEO。
