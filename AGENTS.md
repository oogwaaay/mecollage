# AGENTS.md — MeCollage 仓库入口（AI / 开发者会话必读）

> 适用对象：任何在本仓库工作的 AI 会话或开发者。
> 最后更新：2026-11-06（Phase A 治理 v1 + Phase F 功能修复 + Phase B 多语言/SEO + Phase C 内容质量）
> 本文件是**入口**，不是全部规则；具体流程与验收标准在 [`GOVERNANCE.md`](GOVERNANCE.md)，踩过的坑在 [`docs/lessons/README.md`](docs/lessons/README.md)。

## 0. 30 秒版

- 只读分析/写文档 → 安全，默认可以做（遵守写范围）。
- 任何会影响线上 `https://www.mecollage.top/` 的改动 → **分支 → Preview → 验收证据 → 维护者明确批准 → 生产**，一步都不能跳。
- AI 会话**永远不自主部署生产**，不碰 AdSense/GA4/Cloudinary/DNS/Vercel 项目设置等账户级操作。
- 不重复已知教训；发现新教训必须回灌 `docs/lessons/`（或报告"待分配编号"）。
- 关键事实必须带证据（命令/输出/`file:line`/URL/时间）；推断与不确定必须标注。

## 1. 开工前必读（按顺序）

1. 本文件（AGENTS.md）。
2. [`GOVERNANCE.md`](GOVERNANCE.md)—变更管理、检查单、证据标准、不可逆操作。
3. [`docs/lessons/README.md`](docs/lessons/README.md)—至少扫一遍索引；动手前整条读完与任务相关的 `L-*`。
4. 任务相关决策：[`docs/decisions/`](docs/decisions/)（当前 [ADR-0001 Phase A 安全加固](docs/decisions/ADR-0001-phase-a-security-hardening.md)）。
5. 任务相关操作：[`docs/runbooks/`](docs/runbooks/)（当前 [Preview 部署与生产上线](docs/runbooks/preview-deploy.md)）。
6. 若能读到 `audit/AUDIT-REPORT.md`（**本机审计产物，可能未入库**）：读 §7 优先级、§8 阶段计划、§10 不确定项，再动手。
7. 涉及 UI/样式/新页面：[`docs/design/DESIGN-TOKENS.md`](docs/design/DESIGN-TOKENS.md)（token 与统一规则），并跑 `node scripts/design-audit/run-token-audit.mjs`。

## 2. 硬规则（H1–H11，违反即停止）

| # | 规则 | 如何检查 / 执行 |
|---|---|---|
| H1 | **生产部署必须维护者明确批准**（书面或明确消息；沉默/默认/历史批准都不算）。默认由维护者执行；若维护者**明确要求/授权 AI 执行**生产部署，AI 必须记录批准原话、源 commit、回滚方式，且只执行一次。AI 不得自行执行 `vercel --prod`、Dashboard promote/rollback，或自行 merge 到 `main` 触发生产。 | 批准记录（消息/issue）与部署证据附到证据目录；见 ADR-0001 与 `audit/evidence/phase-a/approval.md`。 |
| H2 | **所有改动先分支 + Preview**；禁止直接改 `main`/直接推 `main`。分支命名：`phase-a/...`、`fix/<topic>`、`docs/<topic>`、`chore/<topic>`。 | `git branch --show-current` 不得为 `main`；Preview 记录见 §4。 |
| H3 | **不得把 API key / 凭据 / 第三方上传 preset 写进前端或仓库**（含注释、备份、sourcemap、测试文件）。发现疑似凭据：只做静态取证，**不做上传/登录/验证性请求**，立即报告维护者。 | `git grep -nE 'api[_-]?key|secret|token|upload_preset|Bearer|PRIVATE KEY'`；`client_secret.json` 不得入库。 |
| H4 | **不得把内部文档/备份/工具脚本暴露到部署**；新增内部目录必须在同一变更更新 `.vercelignore` 并验证线上 404。 | 见 [L-20261105-14](docs/lessons/L-20261105-14-gitignore-is-not-deploy-ignore.md) 的 404 矩阵命令。 |
| H5 | **不得修改 Publisher ID**；未经维护者书面确认不得新增/替换广告或统计代码（AdSense/GA4/CMP/Auto ads）。 | `git diff` 中出现 `pub-`、`ca-pub-`、`G-`、`adsbygoogle`、`gtag`、`googletagmanager` 时立即停下确认。 |
| H6 | **不得重复已知教训**。开工前查教训库；若本轮产生新教训，必须回灌 `docs/lessons/`（新条目 + 索引），或报告"待分配编号"。 | 交付说明列"关联 L-* + 是否新增"；无则写"无新教训"。 |
| H7 | **证据标准**：结论必须有可复现命令/指标/`file:line`/截图/日志；区分"代码层/线上层/平台层"；"推断/不确定"必须标注并写清如何确认。 | 见 GOVERNANCE §7；没有证据的"已完成/已修复"视为未完成。 |
| H8 | **不可逆/账户级操作只由维护者执行**：DNS/Cloudflare、AdSense/GA4、Cloudinary、Vercel 项目设置、GitHub Pages/Settings、域名、密钥轮换。AI 只做只读分析与方案。 | 遇到需要登录后台才能确认的事实，标"不确定（需维护者确认）"，不要猜。 |
| H9 | **不得擅自改 URL 结构**（`trailingSlash`、`cleanUrls`、重定向链、路径）。确需变更必须 ADR + 全量重定向矩阵 + 维护者批准。 | 见 [L-20261105-05](docs/lessons/L-20261105-05-lang-redirect-query-loop.md)。 |
| H10 | **不碰 git 历史**：禁止 `push --force`、`reset --hard` 到共享分支、删除分支/标签、改写历史；删除被跟踪文件必须有明确任务范围/ADR。并行会话存在时，只改分配给你的文件，避免同一文件冲突。 | `git log`/`git status`；写范围外文件一律不动。 |
| H11 | **UI/交互改动必须同时通过六道门禁**：token 审计（含 JS 运行时裸色）+ functional 回归 + **移动触摸回归**（`run-mobile-touch`）+ 移动布局门禁（`check-layout`，含**导航角色分离 F**）+ **性能预算**（`check-performance`）+ 多语言/SEO 不回归；禁止 `alert()` 产品反馈、JS 裸设计值、移动横向溢出、触控 <44px、用 headless FPS 当性能依据、把具体工具塞进全局导航；**改变用户可见行为必须同一变更内同步更新验收断言；导出/截图必须在页面已滚动状态下验收；交互后才出现的控件必须在交互后断言**（L-31~L-40）。 | 改 UI/交互后跑 `node scripts/design-audit/run-token-audit.mjs`、`node scripts/functional-audit/run-tests.mjs`、`node scripts/functional-audit/run-mobile-touch.mjs`（390×844 触摸）、`node scripts/design-audit/check-layout.mjs`、`node scripts/design-audit/check-performance.mjs`、`node scripts/seo-audit/run-seo-checks.mjs`，均 0 FAIL 才进 Preview；导航/IA 迁移加跑 `scripts/design-system/nav-role-separation.mjs` / `nav-global-cleanup.mjs` / `footer-tools-standalone.mjs` / `github-icon-link.mjs` dry-run（幂等）；打开态/上传后状态必须交互后断言（不能只靠静态首屏）；移动端 390×844 截图 + 证据归档。 |

> 只读审计任务额外约束：不修改任何被 git 跟踪的文件，不 commit，不部署；产物放任务指定目录（如 `audit/`）。

## 3. 项目速览（2026-11-05 基线）

| 项目 | 事实 | 证据 |
|---|---|---|
| 是什么 | 纯静态多语言图片工具站：拼图编辑器 + 4 个工具页（square / squarecrop / roundedcorners / blurredframe）+ 专题页 + 博客；图片处理 100% 在浏览器完成（Canvas/WASM），照片不上传 | `audit/sections/tech-architecture.md` §1.2 |
| 技术形态 | **无构建系统**：无 `package.json`/`src/`/CI；`git ls-files` 约 130 个文件；审计日 96 个手写 HTML（Phase A 删除 test-section 后 95）；运行时 i18n（`assets/js/i18n.js` + `i18n/*.json`） | `audit/evidence/tech/06_key_numbers.txt` |
| 页面结构 | 审计日 **96**（root 15 + blog 9 + `es/ja/tw/zh` 各 17 + `public/tools` 4）；Phase A 删除 `test-section.html` 后 **95**；sitemap 26 条 URL | `git ls-files '*.html'`；`sitemap.xml` |
| 图片处理 | 客户端：`assets/js/mecollage-main.js`；`html2canvas`、`@vladmandic/face-api`、`onnxruntime-web`、`@imgly/background-removal@1.4.5`（AGPL，见 L-15） | `mecollage-main.js:2235-2262` 等 |
| 部署链路 | 用户 → **Cloudflare**（DNS/CDN 代理）→ **Vercel** 静态托管 → 仓库 `main` HEAD；生产域 `https://www.mecollage.top/`；默认域 `mecollage.vercel.app`（需 noindex/301） | `audit/sections/tech-architecture.md` §2/§3；`.vercel/project.json` |
| 路由配置 | `vercel.json`：`cleanUrls`、`trailingSlash`、`/tools/* → /public/tools/*` rewrite、`/public/tools/* → /tools/*` 308、`?lang=` 重定向（有循环，见 L-05） | `vercel.json` |
| 仓库 | `oogwaaay/mecollage`（public）；Phase A 分支 `phase-a/security-hardening`：`460c39a` .vercelignore → `9b950c5` 404 → `1f9ad4c` 响应头+`?lang=` → `7391c5b` `?lang=` 空参数 → `b2a3924` 删除死文件 → 后续 cleanup/docs 提交；HEAD 以 `git log main..HEAD` 为准；**未部署生产** | `git log main..HEAD`；GitHub API |
| 部署方式 | **2026-11-05 实测：Vercel Git 集成只产生 Preview**（push main 后 GitHub Deployment 仍为 environment=Preview，生产未自动更新）；**生产部署为手动**：维护者登录后 `npx vercel deploy --prod --yes`（或 Dashboard Promote/Deploy）。Phase A 已按此上线并验收 PASS 41/0/2 | `npx vercel whoami`；`gh api repos/oogwaaay/mecollage/deployments`；`audit/evidence/phase-a/production-deploy.txt` |
| Preview / 生产 | Phase A **已上线生产**（2026-11-05，维护者批准）。Preview 验收 38 PASS/0/5；生产验收 **41 PASS / 0 FAIL / 2 WARN（exit 0）**。Preview 默认受 Vercel Authentication 保护，已用 `npx vercel login` + `npx vercel curl` 自动 bypass 完成验收（runbook §3 方式 D）。证据：`audit/evidence/phase-a/verification/preview*.{json,md}`、`post-release-prod.{json,md}`、`audit/evidence/phase-a/production-deploy.txt` | 2026-11-05 实测 |
| Phase F 功能修复 | 2026-11-05：修复首页比例/网格/导出/撤销/贴纸/AI 人脸、4 个工具页 6 个 P0、文案夸大；浏览器回归 **52 PASS / 0 FAIL / 1 WARN**；**已上线生产并验收**（部署层 41/0/2 + 生产冒烟 PASS），`main` 已合并 | `audit/PHASE-F-REPORT.md`、`docs/phase-f/PHASE-F-SUMMARY.md`、`scripts/functional-audit/`、ADR-0002 |
| Phase B 多语言/SEO | 2026-11-05：i18n 路径推导+禁运行时覆盖；语言切换真实锚点+40 页语言 nav；sitemap 26→**94 URL**；hreflang/canonical 统一；robots 移除 `?lang=` Disallow；本地化内链 348 处；6 页非法 `lang=x-default`、100 个 meta 占位清理。SEO harness **20 PASS / 0 FAIL / 0 WARN**；功能回归 52/0/1；独立复核 0 FAIL；Preview 38/0/5；**已上线生产并验收 41/0/2 + 生产冒烟 PASS**，`main` 已合并 | `docs/phase-b/PHASE-B-SUMMARY.md`、`docs/decisions/ADR-0003-phase-b-i18n-seo.md`、`scripts/seo-audit/`、`audit/evidence/phase-b/` |
| Phase C 内容质量 | 2026-11-06：32 薄本地化页 noindex+移出 sitemap/hreflang；sitemap 60；square/vertical 308 合并；3 篇博客扩写；60 页 JSON-LD；description≤160；本地化首页单一 H1；privacy/terms 5 语言修正。SEO harness **28 PASS/0 FAIL/0 WARN**；功能回归 52/0/1；独立复核 0 FAIL；Preview 38/0/5；**已上线生产并验收 41/0/2 + 生产冒烟 PASS**，`main` 已合并 | `docs/phase-c/PHASE-C-SUMMARY.md`、ADR-0004、`audit/evidence/phase-c/` |
| Phase D 工具意图/独立页恢复 | 2026-11-06：square / squarecrop 不合并，按 fill/no-crop vs crop 做 title/H1/description/互链（5 语言）；恢复 /square-collage/ 独立页（sitemap 61、JSON-LD、首页内链）；无 square 301；harness v1.3.0 **32 PASS/0 FAIL/0 WARN**；Preview 38/0/5；**已上线生产并验收 41/0/2**，`main` 已合并 | `docs/phase-d/PHASE-D-SUMMARY.md`、ADR-0005、`audit/evidence/phase-d/` |
| Phase E 内链/how-to/标题 | 2026-11-06：square/squarecrop 正文自然内链（全站 href 56/43、正文 25/30）；how-to 改 iPhone/Android/Windows/Mac 长尾并加 4 设备节；roundedcorners 标题/H1 改 “Rounded Corners: …”；8 blog + 首页双卡；vertical-collage 从 301 恢复独立页；Square Crop FAQ 真问答/JSON-LD 同步（生产端 5 语言逐条一致）；sitemap 62；harness 32/0/0；Preview 38/0/5；**已上线生产并验收 41/0/2** | `docs/phase-e/PHASE-E-SUMMARY.md`、L-29、`audit/evidence/phase-e/` |
| Phase G Design Token + R0/R1 交互 | 2026-11-06：273 个 `--mc-*` token 单一事实源 + `components.css` 统一层覆盖 94 页（6,955 处 token 化）；R0 alert 15→0 / 可见 Undo/Redo / 移动导航 270→60px；R1 工具优先布局（首页上传 1148→109px、工具页 1193→259–434px）/导出反馈/AI 懒加载/触控拖拽；Preview 38/0/5、**生产 41/0/2 已上线**，PR #3 合并 `afbdb92` | `docs/phase-g/PHASE-G-SUMMARY.md`、ADR-0006/0007、`docs/design/`、`scripts/design-audit/`、`audit/evidence/design-tokens/`（本地） |
| Phase R2 移动触控 + 博客搜索 + 性能预算 + 导航角色分离 | 2026-11-06：新增 `scripts/functional-audit/run-mobile-touch.mjs`（6 用例 MT-01~06，390×844 触摸模拟）+ 修复导航面板 **y=4524→60** / 底栏按钮 **14–24→44px**；博客列表搜索（`blog-search.js` + `components.css §20` + 5 语言 `blog.search.*` 5 键，渐进增强/不改 URL）；`scripts/design-audit/check-performance.mjs` + 性能预算（headless A/B 无差异 → 不做无证据 blur 缩减）；**导航角色分离 Phase 1+2A**（`nav-role-separation.mjs`：20 工具页去 Home/10 内容页去 tool-nav/1 首页去重复卡/54 页 footer-tools；`nav-global-cleanup.mjs`：54 页全局 nav 工具→Contact + `nav.contact` 5 键；桌面 tool-nav 84→44px；**已生产部署 `d363e0f`，验收 41/0/2，PR #6 合并**）；**Phase 2B-1**（`footer-tools-standalone.mjs`：40 无 footer 页加 `.footer-tools--standalone`（40 处/0 异常）；F 扩为**所有页面必须有 footer-tools**；**94/94 页有 footer-tools**、470 链接全 200；修复类名精确匹配 bug → 前缀 `class="footer-tools`）；**Phase 2B-2**（`github-icon-link.mjs`：54 页 GitHub 入口改**纯图标内联 SVG**（54 处/0 异常；44×44/22px；`nav.github_view` 5 键 aria/title；`text=""`；390 隐藏、footer 文字兜底）；F 新增 GitHub 纯图标规则；check-layout **PASS 6/6（95 页）**）；**本地 functional 53/0/2、mobile 6/0/0、layout 6/6、SEO 32/0/0、perf PASS、token PASS（基线 334/151/1553）；Phase 2B-1/2B-2 在 PR #7 未合并/未上线（待批准），Tools 下拉不做/Contact/真机待** | `docs/phase-r2/PHASE-R2-SUMMARY.md`、ADR-0008/0009、L-37~40、`scripts/functional-audit/run-mobile-touch.mjs`、`scripts/design-audit/check-performance.mjs`、`scripts/design-system/{nav-role-separation,nav-global-cleanup,footer-tools-standalone,github-icon-link}.mjs`、`audit/design-migration/r2/`（本地） |
| 已知 P0/P1 | i18n 渲染 bug、本地化孤岛、AdSense 合规前置、404 广告/跳转、Cloudinary preset、安全头缺失等 | `audit/AUDIT-REPORT.md` §7；`docs/lessons/` |

**关键约束（写代码前先想）**

1. 没有构建/模板：改页面常见动作是"改多份文件"，必须先量化影响面（[L-02](docs/lessons/L-20261105-02-handwritten-static-pages.md)）。
2. 96 个 HTML 中 5 套语言是手写副本；任何模板级修改至少覆盖 root + 4 语言。
3. 站点通过 `vercel.json` 统一加响应头/重定向；`.htaccess` 在 Vercel 不生效（[L-06](docs/lessons/L-20261105-06-htaccess-ineffective-on-vercel.md)）。
4. Cloudflare 会在边缘注入 RUM/响应头，仓库代码看不到（[L-07](docs/lessons/L-20261105-07-cloudflare-rum-injection.md)）。
5. 浏览器渲染后的 DOM 才是 Googlebot 看到的（[L-01](docs/lessons/L-20261105-01-i18n-runtime-default-language.md)、[L-11](docs/lessons/L-20261105-11-evidence-layers.md)）。

## 4. 标准工作流（生产变更唯一路径）

```
check → branch → change → verify → preview → evidence → maintainer approval → production
```

1. **check**：`git status --short`、`git branch --show-current`；读任务对应 `L-*` 与 ADR；确认写范围。
2. **branch**：从最新 `main`（或任务指定基线）建分支，禁止在 `main` 改。
3. **change**：最小改动；跨多文件先写脚本/codemod；内部文件更新 `.vercelignore`。
4. **verify（本地/静态）**：能本地验证的先验证（HTML/JSON 语法、`vercel.json` 合法、grep 一致性）；功能类改动必须跑 `node scripts/functional-audit/run-tests.mjs`，多语言/SEO/head 类改动必须跑 `node scripts/seo-audit/run-seo-checks.mjs`，UI/交互/移动布局/导航类改动**还必须**跑 `node scripts/design-audit/run-token-audit.mjs`（含 JS 运行时扫描）、`node scripts/design-audit/check-layout.mjs`（溢出/壁纸/触控/alert/**导航角色分离 F：所有页面必须有 footer-tools**（footer 内或 `.footer-tools--standalone`；类名用前缀匹配 `class="footer-tools`）、**GitHub 纯图标**（`.github-link__icon`+`aria-label`、不得带文字））、`node scripts/functional-audit/run-mobile-touch.mjs`（390×844 触摸、交互后/打开态断言）与 `node scripts/design-audit/check-performance.mjs`（超预算 FAIL、>90% WARN）；导航/IA 迁移还要跑 `scripts/design-system/nav-role-separation.mjs` / `nav-global-cleanup.mjs` / `footer-tools-standalone.mjs` / `github-icon-link.mjs` 的 dry-run（幂等，0 pending change）；均 0 FAIL 才进 Preview；列出需要在 Preview 验证的项。
5. **preview**：push 分支 → 等 Vercel Preview → 取 `environment_url`（命令见 [runbook](docs/runbooks/preview-deploy.md)）→ 跑 `node scripts/verify-site.mjs --base <preview-url>`。
6. **evidence**：把 verify 输出（JSON/MD）、关键 curl/渲染结果存 `audit/evidence/<phase>/verification/`，文件名含 commit sha 与时间。
7. **maintainer approval**：把"改了什么、证据、风险、回滚方式"发给维护者，得到明确批准。
8. **production**：由维护者执行（或维护者授权后执行）；上线后立即用同一脚本/矩阵跑生产验收，结果归档。
9. **close**：更新相关 `L-*` 状态与证据；若有新教训，新建条目并更新索引。

**禁止路径**：本地改完直接 `vercel --prod`；只跑本地预览就合并；带着 verify FAIL 合并；跳过证据直接说"已修好"。

## 5. 文档索引

| 文档 | 用途 |
|---|---|
| [`GOVERNANCE.md`](GOVERNANCE.md) | 变更分级/审批、发布检查单、回滚、教训回灌、证据标准、角色与不可逆操作 |
| [`docs/lessons/README.md`](docs/lessons/README.md) | 教训库索引 + 新增流程 + 状态机 |
| [`docs/lessons/TEMPLATE.md`](docs/lessons/TEMPLATE.md) | 新教训模板 |
| [`docs/decisions/`](docs/decisions/) | ADR；Phase A [ADR-0001](docs/decisions/ADR-0001-phase-a-security-hardening.md)、Phase F [ADR-0002](docs/decisions/ADR-0002-functional-integrity-fixes.md)、Phase B [ADR-0003](docs/decisions/ADR-0003-phase-b-i18n-seo.md)、Phase C [ADR-0004](docs/decisions/ADR-0004-content-quality-phase-c.md)、Phase D [ADR-0005](docs/decisions/ADR-0005-square-tool-intent-and-collage-restore.md)、[ADR-0006](docs/decisions/ADR-0006-design-token-single-source.md)、[ADR-0007](docs/decisions/ADR-0007-interaction-refinement.md)、[ADR-0008](docs/decisions/ADR-0008-r2-mobile-touch-performance-blog-search.md)、[ADR-0009](docs/decisions/ADR-0009-nav-role-separation-phase1.md) |
| [`docs/runbooks/preview-deploy.md`](docs/runbooks/preview-deploy.md) | 分支 → Preview → 验收 → 生产/回滚 操作手册 |
| [`docs/design/DESIGN-TOKENS.md`](docs/design/DESIGN-TOKENS.md)、[COMPONENT-RECIPES.md](docs/design/COMPONENT-RECIPES.md)、[INTERACTION-AUDIT.md](docs/design/INTERACTION-AUDIT.md) | 设计 token 单一事实源（273 个 `--mc-*`）、组件配方、G0–G4 迁移策略与交互审计/路线图；改 UI/样式/交互前必读，并跑 `node scripts/design-audit/run-token-audit.mjs` |
| [`docs/design/PAGE-PATTERNS.md`](docs/design/PAGE-PATTERNS.md)、[prototypes/README.md](docs/design/prototypes/README.md) | 页面族/内联块盘点与 R0/R1 交互原型（含可复现截图与实现接口）；UI/交互改造先看审计 + 原型再动手 |
| [`scripts/design-audit/`](scripts/design-audit/README.md) | 设计门禁：`run-token-audit.mjs`（token/JS 运行时裸色/文档一致，含基线比对）+ `check-layout.mjs`（移动溢出/固定壁纸/触控 ≥44px/alert/AI 预加载/**导航角色分离 F**）+ `check-performance.mjs`（性能预算：体积/DOM/backdrop/脚本，超预算 FAIL、>90% WARN）；改 UI/交互必跑 |
| [`scripts/design-system/`](scripts/design-system/README.md) | 存量页面统一迁移与 UI 注入：`migrate.mjs`（token 化）、`inject-ui.mjs`（ui.js 注入/回滚）、`nav-role-separation.mjs`（导航角色分离 Phase 1）、`nav-global-cleanup.mjs`（全局导航收口 Phase 2A）、`footer-tools-standalone.mjs`（无 footer 页 FooterTools Phase 2B-1）、`github-icon-link.mjs`（GitHub 纯图标 Phase 2B-2）；均为 dry-run 默认/幂等 |
| `audit/AUDIT-REPORT.md` | 2026-11-05 全面审计（**本机产物，不入库**：公开仓库安全考虑；含优先级、阶段计划、不确定项） |
| `audit/sections/*.md`、`audit/evidence/` | 审计分报告与原始证据（同上，可能未入库） |
| `scripts/verify-site.mjs` | Phase A 起的零依赖部署验收脚本（HTTP/安全头/404/重定向） |
| `scripts/functional-audit/` | Phase F 起的零依赖浏览器功能回归（CDP + 本地 Vercel 模拟；`node scripts/functional-audit/run-tests.mjs`）+ R2 移动触摸回归（`node scripts/functional-audit/run-mobile-touch.mjs`，390×844 触摸/打开态/滚动后导出） |
| `scripts/seo-audit/` | Phase B 起的零依赖多语言/SEO 验收（v1.3.0 Phase E：32 检查、62 页可索引 + 32 noindex；`node scripts/seo-audit/run-seo-checks.mjs`） |
| `docs/phase-b/PHASE-B-SUMMARY.md` | Phase B 多语言/SEO 公开摘要 |
| `docs/phase-f/PHASE-F-SUMMARY.md` | Phase F 功能真实性修复公开摘要（修复项、验证、剩余人工项） |
| [`docs/phase-c/PHASE-C-SUMMARY.md`](docs/phase-c/PHASE-C-SUMMARY.md) | Phase C 内容质量整改公开摘要 |
| [`docs/phase-d/PHASE-D-SUMMARY.md`](docs/phase-d/PHASE-D-SUMMARY.md) | Phase D square 工具意图区隔/独立页恢复摘要 |
| [`docs/phase-e/PHASE-E-SUMMARY.md`](docs/phase-e/PHASE-E-SUMMARY.md) | Phase E 内链/how-to/rounded corners 标题摘要 |
| [`docs/phase-g/PHASE-G-SUMMARY.md`](docs/phase-g/PHASE-G-SUMMARY.md) | Phase G Design Token 体系 + R0/R1 交互改造公开摘要（已上线 41/0/2） |
| [`docs/phase-r2/PHASE-R2-SUMMARY.md`](docs/phase-r2/PHASE-R2-SUMMARY.md) | Phase R2 移动触控回归 + 博客搜索 + 性能预算 + 导航角色分离（Phase 1+2A 已上线、Phase 2B-1 本地完成）公开摘要（Tools 下拉不做；Contact/真机待） |

## 6. 当前已知未关闭风险（截至 2026-11-05）

> 这些不是"待办清单"，而是**下一次会话最可能再犯的坑**。处理前先读对应教训；不要在未读的情况下重复"修复"。

- P0：~~i18n 渲染成英文（L-01）~~、~~本地化页孤岛（L-09）~~（**Phase B 已修复/上线待批准**；L-23/L-24）；AdSense 合规前置与 ID 归属（L-10）、404 广告/跳转（L-04；**已上线生产并验证 PASS：404 状态/无广告/无跳转/noindex**）。
- P1：Cloudinary unsigned preset（L-03；**已闭环：代码/生产均无引用，维护者 2026-11-05 已在 Console 删除 `public_works_unsigned`（截图归档 `audit/evidence/phase-a/cloudinary/`）；公开 git 历史仍含字符串但匿名上传面已消除，见 L-16**）、安全头缺失/`.htaccess` 无效（L-06；**已上线生产，6 项头全部下发并验收 PASS**）、超大图片（L-08）、AGPL/许可（L-15）。
- P2/回归：`?lang=` 循环（L-05，**已上线生产并验证：5 条均单跳、最终 URL 无 `?lang=`、无循环**）、默认 vercel.app 域可索引（L-13；**已上线生产，实测 `x-robots-tag: noindex, nofollow`**）、内部文件公开（L-14；**已上线生产并验证 10/10 遗留文件 404、9/9 关键资产 200**）、Cloudflare RUM 口径（L-07）、公开 git 历史暴露（L-16；本案例 preset 已删除、匿名上传面已消除，通用规则保留）、死资源判定口径（L-17）。
- 流程：**Phase A 已按 branch → Preview（38 PASS）→ 维护者批准 → 生产部署 → 生产验收（41 PASS/0/2）完整走通**（L-12）；生产部署方式为手动 CLI/Dashboard，不是 main push 自动上线。
- Phase F：功能真实性修复**已上线生产并验证**（浏览器回归 52/0/1；部署层 41/0/2；生产冒烟 PASS；`main` 已合并）；本次未改安全头/404/重定向/Publisher ID/广告/GA4。
- Phase B：多语言/SEO 结构修复**已上线生产并验证**（SEO harness 20/0/0、功能 52/0/1、生产部署层 41/0/2、生产冒烟 PASS；`main` 已合并）。
- Phase C：内容质量整改**已上线生产并验证**（sitemap 60、32 noindex、308 合并、3 博客扩写、60 JSON-LD、privacy/terms 修正；部署层 41/0/2；生产冒烟 PASS；`main` 已合并）；本地化薄页重写/28 条本地化首页卡片内链/lastmod 等非阻断项未做。
- Phase D：square/squarecrop **不合并**，按 fill/no-crop vs crop 意图区隔；恢复 `/square-collage/` 独立页；sitemap 61；harness 32/0/0；Preview 38/0/5；**已上线生产并验收 41/0/2**；`main` 已合并。
- Phase E：工具页正文内链（全站 href 56/43、正文 25/30）、how-to 设备长尾、roundedcorners 标题/H1、vertical-collage 恢复；harness 32/0/0；Preview 38/0/5；**已上线生产并验收 41/0/2**；`main` 已合并。
- Phase G：Design Token 单一事实源 + R0/R1 交互改造**已上线生产并验收**（Preview 38/0/5、生产 41/0/2、PR #3 合并 `afbdb92`）；H11 四道门禁 + L-31~L-36 已回灌治理；未做项/真机复核见 `docs/phase-g/PHASE-G-SUMMARY.md`。
- Phase R2：移动触控回归 + 博客搜索 + 性能预算 + **导航角色分离**（Phase 1+2A **已生产上线 `d363e0f`、验收 41/0/2、PR #6 合并**；Phase 2B-1 + 2B-2 在 **PR #7 未合并**、本地完成待 Preview）——functional 53/0/2、mobile 6/0/0、**layout 6/6**、SEO 32/0/0、perf PASS、token PASS 基线 334/151/1553；导航：20 工具页去 Home / 10 内容页去 tool-nav / 1 首页去重复卡 / 54 页 footer-tools（270 链接 200）+ 54 页全局 nav 工具→Contact（`nav.contact` 5 键）、桌面 tool-nav 84→44px；**Phase 2B-1**：40 无 footer 页加 `.footer-tools--standalone`（40 处/0 异常），F 扩为**所有页面必须有 footer-tools**，**94/94 页有 footer-tools、470 链接全 200**，修复类名精确匹配 bug（前缀 `class="footer-tools`）；**Phase 2B-2**：54 页 GitHub 入口改**纯图标内联 SVG**（44×44/22px、`aria-label`/`title` 本地化 `nav.github_view` 5 键、`text=""`、390 隐藏/footer 文字兜底），F 新增 GitHub 纯图标规则并 PASS 6/6；新增 `run-mobile-touch`/`check-performance` 后 H11 扩为**六道门禁**，L-37~L-40 已回灌；**Tools 下拉不做/Contact 表单/真机/PR #7 合并待**，详见 `docs/phase-r2/PHASE-R2-SUMMARY.md`。

## 7. 会话结束前自检（逐条勾）

- [ ] 写范围之外的文件**没有**被修改（`git status --short` 对照任务范围）。
- [ ] 若执行了生产部署：已有维护者明确授权记录 + 源 commit + 回滚方式，且已跑生产验收并归档；未授权时不得执行。没有动 git 历史。
- [ ] 没有引入密钥/凭据/上传 preset；没有新增未登记的第三方依赖。
- [ ] 关键结论都有证据；不确定项已标注；没有把推断写成事实。
- [ ] 相关 `L-*` 已检查；新教训已回灌或已报告"待分配编号"。
- [ ] 交付说明含：改了什么、验证命令与输出、风险、回滚方式、待维护者确认项。

## 8. 高频错误清单（看到就停）

1. 看到 `curl` 静态 HTML 正常就宣布"多语言/SEO 正常"（忽略渲染层，L-01/L-11）。
2. 用默认 `curl` 无命中就宣布"没有统计/没有广告"（忽略平台注入，L-07）。
3. 在 `.htaccess` 里加安全头/缓存（Vercel 不生效，L-06）。
4. 只改 `index.html` 忘了 4 个语言副本（L-02）。
5. 为验证 Cloudinary preset 是否有效去"上传一张试试"（禁止，L-03）。
6. 直接替换 AdSense Publisher ID 或补广告位"先跑起来"（禁止，L-10）。
7. 只删 AdSense 脚本却保留 404 自动跳转（L-04）。
8. 在 `vercel.json` 重定向里不处理 query，导致循环（L-05）。
9. 把内部文档/备份留在部署面，用 `.gitignore` 当保险（L-14）。
10. 跳过 Preview/证据直接上生产（L-12）。
11. 新页面写裸色值/复制其他页内联样式块/绕过 `--mc-*` token → 先读 DESIGN-TOKENS，审计会 FAIL。
12. 用 `alert()` 当产品反馈（阻塞、多数硬编码英文、harness 只认 dialog）→ 用 `window.mcUI.toast`（L-32；`check-layout` D 项会 FAIL）。
13. 在 JS 里写 `style.color = '#hex'` 绕过 token（token 审计 v1.1 已扫 JS 运行时色）→ 用 class / `var(--mc-*)`（L-31）。
14. 只测桌面就说"移动端没问题"（横向溢出会让固定壁纸露出深色兜底）→ 跑 `node scripts/design-audit/check-layout.mjs --full`，320/360/390 全 0 溢出（L-34）。
15. 改了用户可见行为却不更新 functional 断言（旧断言读 alert dialog → 假 FAIL/假 PASS）→ 同批更新断言并保留旧口径兼容期（L-35）。
16. 导出/截图只在页面顶部（`scrollY=0`）验收（html2canvas foreignObject 按滚动偏移克隆，自动滚动后导出会全白；FNV 纯白 hash `d2b3285`）→ 先在页面上滚再导出，并断言导出像素 hash ≠ 纯白（L-36；wrapper 在视口原点时必须显式 `scrollX:0, scrollY:0`）。
17. 用 headless Chrome 的 FPS 差异证明/否定 blur 等 GPU 性能（rAF 锁 60fps、GPU 合成虚拟化）→ 性能结论用真机 DevTools；防回归用 `node scripts/design-audit/check-performance.mjs` 预算（L-37）。
18. 用 `check-layout` 静态首屏 PASS 宣布"移动端没问题"（上传后的工具栏、点按后的导航面板/抽屉等交互态测不到）→ 跑 `node scripts/functional-audit/run-mobile-touch.mjs` + `check-layout.mjs --strict-touch`（L-38）。
19. 只设 `element.hidden = true` 就认为已隐藏（author CSS 的 `display` 会覆盖 UA `[hidden]{display:none}`）→ 补 `[hidden]{display:none!important}` 组件兜底，并用 computed display 验收（L-39）。
20. 把具体工具/入口放进全局导航，或让 `.tool-nav` 承担 Home/全站职责（Home 重复、内容页带 tool-nav、首页重复工具卡），或让无 footer 的页面没有工具入口 → 导航角色分离：全局 nav=wayfinding（Home/Blog/About/Contact，无具体工具）、`.tool-nav` 只列工具、**所有页面必须有 footer-tools**（有 footer 放 footer 内，无 footer 用 `.footer-tools--standalone`）保内链；**类名检测用前缀匹配 `class="footer-tools`**（多类名精确匹配会漏检）；**GitHub 图标不得带可见文字/必须 aria-label + 内联 SVG**（用户明确图标 only；`text=""`、44×44、390 隐藏靠 footer 文字兜底）；跑 `node scripts/design-audit/check-layout.mjs` F 项 + `nav-role-separation.mjs`/`nav-global-cleanup.mjs`/`footer-tools-standalone.mjs`/`github-icon-link.mjs` dry-run（L-40）。
