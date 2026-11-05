# scripts/seo-audit/ — 多语言 / SEO 浏览器验收 harness

> 零依赖：Node 24 内置 `fetch` / `WebSocket` + Chrome headless（CDP）+ 本地 Vercel 模拟服务器。
> Phase B 建立；Phase C（内容质量）与 Phase D（工具意图区隔）更新了期望值；当前 v1.3.0。
> 只读被测站点：不修改站点文件、不做 git 写操作、不部署；不为变绿放宽断言。

## 1. 快速开始

在仓库根目录：

```bash
# Phase D 最终验收（证据写入 audit/evidence/phase-d/，不覆盖 Phase B/C）
node scripts/seo-audit/run-seo-checks.mjs --label phase-d-final --evidence-dir audit/evidence/phase-d

# Phase C 历史验收（默认 v1.3.0 期望为 Phase D 口径，Phase C 证据不重跑）
node scripts/seo-audit/run-seo-checks.mjs --label phase-c-final --evidence-dir audit/evidence/phase-c
```

可选参数：`--evidence-dir <dir>`（默认 `audit/evidence/phase-b`）、`--json <path>`、`--md <path>`。
退出码：`0` = 无 FAIL（允许 WARN）；`1` = 存在 FAIL；`2` = 环境/运行错误。运行 ~20s，结束自动关闭 Chrome 并清理临时 profile。

## 2. 文件

| 文件 | 作用 |
|---|---|
| `run-seo-checks.mjs` | 检查矩阵 A–H + 报告生成（唯一入口，v1.3.0） |
| `server.mjs` | Vercel 路由模拟：cleanUrls、trailingSlash（**先于 redirects 规范化**）、`/tools/*` rewrite、404.html、从 vercel.json 读取精确路径 301/308（Phase D：仅 vertical-collage 两条）；修复 404 响应头顺序与 `文件+尾斜杠` cleanUrl 映射两个 bug |

CDP 客户端复用 `scripts/functional-audit/cdp.mjs`（headless 启动/WebSocket/eval/截图/错误收集）。

## 3. 检查矩阵（A–H）

| 组 | 检查 | 判定/期望（Phase D） |
|---|---|---|
| **A1** | 渲染后 `<html lang>` 与目录语言一致 | 25 个渲染页（5 首页 + 4 工具页 ×5 语言） |
| **A2** | 可见正文语言与英文对应页差异 | 相似度 <0.3 或 zh/tw CJK≥0.2、ja 假名+CJK≥0.15、es 西语词≥0.1 |
| **A3** | title/description 渲染后与静态 HTML 一致 | 防 i18n.js 运行时覆盖（25 页） |
| **B1** | 语言切换器 | 25 页：`a.lang-option`=5、href 非 `#`、hreflang 正确、指向语言簇 URL、本地化页含 en+4 语言 |
| **B2** | 切换器目标可达 | 全部目标本地 GET 200（重定向视为失败） |
| **C1** | sitemap 集合 | **Phase D：61 URL**（45 核心 5 语言 + 9 blog + 7 保留英文专题，含恢复的 `/square-collage/`）；去重数=61 且集合完全一致 |
| **C2** | sitemap 可达 | 每个 loc 本地 200 且非 3xx |
| **C3** | 本地化 URL | 36 个本地化核心页全部在 sitemap；无计划外本地化 URL（32 个 noindex 本地化专题页不在） |
| **C4** | sitemap hreflang | 每个 loc 的 alternates 与页面 `<head>` hreflang 完全一致 |
| **C5** | hreflang 互指 | 每个 alternate 目标回指本页、x-default 指向英文、语言码合法 |
| **C6** | sitemap 洁净度 | 不含 32 个 noindex 页、不含 301 旧 URL（Phase D 仅 `/vertical-collage/`） |
| **C7** | sitemap lastmod | square/squarecrop 10 页 lastmod = **2026-11-06**（Phase D 更新） |
| **D1** | canonical | 61 个可索引页自引用（`https://www.mecollage.top` + 本页 URL）且本地 200 |
| **D2** | hreflang 语言簇 | 可索引语言簇（核心页 5 语言 + x-default；英文 blog/保留专题仅 en + x-default）；noindex/301 不参与；无缺/无多/无重复/目标可索引且 200 |
| **D3** | 静态 `<html lang>` | 全部非 404 页面与目录语言一致 |
| **D4** | canonical 唯一 | 可索引页无共用 canonical |
| **E1** | BFS | 从 `/` 沿 `<a href>` 可达全部 61 个可索引页（严格判定，WARN） |
| **E2** | 最低入链 | 36 个本地化可索引页各 ≥1 站内入链（FAIL 级） |
| **E3** | 内容型入链 | 排除语言切换链接后仍 ≥1 内容入链（辅助，WARN） |
| **E4** | 同语言内链 | 36 个本地化可索引页内容内链同语言平均比例 ≥0.8（WARN；排除语言切换链接） |
| **E5** | 301 旧链接 | 站内无 `<a href>` 指向 `/vertical-collage/`（Phase D square-collage 已恢复，不再视为旧 URL）；记录「可索引页 → noindex 页」内链；抽查 6 个 root 专题页语言导航 |
| **F1** | robots.txt | 本地 200；无 `Disallow: /*?lang=`；有 `Sitemap:` 行且 URL 本地 200 |
| **G1** | noindex | 32 个本地化专题页（8 专题 ×4 语言）均有 `noindex, follow`、无 hreflang、无 JSON-LD、本地 200；集合无缺失/无计划外 |
| **G2** | 301/308 | **Phase D 仅 vertical**：`/vertical-collage/` 规范 URL 单跳 308→200；无斜杠 2 跳（Vercel trailingSlash 先行，记录不判 FAIL）。`/square-collage/` 已 200（见 H2） |
| **G3** | JSON-LD | **61 个可索引页** JSON 可解析、每 block 有 `@graph`、类型符合；抽查 FAQPage/Article `@id` 绝对 URL、本地化首页 WebSite 无 `inLanguage` |
| **G4** | blog 扩写 | 3 篇 ≥700 词、description ≤160、Article JSON-LD、blog 首页卡片标题/摘要同步 |
| **G5** | description | 全部非 404 页面 description 存在且 ≤160 字符 |
| **G6** | 首页 H1 | `/`、`/zh/`、`/es/`、`/ja/`、`/tw/` 单一 H1，且本地化首页 H1 为本地语言 |
| **H1** | 工具意图区隔 | 5 语言 × square/squarecrop：title 不重复、H1 不重复；EN square 含 fill/blur/color/resize/no-crop 信号、squarecrop 含 crop 信号；10 页 `.tool-intent-switch` 互链指向对应语言另一个工具 |
| **H2** | square-collage 恢复 | `/square-collage/` 本地 200 且无重定向、可索引、在 sitemap 期望集合；canonical 自引用、hreflang 仅 en+x-default；JSON-LD WebPage+BreadcrumbList；语言 nav ≥5 链接；`/square-collage` 无斜杠 1 跳规范化后 200 |
| **H3** | 首页内链恢复 | 首页静态 HTML 含 `/square-collage/` 卡片链接；该页有 ≥1 站内入链 |

证据：渲染页截图（`shots/rendered-*.png`）+ 完整渲染 HTML（`html/rendered-*.html`）；JSON 每条断言含 `actual`；报告记录 git HEAD + dirty 路径/内容 digest。

## 4. 验收结果

### 4.1 Phase D 最终结果（`--label phase-d-final --evidence-dir audit/evidence/phase-d`）

快照：branch `fix/square-intent`，HEAD `b5c238a`，dirty 1 = 本 harness 的 `run-seo-checks.mjs` 更新。
结果：**PASS 32 / FAIL 0 / WARN 0（共 32 用例），退出码 0**。

| 验证点 | 实测 |
|---|---|
| 页面分类 | 非 404 = 94；可索引 **61**、noindex **32**、301 旧页 **1**（vertical） |
| sitemap | **61 loc 集合完全一致**；61 页全部本地 200；C7 square/squarecrop 10 页 lastmod 均 2026-11-06 |
| G2 重定向 | 仅 vertical：`/vertical-collage/` 1 跳 308→200；`/vertical-collage` 2 跳 308→308→200（记录，不判 FAIL） |
| H2 square-collage | `/square-collage/` 200 无重定向；`/square-collage` 1 跳 308→200；canonical 自引用；hreflang en+x-default；JSON-LD WebPage+BreadcrumbList；语言 nav 5 链接 |
| H1 工具区隔 | 5 语言 title/H1 均不重复；EN square title “Square Image Converter: Add Blur or Color Background (No Crop)” / H1 “Square Image Converter: Fill, Blur or Resize Without Cropping”；EN squarecrop title/H1 均含 crop/1:1；`.tool-intent-switch` 互链 10/10 |
| H3 首页内链 | 首页含 `/square-collage/` 卡片链接；该页站内入链 5 |
| JSON-LD | **61/61 合格**（square-collage = WebPage+BreadcrumbList）；FAQPage/Article `@id` 39/39 绝对 URL |
| E4 / E1 | 同语言内链平均 **0.881**；BFS 可索引 61 页全部可达 |
| 其余 | ENV、A1–A3、B1–B2、C1–C6、D1–D4、E1–E3/E5、F1、G1、G3–G6 全 PASS |

### 4.2 历史结果

- **Phase C（已上线生产）**：28 PASS / 0 FAIL / 0 WARN（sitemap 60、32 noindex、JSON-LD 60）。证据：`audit/evidence/phase-c/`。
- **Phase B（已上线生产）**：20 PASS / 0 FAIL / 0 WARN（94 页时代）。证据：`audit/evidence/phase-b/`。

> Phase D 目标：0 FAIL。目前达成（32/0/0）。若后续站点再变，复跑同一命令即可。

## 5. 已知限制

- 可见正文语言为启发式判定；局部未翻译段落不单独判 FAIL（内容质量定性由人工判断）。
- 真实渲染只覆盖任务列出的 25 页；其余为静态 HTML 检查（canonical/hreflang/lang/sitemap/JSON-LD/description/链接图/lastmod）。
- blog 字数为“去 script/style/标签后的静态可见文本”的拉丁词数统计，与人工字数可能有 ±数词差异。
- 本地服务器模拟 Vercel 路由 + vercel.json 精确路径 301/308；无斜杠旧 URL 的 2 跳与 Preview 实测一致；与线上 Cloudflare 边缘行为仍可能有差异，本阶段不部署。
- 不检查线上响应头/AdSense/GA、翻译质量/薄内容定性、关键词蚕食、富结果资格。

## 6. 维护记录

- **2026-11-05 v1.0.0（Phase B-2）**：首版 A–F（94 页 sitemap 时代）。
- **2026-11-05 v1.0.1**：E4 排除语言切换链接；报告增加内容级 digest；Phase B 最终 20/0/0。
- **2026-11-06 v1.2.0（Phase C）**：期望值 60 可索引页 / 32 noindex / 2 个 301 旧页；新增 C6、E5、G1–G6；支持 `--evidence-dir`；server 实现 vercel.json 精确路径重定向。首次 Phase C 验收 27 PASS / 1 FAIL（blurredframe 缺 FAQPage）。
- **2026-11-06 v1.2.1（Phase C 最终）**：server trailingSlash 先行；G2 跟随完整跳转链记录 hops；G3/E5 增加最终改动抽查。Phase C 28/0/0。
- **2026-11-06 v1.3.0（Phase D）**：square-collage 恢复为独立索引页（sitemap 61 / indexable 61 / redirected 1）；移除 square 301，仅保留 vertical 两条；新增 C7（square/squarecrop lastmod）与 H1–H3（工具意图区隔/互链、square-collage 恢复、首页内链）。Phase D 最终 **32 PASS / 0 FAIL / 0 WARN（exit 0）**。
