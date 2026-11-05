# ADR-0003 — Phase B：多语言运行时修复与 SEO 结构收敛

| 字段 | 值 |
|---|---|
| 状态 | **Proposed**（分支实现完成；本地 SEO 验收 20/0/0、功能回归 52/0/1；**Preview 部署层验收 38/0/5 PASS**（deployment `7577633151` / head `6699dd8`）；生产未部署，待维护者批准） |
| 日期 | 2026-11-05 |
| 决策者 | 维护者（生产批准）+ 实施者（Lead/AI） |
| 关联 | [ADR-0001](ADR-0001-phase-a-security-hardening.md)、[ADR-0002](ADR-0002-functional-integrity-fixes.md)、`audit/sections/seo.md` §3.2/§5、L-01、L-09、L-23~25 |

## 背景

审计确认多语言投入几乎无效：36 个本地化页加载 i18n.js 后渲染成英文（4 个语言首页与英文正文相似度 1.0000）；68 个本地化页不在 sitemap、52 页零入链；语言切换器是 `<button>` 不改 URL；title/description 被运行时覆盖；`sitemap/hreflang/内链/切换器` 四套体系互不一致。Phase B 目标不是新增内容，而是让既有 68 页“可被正确渲染、可被发现、可被索引”。

## 决策

### D1. 语言由 URL 路径决定；静态本地化页禁止运行时覆盖

- `assets/js/i18n.js` 从 `location.pathname` 推导语言：`/zh/`→zh、`/tw/`→zh-tw、`/ja/`→ja、`/es/`→es；根路径默认 en。
- **移除**运行时 `applyTranslation()`：不再改写 DOM 文本、`<title>`、`meta[data-i18n-content]`、`documentElement.lang`。
- 本地化页的正文/title/description 由静态 HTML 直接输出；i18n.js 仅保留 `t()` 供工具页动态文案（滑块单位、下载文件名）使用。
- 理由：Googlebot 与新用户看到的是静态 HTML + 正确语言，不再被 JS 翻成英文。

### D2. 语言切换必须是真实链接；每个可索引页有语言入口

- 54 个带切换器的页面：`<button class="lang-option">` → `<a class="lang-option" href hreflang>`。
- 其余 40 个页面（本地化专题页/根专题页）补 `.language-links` 语言 nav（5 个真实链接）。
- 目标页规则：同 base 页面存在对应语言版本 → 指向该版本；不存在（如 blog 无本地化版）→ 指向该语言首页。
- 理由：可抓取、可分享、可被 hreflang/内链加权；JS 只负责菜单开合，不再承担跳转。

### D3. sitemap / canonical / hreflang 由同一“页面 × 语言”映射生成

- 可索引页 = 94（17 个 base 页面 ×5 语言 + 9 篇英文 blog）；`sitemap.xml` 输出 94 条 `<loc>`，每条带该语言簇的 hreflang alternates + x-default（英文）。
- 所有页 canonical 自引用；hreflang 集合统一为 en / zh-CN / zh-TW / ja / es / x-default（blog 仅 en + x-default）。
- `robots.txt` 移除 `Disallow: /*?lang=`（Phase A 已把 `?lang=` 改为 308 单跳到干净 URL；继续屏蔽会阻止 Google 跟随重定向）。
- 理由：sitemap/hreflang/内链/切换器必须同源，避免四套体系互相矛盾。

### D4. 本地化页内链同语言化；内容质量决策后置

- 本地化页中指向根英文页的 `<a>`（348 处）在对应语言页存在时改写为同语言 URL；本地化页 CTA 的 `/` 改为该语言首页。
- **本轮决定**：68 个本地化页全部保留索引（不 noindex）。它们是 17 个 base 页的正式语言版本，且修复后已能正确渲染；先观察 GSC 收录与表现，再按内容质量做 noindex/重写决策（审计 §9.2 的低价值/薄内容清单仍未执行）。
- 不删除本地化专题页、不做语言页合并/重定向（涉及 H9 URL 结构，需单独 ADR + 维护者批准）。

### D5. 静态 meta 不得依赖运行时占位符

- 清理 `meta[data-i18n-content]`（100 个标签）与 key 占位 `content`；description/keywords 直接输出真实文本。
- 修复 6 个 `html lang="x-default"` 非法值 → 正确语言（en）。
- 理由：i18n 不再覆盖 meta 后，占位符会直接暴露给 SERP/社交分享。

## 备选方案（未采纳）

| 方案 | 原因 |
|---|---|
| 保留运行时翻译，仅按路径初始化语言 | 仍会覆盖 title/meta，且本地化静态页存在两套内容来源，难以保证一致性 |
| 删除所有本地化静态页，统一 SPA 翻译 | 丢失 68 页可索引 URL，违背既有投入；且无构建/模板，回退成本高 |
| 68 个本地化页全部 noindex | 与“多语言投入有效化”目标冲突；先修复发现性，再用 GSC 数据决策 |
| 只改 sitemap，不改切换器/内链 | 会产生“提交但不可达”的页面，违反 BFS 验收目标 |

## 后果

- 正面：本地化页渲染语言正确；title/description 稳定；68 页可被发现/索引；语言切换可分享；sitemap/hreflang/内链一致；有可复跑 SEO harness。
- 负面/代价：i18n 运行时不再做“整页翻译”，仅动态 `t()`；本地化页依赖静态内容质量（薄内容问题仍在）；94 页索引面扩大，需要后续 GSC 观察与内容优化；根页语言导航以链接为主，无 JS 即时切换。
- 风险：真实搜索引擎收录/排名需数周观察；本地化翻译质量、thin content、蚕食仍需 Phase C/内容阶段处理。

## 验证

- Preview（deployment `7577633151` / head `6699dd8`）：`verify-site` **38 PASS / 0 FAIL / 5 WARN**（与 Phase A 部署面一致）；sitemap 94 loc、robots 无 `?lang=`、本地化 html lang/canonical 静态抽查通过；内部 docs/scripts 仍 404。
- 本地 SEO harness：`node scripts/seo-audit/run-seo-checks.mjs --label final`：**20 PASS / 0 FAIL / 0 WARN**（25 页真实渲染 + 94 页静态；A–F 六组）。
- `node scripts/functional-audit/run-tests.mjs`：**52 PASS / 0 FAIL / 1 WARN**（i18n.js 改动未破坏工具页动态文案/导出）。
- Preview/生产部署层仍用 `scripts/verify-site.mjs`（安全头/404/重定向不受本阶段影响，预期与 Phase A 一致 38/0/5 preview、41/0/2 prod）。
- 证据：`audit/evidence/phase-b/`（seo-report-final、截图、渲染快照、独立复核）、`audit/evidence/phase-b/codemod-log.txt`。

## 上线与回滚

- H1/H2：分支 → Preview → 维护者批准 → 生产（手动 CLI，L-18）。
- 回滚：`git revert` 对应提交；生产异常用 Dashboard 上一部署；SEO 改动不影响安全/404/重定向。
