# scripts/seo-audit/ — 多语言 / SEO 浏览器验收 harness

> 零依赖：Node 24 内置 `fetch` / `WebSocket` + Chrome headless（CDP）+ 本地 Vercel 模拟服务器。
> Phase B 建立；Phase C（内容质量）更新了期望值与新增检查，用于 `phase-c/content-quality` 验收。
> 只读被测站点：不修改站点文件、不做 git 写操作、不部署；不为变绿放宽断言。

## 1. 快速开始

在仓库根目录：

```bash
# Phase C 最终验收（证据写入 audit/evidence/phase-c/，不覆盖 Phase B）
node scripts/seo-audit/run-seo-checks.mjs --label phase-c-final --evidence-dir audit/evidence/phase-c

# Phase B 历史证据复现（默认证据目录 audit/evidence/phase-b）
node scripts/seo-audit/run-seo-checks.mjs --label final
```

可选参数：`--evidence-dir <dir>`（默认 `audit/evidence/phase-b`）、`--json <path>`、`--md <path>`。
退出码：`0` = 无 FAIL（允许 WARN）；`1` = 存在 FAIL；`2` = 环境/运行错误。运行 ~17s，结束自动关闭 Chrome 并清理临时 profile。

## 2. 文件

| 文件 | 作用 |
|---|---|
| `run-seo-checks.mjs` | 检查矩阵 A–G + 报告生成（唯一入口，v1.2.0） |
| `server.mjs` | Vercel 路由模拟服务器：cleanUrls、trailingSlash、`/tools/*` rewrite、404.html、**从 vercel.json 读取精确路径 301/308 重定向**（Phase C：square/vertical → 新目标）；另修复了 404 响应头顺序与 `文件+尾斜杠` cleanUrl 映射两个 bug |

CDP 客户端复用 `scripts/functional-audit/cdp.mjs`（headless 启动/WebSocket/eval/截图/错误收集）。

## 3. 检查矩阵（A–G）

| 组 | 检查 | 判定/期望 |
|---|---|---|
| **A1** | 渲染后 `<html lang>` 与目录语言一致 | 25 个渲染页（5 首页 + 4 工具页 ×5 语言） |
| **A2** | 可见正文语言与英文对应页差异 | 相似度 <0.3 或 zh/tw CJK≥0.2、ja 假名+CJK≥0.15、es 西语词≥0.1；英文页无显著 CJK/西语 |
| **A3** | title/description 渲染后与静态 HTML 一致 | 防 i18n.js 运行时覆盖（25 页） |
| **B1** | 语言切换器 | 25 页：`a.lang-option`=5、href 非 `#`、hreflang 正确、指向语言簇 URL、本地化页含 en+4 语言 |
| **B2** | 切换器目标可达 | 全部目标本地 GET 200（重定向视为失败） |
| **C1** | sitemap 集合 | **Phase C：60 URL**（45 核心 5 语言 + 9 blog + 6 保留英文专题）；去重数=60 且与期望集合完全一致 |
| **C2** | sitemap 可达 | 每个 loc 本地 200 且非 3xx |
| **C3** | 本地化 URL | 36 个本地化核心页（index/about/contact/privacy/terms + 4 tools ×4 语言）全部在 sitemap；无计划外本地化 URL |
| **C4** | sitemap hreflang | 每个 loc 的 alternates 与页面 `<head>` hreflang 完全一致 |
| **C5** | hreflang 互指 | 每个 alternate 目标回指本页、x-default 指向英文、语言码合法 |
| **C6** | sitemap 洁净度 | 不含 32 个 noindex 页、不含 301 旧 URL |
| **D1** | canonical | 60 个可索引页自引用（`https://www.mecollage.top` + 本页 URL）且本地 200 |
| **D2** | hreflang 语言簇 | 可索引语言簇（核心页 5 语言 + x-default；英文 blog/保留专题仅 en + x-default）；noindex/301 不参与；无缺/无多/无重复/目标可索引且 200 |
| **D3** | 静态 `<html lang>` | 全部非 404 页面与目录语言一致（不允许 `x-default`） |
| **D4** | canonical 唯一 | 可索引页无共用 canonical |
| **E1** | BFS | 从 `/` 沿 `<a href>` 可达全部 60 个可索引页（严格判定，WARN） |
| **E2** | 最低入链 | 36 个本地化可索引页各 ≥1 站内入链（FAIL 级） |
| **E3** | 内容型入链 | 排除语言切换链接后仍 ≥1 内容入链（辅助，WARN） |
| **E4** | 同语言内链 | 36 个本地化可索引页内容内链同语言平均比例 ≥0.8（WARN；排除 `lang-option`/`language-link`/`data-language-nav`/跨语言同页语义链接） |
| **E5** | 301 旧链接 | 站内无 `<a href>` 指向 `/square-collage/`、`/vertical-collage/` |
| **F1** | robots.txt | 本地 200；无 `Disallow: /*?lang=`；有 `Sitemap:` 行且 URL 本地 200 |
| **G1** | noindex | **32 个本地化专题页**（8 专题 ×4 语言）均有 `noindex, follow`、无 hreflang、无 JSON-LD、本地 200；noindex 集合与期望一致（无缺失/无计划外） |
| **G2** | 301 | `/square-collage[/]` → `/tools/square/`、`/vertical-collage[/]` → `/instagram-story-collage/`，状态 301/308、目标 200 |
| **G3** | JSON-LD | 60 个可索引页：JSON 可解析、每个 block 有 `@graph`、类型符合（home：WebSite+SoftwareApplication；tools：SoftwareApplication+FAQPage；blog：Article+BreadcrumbList；其他：WebPage+BreadcrumbList） |
| **G4** | blog 扩写 | 3 篇（custom-grid-layout-feature / ai-powered-enhancements / how-to-make-photo-collage）：正文 ≥700 词、description ≤160、Article JSON-LD、blog 首页卡片标题/摘要同步（标题相似度 1.0、摘要 Jaccard ≥0.3） |
| **G5** | description | 全部非 404 页面 description 存在且 ≤160 字符 |
| **G6** | 首页 H1 | `/`、`/zh/`、`/es/`、`/ja/`、`/tw/` 单一 H1，且本地化首页 H1 为本地语言（≠ 英文 H1） |

证据：渲染页截图（`shots/rendered-*.png`）+ 完整渲染 HTML（`html/rendered-*.html`）；JSON 每条断言含 `actual` 实测值；报告记录 git HEAD + dirty 路径/内容 digest。

## 4. 验收结果

### 4.1 Phase C 当前结果（`--label phase-c-final --evidence-dir audit/evidence/phase-c`）

快照：branch `phase-c/content-quality`，HEAD `db4c2f1`（站点改动已提交），dirty 2 = 本 harness 的 `run-seo-checks.mjs`/`server.mjs` 更新。
结果：**PASS 27 / FAIL 1 / WARN 0（共 28 用例）**，退出码 1。

| 状态 | 用例 | 实测 |
|---|---|---|
| ❌ FAIL | **G3 JSON-LD** | **5 页缺少 `FAQPage`**：`/tools/blurredframe/`、`/zh/tools/blurredframe/`、`/tw/tools/blurredframe/`、`/ja/tools/blurredframe/`、`/es/tools/blurredframe/`（页面有 FAQ 内容，但 JSON-LD `@graph` 只有 WebPage/SoftwareApplication/BreadcrumbList）——站点实现问题，已报告 Lead，等待修复后复跑 |
| ✅ PASS | E4 同语言内链 | 平均 **0.881**（≥0.8；排除 386 个语言切换链接） |
| ✅ PASS | G4 blog | 3 篇词数 926/860/943；description 145/144/142；Article JSON-LD 均在；卡片标题相似度 1.0 / 摘要 Jaccard 0.31/0.556/0.955 |
| ✅ PASS | 其余 | ENV、A1–A3、B1–B2、C1–C6、D1–D4、E1–E3/E5、F1、G1/G2/G5/G6 全部 PASS |

### 4.2 Phase B 历史结果（保留，未被覆盖）

`audit/evidence/phase-b/`：Phase B 验收 **PASS 20 / FAIL 0 / WARN 0**（94 页 sitemap 时代）；证据保持原样。

> Phase C 目标：修复 G3 的 5 页 FAQPage 后复跑应达到 **28 PASS / 0 FAIL / 0 WARN**。不要通过放宽断言变绿。

## 5. 已知限制

- 可见正文语言为启发式判定；局部未翻译段落不单独判 FAIL（内容质量定性由人工判断）。
- 真实渲染只覆盖任务列出的 25 页；其余为静态 HTML 检查（canonical/hreflang/lang/sitemap/JSON-LD/description/链接图）。
- blog 字数为“去 script/style/标签后的静态可见文本”的拉丁词数统计，与人工字数可能有 ±数词差异。
- 本地服务器模拟 Vercel 路由 + vercel.json 精确路径 301/308；与线上 Cloudflare 边缘行为可能有差异，本阶段不部署。
- 不检查线上响应头/AdSense/GA、翻译质量/薄内容定性、关键词蚕食、富结果资格。

## 6. 维护记录

- **2026-11-05 v1.0.0（Phase B-2）**：首版 A–F（94 页 sitemap 时代）。
- **2026-11-05 v1.0.1**：E4 排除语言切换链接；报告增加内容级 digest；Phase B 最终 20 PASS / 0 FAIL / 0 WARN。
- **2026-11-06 v1.2.0（Phase C）**：期望值更新为 60 可索引页 / 32 本地化专题 noindex / 2 个 301 旧页；新增 C6、E5、G1–G6（noindex、301、JSON-LD、blog 扩写、全站 description、本地化首页 H1）；支持 `--evidence-dir`；本地服务器实现 vercel.json 精确路径重定向。首次 Phase C 验收 27 PASS / **1 FAIL（blurredframe 缺 FAQPage，站点问题）** / 0 WARN。
