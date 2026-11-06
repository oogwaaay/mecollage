# 教训库（Lessons Learned）— 索引与使用说明

> 目的：把审计、修复、Preview/生产迭代中踩过的坑，变成**下一次会话可以直接执行的规则 + 可复现的检测命令**。
> 任何 AI/开发者在本仓库开工前必须读本索引；与任务相关的条目必须整条读完。
> 治理总则见仓库根目录 [`GOVERNANCE.md`](../../GOVERNANCE.md)；入口见 [`AGENTS.md`](../../AGENTS.md)。

## 1. 使用方式（开工前 2 分钟）

1. 读本页索引，按「关联文件 / 关键词」找到与任务相关的 `L-*`。
2. 读条目里的 **规则** 与 **检测方法**；动手前先跑一次检测命令，记录基线。
3. 如果任务会触碰该条目的关联文件/配置，必须把检测命令加入本轮验收，并在交付说明中给出"修复前/修复后"输出。
4. 如果发现了新坑：按 §4 新建条目，并更新本索引；**不允许只在聊天里说、不回灌**。

## 2. 状态机与术语

| 状态 | 含义 | 进入条件 | 谁能改 |
|---|---|---|---|
| `open` | 已知问题，未处理或处理未验证 | 发现并记录 | 审计者/实施者 |
| `mitigated` | 已实施缓解/已修正方法，但未证明根因消除 | 有证据（部署/文档/脚本） | 实施者，需证据 |
| `closed` | 根因消除 + 检测命令通过 + 证据归档 | 验收通过 | 审计者复核后 |
| `regressed` | 曾 mitigated/closed 后再次出现 | 复现问题 + 关联到旧 ID | 任何人，需写明复发版本/日期 |

> 状态只前进不删除；`closed` 的条目永久保留（防止"删了就当没发生"）。`regressed` 的条目回到 `open` 流程处理，但保留复发历史。

## 3. 索引（40 条，2026-11-05 审计 + Phase A 提炼；2026-11-06 交互改造补 L-31~L-36，R2 补 L-37~L-40）

| ID | 标题 | 状态 | 严重度 | 关联文件 | 日期 |
|---|---|---|---|---|---|
| [L-20261105-01](L-20261105-01-i18n-runtime-default-language.md) | i18n 运行时默认语言写死 `en`，本地化页渲染成英文 | **closed**（Phase B；L-23） | P0 | `assets/js/i18n.js` | 2026-11-05 |
| [L-20261105-02](L-20261105-02-handwritten-static-pages.md) | 96 个静态页手写复制、无构建，已产生漂移 | open | P1 | 96 个 `*.html`、`assets/js/index-CurY6_0Y.js` | 2026-11-05 |
| [L-20261105-03](L-20261105-03-cloudinary-unsigned-preset-dead-code.md) | 死代码 bundle 含 Cloudinary unsigned preset 且线上可下载 | **closed**（preset 已删除，截图归档） | P1 | `assets/js/index-CurY6_0Y.js:1517`、`.backup` | 2026-11-05 |
| [L-20261105-04](L-20261105-04-404-ad-and-auto-redirect.md) | 404 页挂 AdSense + JS 自动跳转，`/404/` 200 软 404 | closed（Preview+生产验证） | P1 | `404.html`、`vercel.json` | 2026-11-05 |
| [L-20261105-05](L-20261105-05-lang-redirect-query-loop.md) | `?lang=` 重定向保留 query 造成自循环，且同类配置曾清理后回归 | closed（Preview+生产验证） | P2 | `vercel.json`、`robots.txt:4` | 2026-11-05 |
| [L-20261105-06](L-20261105-06-htaccess-ineffective-on-vercel.md) | `.htaccess` 安全头/缓存在 Vercel 不生效 | closed（`vercel.json` 已上线并验证） | P1 | `.htaccess`、`vercel.json` | 2026-11-05 |
| [L-20261105-07](L-20261105-07-cloudflare-rum-injection.md) | Cloudflare RUM 边缘注入，默认 curl 不可见 | mitigated | P1 | 平台层；`audit/evidence/tech/02_page_weight.txt` | 2026-11-05 |
| [L-20261105-08](L-20261105-08-oversized-images.md) | 3 个 1.19MB 相同图标 + 6 张 >1MB PNG 占仓库 73% | open | P1 | `favicon*.png`、`apple-touch-icon.png`、`wallImage.png` 等 | 2026-11-05 |
| [L-20261105-09](L-20261105-09-localized-orphan-pages.md) | 68 个本地化页不在 sitemap、52 页零入链、切换器非链接 | **closed**（Phase B；L-24） | P0 | `sitemap.xml`、`assets/js/i18n.js` | 2026-11-05 |
| [L-20261105-10](L-20261105-10-adsense-script-without-inventory.md) | AdSense 55 页有脚本 0 广告位，ID 归属未验证，合规前置缺失 | open | P0 | `ads.txt`、55 个 HTML、`privacy.html` | 2026-11-05 |
| [L-20261105-11](L-20261105-11-evidence-layers.md) | 审计结论必须区分代码层/线上层/平台层证据 | mitigated | P1 | `audit/AUDIT-REPORT.md` §10 | 2026-11-05 |
| [L-20261105-12](L-20261105-12-preview-before-production.md) | 所有生产变更必须 Preview 先行并留验收证据 | closed（Phase A 完整走通） | P0 | `scripts/verify-site.mjs`、`docs/runbooks/preview-deploy.md` | 2026-11-05 |
| [L-20261105-13](L-20261105-13-default-vercel-domain-indexable.md) | 默认域名 `mecollage.vercel.app` 可索引，重复内容 | closed（生产实测 noindex 生效） | P2 | Vercel 项目层；`vercel.json` | 2026-11-05 |
| [L-20261105-14](L-20261105-14-gitignore-is-not-deploy-ignore.md) | `.gitignore` ≠ 部署忽略，内部文档/备份线上可下载 | closed（Preview+生产验证） | P2 | `.gitignore`、`.vercelignore` | 2026-11-05 |
| [L-20261105-16](L-20261105-16-public-git-history-keeps-secrets-recoverable.md) | 公开仓库的 git 历史/分支会让已删除代码继续可得 | mitigated（本案例 preset 已删除；通用规则保留） | P2 | git history、`origin/gh-pages` | 2026-11-05 |
| [L-20261105-17](L-20261105-17-dead-asset-reference-methodology.md) | 死资源判定：CSS class 名 ≠ 文件引用，WebP fallback ≠ 死资源 | mitigated（Phase A 采用并删除 2 个真死资源） | P3 | `upload-icon.png/.webp`、`wallImage.png` | 2026-11-05 |
| [L-20261105-23](L-20261105-23-runtime-i18n-must-not-overwrite-static-pages.md) | 运行时 i18n 不得覆盖静态本地化页；语言必须从 URL 推导 | closed（Phase B） | P0 | `assets/js/i18n.js` | 2026-11-05 |
| [L-20261105-24](L-20261105-24-multilingual-seo-single-source.md) | sitemap/hreflang/语言切换/内链必须同一映射生成 | closed（Phase B） | P0 | `sitemap.xml`、68 本地化页 | 2026-11-05 |
| [L-20261105-25](L-20261105-25-static-meta-placeholders-and-invalid-lang.md) | SEO meta 必须静态真实文本；`html lang` 禁用 x-default | closed（Phase B） | P1 | 100 个 meta、6 个 html lang | 2026-11-05 |
| [L-20261106-26](L-20261106-26-thin-content-stoploss-must-update-sitemap-hreflang-links.md) | 薄内容止损必须同步 sitemap/hreflang/内链 | closed（Phase C 生产验收） | P1 | `sitemap.xml`、32 本地化页、`vercel.json` | 2026-11-06 |
| [L-20261106-27](L-20261106-27-jsonld-must-come-from-real-content-and-cover-same-class.md) | JSON-LD 必须由真实内容生成并覆盖同类页 | closed（Phase E FAQ 修正，生产验收） | P3 | 60 可索引 HTML、`scripts/seo-audit` | 2026-11-06 |
| [L-20261106-28](L-20261106-28-tool-merge-requires-feature-parity.md) | 工具页合并前必须验证功能对等；301 不能替代功能迁移 | closed（Phase D 意图区隔，生产验收） | P1 | `public/tools/square*`、ADR-0005 | 2026-11-06 |
| [L-20261106-29](L-20261106-29-internal-link-targets-must-state-metric.md) | “站内入链 40+”必须先定义口径 | closed（Phase E 生产验收） | P3 | `audit/evidence/phase-e/link-counts.json` | 2026-11-06 |
| [L-20261106-30](L-20261106-30-design-values-hardcoded-and-drift.md) | 设计值与组件样式无单一事实源，硬编码+多语言复制持续漂移；需 token 单一事实源 + 审计基线门禁 | **mitigated**（token/统一层/门禁已落地，存量迁移 G2–G3 未完成） | P1 | `assets/css/design-tokens.css`、`assets/css/components.css`、`scripts/design-audit/`、95 个 HTML | 2026-11-06 |
| [L-20261106-31](L-20261106-31-js-runtime-inline-styles-bypass-tokens.md) | JS 运行时直接写内联样式绕过设计 token（画布白方块；token 审计曾漏扫 JS） | mitigated（class/token 化 + v1.1 JS 扫描落地；审计 JS 裸色 0） | P1 | `assets/js/mecollage-main.js`、`assets/css/components.css`、`scripts/design-audit/run-token-audit.mjs` | 2026-11-06 |
| [L-20261106-32](L-20261106-32-alert-feedback-and-dead-toast.md) | alert 阻塞反馈 + toast 样式死代码：反馈不可翻译/不可撤销/无重试 | mitigated（15→0 + toast 接线；check-layout D PASS、functional 51/0/2） | P1 | `assets/js/mecollage-main.js`、`assets/js/ui.js`、`assets/pages-C2UaL6ML.css`、`scripts/design-audit/check-layout.mjs` | 2026-11-06 |
| [L-20261106-33](L-20261106-33-seo-first-layout-hides-primary-action.md) | SEO 内容优先的 DOM 顺序把主操作推到首屏外（移动端上传区 y=1148/1193px） | mitigated（R1 落地：上传区 1148→109 / 1193→259–434px；桌面不变） | P1 | `assets/css/components.css` §17、`assets/js/ui.js`、`docs/design/INTERACTION-AUDIT.md` | 2026-11-06 |
| [L-20261106-34](L-20261106-34-mobile-overflow-breaks-fixed-wallpaper.md) | 移动端横向溢出破坏固定壁纸层与布局（390 下 7 页、320 下 30 页） | mitigated（check-layout --full 95 页 × 4 宽度 PASS 5/0/0） | P1 | `assets/css/components.css` §12、`scripts/design-audit/check-layout.mjs`、`audit/design-migration/MOBILE-OVERFLOW.md` | 2026-11-06 |
| [L-20261106-35](L-20261106-35-behavior-change-must-update-acceptance-assertions.md) | 改用户可见行为必须同步更新验收断言（harness 曾只读 alert dialog） | mitigated（IDX-19/21/22 改 dialog+toast 兼容口径；functional 51/0/2） | P2 | `scripts/functional-audit/run-tests.mjs`、`assets/js/mecollage-main.js`、ADR-0007 | 2026-11-06 |
| [L-20261106-36](L-20261106-36-html2canvas-foreignobject-scroll-blank-export.md) | html2canvas foreignObject 按页面滚动偏移克隆，自动滚动后导出全白（hash d2b3285） | mitigated（options 加 scrollX/scrollY:0；IDX-14/15/16 PASS、导出产物非白） | P0 | `assets/js/mecollage-main.js`、`scripts/functional-audit/run-tests.mjs`、`audit/design-migration/r0/README.md` | 2026-11-06 |
| [L-20261106-37](L-20261106-37-headless-fps-not-gpu-proof.md) | headless FPS 不能证明 GPU/blur 性能（A/B 缩减 blur 实测无差异） | mitigated（改性能预算门禁 + bench 仅参考；真机 profiling 待 Preview） | P2 | `scripts/design-audit/check-performance.mjs`、`performance-budget.json`、`docs/design/DESIGN-TOKENS.md` §4.10 | 2026-11-06 |
| [L-20261106-38](L-20261106-38-interaction-state-gate-gap.md) | 交互后才出现/打开态的风险漏过静态首屏门禁（导航面板 y=4524、底栏按钮 14–24px） | mitigated（CSS §15/§17 修复 + run-mobile-touch 6/0/0） | P1 | `scripts/functional-audit/run-mobile-touch.mjs`、`assets/css/components.css` §15/§17、`check-layout.mjs` | 2026-11-06 |
| [L-20261106-39](L-20261106-39-css-display-overrides-hidden.md) | author CSS 的 display 覆盖 `[hidden]` 属性（博客卡片过滤视觉不生效） | mitigated（components.css §20 兜底 + computed display 验收；inline 兜底待清） | P2 | `blog/index.html`、`assets/js/blog-search.js`、`assets/css/components.css` §20 | 2026-11-06 |
| [L-20261106-40](L-20261106-40-nav-role-conflation.md) | 导航角色混淆：全局 wayfinding 与工具切换不分层（工具 nav 含 Home/内容页带工具 nav/首页重复卡/全局 nav 放具体工具） | mitigated（Phase 1+2A：94 页角色迁移 + 54 页全局导航收口 + check-layout F 6/6 PASS；Phase 2B/Contact 待做） | P1 | `scripts/design-system/nav-role-separation.mjs`、`nav-global-cleanup.mjs`、`components.css §21`、`check-layout.mjs` F 项 | 2026-11-06 |
| [L-20261105-18](L-20261105-18-production-deploy-is-manual.md) | 生产部署不是 main push 自动上线；是手动 CLI/Dashboard，且 AI 执行需明确授权 | closed（Phase A 实测并已记录流程） | P2 | `docs/runbooks/preview-deploy.md`、`ADR-0001` | 2026-11-05 |
| [L-20261105-19](L-20261105-19-preview-export-shared-transform.md) | 预览与导出禁止各写一套几何公式 | closed（生产验证） | P0 | `public/tools/*/index.html`、`mecollage-main.js` | 2026-11-05 |
| [L-20261105-20](L-20261105-20-css-clamp-vs-js-sizing.md) | CSS max-height/min-height/box-sizing 会静默覆盖 JS 尺寸与比例 | closed（生产验证） | P0 | `index.html`、`mecollage-main.js` | 2026-11-05 |
| [L-20261105-21](L-20261105-21-claims-must-match-implementation.md) | 功能文案必须与实现逐条核对（HEIC/模板/JPG/unlimited/控件语义） | closed（生产验证） | P1 | `i18n/*.json`、`index.html`、工具页 FAQ | 2026-11-05 |
| [L-20261105-22](L-20261105-22-rerender-cleanup-and-history.md) | 重渲染必须清理容器；撤销必须在变更前快照 | closed（生产验证） | P1 | `mecollage-main.js` | 2026-11-05 |
| [L-20261105-15](L-20261105-15-agpl-and-missing-license.md) | AGPL-3.0 依赖 + 无 LICENSE/第三方声明 | open | P1 | `assets/js/mecollage-main.js:2236`、根目录许可证文件 | 2026-11-05 |

## 4. 新增流程（必须）

1. **查重**：先在全库搜 `grep -r '<关键词>' docs/lessons/`，确认不是已有条目的复发；复发则更新旧条目状态为 `regressed` + 变更记录。
2. **取证**：按 `GOVERNANCE.md` 证据标准收集（代码层/线上层/平台层、命令、时间、header、file:line）。
3. **编号**：`L-YYYYMMDD-NN`（日期取发现日，`NN` 从 `01` 递增；同一天不复用编号；编号一经分配永不复用/不删除）。
4. **写条目**：复制 [`TEMPLATE.md`](TEMPLATE.md)，至少包含：症状、影响、根因、规则（必须/禁止）、检测方法、反例、证据、状态、后续动作。
5. **更新索引**：把条目加进 §3 表格（同一次提交/变更内）。
6. **进验收**：如果条目对应的问题本轮要修，检测命令必须进入本轮 Preview/生产验收清单。
7. **复核节奏**：每次生产发布前扫一遍 `open`/`regressed` 条目；每月第一个工作周做一次全量复核（更新状态、补证据、标记过期）。

> 如果任务写范围不允许改 `docs/lessons/`，在交付说明中报告"发现新教训 L-待分配"，由 Lead/维护者分配编号并补录——**不能只口头说**。

## 5. 写作要求（反空洞）

- 每条规则必须能被执行或检查：写清命令、阈值、期望输出；不写"要重视质量"。
- 只写**本项目真实发生过**的事；引用外部事实必须给一手来源与抓取日期。
- 标注证据层与不确定项；推断写成"推断（依据/验证方式）"。
- 反例优先引用真实文件/行号/提交号，不用虚构案例。
- 一条教训只解决一类问题；如果检测方法/规则完全不同，拆成两条。

## 6. 关联文档

- 治理总则：[`GOVERNANCE.md`](../../GOVERNANCE.md)
- 决策记录：`docs/decisions/`（如 [ADR-0001](../decisions/ADR-0001-phase-a-security-hardening.md)）
- 操作手册：`docs/runbooks/`
- 审计报告：`audit/AUDIT-REPORT.md`（**本机审计产物，可能未入库**；若不存在，以本教训库 + 证据路径为准）
