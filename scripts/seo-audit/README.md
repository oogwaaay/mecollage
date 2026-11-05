# scripts/seo-audit/ — Phase B-2 多语言 / SEO 浏览器验收 harness

> 零依赖：Node 24 内置 `fetch` / `WebSocket` + Chrome headless（CDP）+ 本地 Vercel 模拟静态服务器。
> 用途：Phase B（i18n / SEO 修复）的**可重复验收基线**，Lead 完成代码改动后复跑即可得到最终判定。
> 只读被测站点；不修改站点文件、不做 git 写操作、不部署。

## 1. 快速开始

在仓库根目录：

```bash
# 基线（当前工作区状态；记录 dirty 文件数 + digest）
node scripts/seo-audit/run-seo-checks.mjs --label baseline

# Lead 宣布“实现完成”后复跑（正式判定）
node scripts/seo-audit/run-seo-checks.mjs --label final
```

可选参数：`--json <path>`、`--md <path>`（默认写入 `audit/evidence/phase-b/seo-report.{json,md}`；带 `--label` 时另存
`seo-report-<label>.{json,md}` 快照）。

退出码：`0` = 无 FAIL（允许 WARN）；`1` = 存在 FAIL；`2` = 环境/运行错误（Chrome/fixtures/服务器等）。
运行时长约 16s（25 个页面真实渲染 + 94 页静态分析）。运行结束自动关闭 Chrome、删除临时 profile。

## 2. 文件

| 文件 | 作用 |
|---|---|
| `run-seo-checks.mjs` | 检查矩阵 A–F + 报告生成（本目录唯一入口） |
| `server.mjs` | 从 `scripts/functional-audit/server.mjs` 复制的 Vercel 路由模拟服务器，修了两处 SEO 验收必需的行为：① 404 分支先写 `content-length` 再 `writeHead`（原实现 `setHeader` after `writeHead` 会抛 `ERR_HTTP_HEADERS_SENT`，遇到任何 404 即崩溃）；② `cleanUrls + trailingSlash` 下 `/about/`、`/zh/wedding-collage-maker/` 这类「文件 + 尾斜杠」URL 正确映射到 `<path>.html`（原实现只处理目录 index.html，会把它们误判 404） |

CDP 客户端直接复用 `scripts/functional-audit/cdp.mjs`（headless 启动/WebSocket/eval/截图/错误收集）。

## 3. 检查矩阵（A–F）

| 组 | 检查 | 判定 |
|---|---|---|
| **A1** | 渲染后 `<html lang>` 与目录语言一致 | 25 个渲染页（5 首页 + 4 工具页 × 5 语言）；允许值：en / zh-CN / zh-TW / ja / es |
| **A2** | 可见正文语言与英文对应页差异 | 拉丁 token Jaccard 相似度 < 0.3 **或** 目标语言信号达标（zh/tw CJK 比例 ≥0.2；ja 假名+CJK ≥0.15；es 西语功能词比例 ≥0.1）；英文页要求无显著 CJK/假名/西语正文 |
| **A3** | title / description 渲染后与静态 HTML 一致 | 逐页比较（防 i18n.js 运行时覆盖）；25 页面 |
| **B1** | 语言切换器结构 | 25 页：`a.lang-option` 数量=5、`href` 非 `#`、`hreflang` 正确、href 指向对应语言簇 URL、本地化页包含 en+4 语言、无重复 |
| **B2** | 语言切换目标可达 | 所有语言链接目标本地 GET 200（`redirect:'manual'`，308 视为失败） |
| **C1** | sitemap loc | `loc` 去重数 = 94，且与页面清单完全一致（无缺漏/无多余） |
| **C2** | sitemap 可达性 | 每个 loc 本地 200 且非 3xx（无 404/重定向 URL） |
| **C3** | 本地化 URL | 68 个本地化页面全部出现在 sitemap |
| **C4** | sitemap hreflang | 每个 URL 的 `xhtml:link alternate` 集合与页面 `<head>` hreflang 完全一致（全量 94） |
| **C5** | hreflang 互指 | 每个 alternate 目标回指本页；x-default 指向英文版本；非法语言码报错 |
| **D1** | canonical | 全量 94 页自引用（`https://www.mecollage.top` + 本页 URL）且目标本地 200 |
| **D2** | hreflang 语言簇 | 每页集合 = 该页存在的语言簇（en / zh-CN / zh-TW / ja / es + x-default）；无缺/无多/无重复/无失效目标 |
| **D3** | 静态 `<html lang>` | 全量 94 页与目录语言一致（不允许 `x-default` 等非法值） |
| **D4** | canonical 唯一 | 无两页共用同一 canonical |
| **E1** | BFS 严格可达 | 从 `/` 沿 `<a href>` 站内链接 BFS，能否到达全部 94 页（严格判定，报告用；WARN 级） |
| **E2** | 最低入链要求 | 每个本地化页 ≥1 站内入链（含语言切换器链接；FAIL 级 = 任务最低验收） |
| **E3** | 内容型入链 | 排除 `a.lang-option` 后每个本地化页仍有 ≥1 内容入链（辅助，WARN） |
| **E4** | 同语言内链比例 | 本地化页**内容内链**指向同语言的平均比例 ≥0.8（Phase B 背景目标，WARN）。语言切换链接（`a.lang-option`、`a.language-link`、`[data-language-nav]`、指向同页其他语言版本的语义兜底）不计入内容边 |
| **F1** | robots.txt | 本地 200；无 `Disallow: /*?lang=`；存在 `Sitemap:` 行且其 URL 本地 200 |

**证据**：失败渲染页自动截图（`shots/rendered-<slug>.png`）并保存完整渲染 DOM（`html/rendered-<slug>.html`）；
JSON 中每条断言含 `actual` 实测值；静态类失败在 `measurements` 中逐页列出实际值。
报告同时记录被测快照：`git HEAD`、`branch`、dirty 文件数、dirty digest（工作区可能正被 Lead 修改）。

## 4. 验收结果

### 4.1 最终验收（`--label final`，Phase B 实现完成后）

快照：branch `phase-b/i18n-seo`，HEAD `84fbd41`，dirty 99 个文件（路径 digest `2250d77388b3`，内容 digest 见报告头部）。
结果：**PASS 20 / FAIL 0 / WARN 0（共 20 个用例），退出码 0** —— 全部断言通过。

- A1/A2/A3：25 个渲染页面 html lang / 可见正文语言 / title+description 静态一致性全部 PASS（zh/es/ja/tw 与英文对应页相似度 0.11–0.19，CJK/假名/西语信号达标）；
- B1/B2：25 页语言切换器结构正确且全部目标本地 200；
- C1–C5：sitemap 94 个 loc 唯一、全部本地 200、68 个本地化 URL 齐全、alternates 与 head 一致且互指；
- D1–D4：94 页 canonical 自引用且唯一、hreflang 语言簇完整、静态 html lang 合法（无 `x-default`）；
- E1–E3：BFS 从 `/` 可达全部 94 页，每个本地化页 ≥1 入链（含/不含语言切换器两种口径均 PASS）；
- **E4：内容内链同语言平均比例 0.938（目标 ≥0.8）PASS**；共排除 376 个语言切换链接（`lang-option`/`language-link`/`data-language-nav`/跨语言同页语义边），阈值未降低；
- F1：robots.txt 无 `?lang=` Disallow，Sitemap 行存在且本地 200。

证据：`audit/evidence/phase-b/seo-report-final.{json,md}`（同时更新 `seo-report.{json,md}`）；25 张渲染截图 + 25 份渲染 HTML 快照。

### 4.2 基线（`--label wip-baseline`，实现进行中的历史记录）

快照：branch `phase-b/i18n-seo`，HEAD `84fbd41`，**dirty 99 个文件**（Lead 改动进行中）。
结果：**PASS 16 / FAIL 3 / WARN 1（共 20 个用例）**，退出码 1。

| FAIL/WARN | 实测 |
|---|---|
| ❌ A1 渲染后 html lang | 22/25 通过；未通过的 3 个英文工具页 `/tools/squarecrop/`、`/tools/roundedcorners/`、`/tools/blurredframe/` 渲染后仍是 `x-default` |
| ❌ A3 title/description 不被覆盖 | 23/25；`/tools/squarecrop/` 与 `/tools/blurredframe/` 静态 description 是 i18n key 占位（`tool.square_crop.meta.description`），运行时被 i18n.js 覆盖成真实文案 → 违反「静态 HTML 即最终 meta、JS 不再覆盖」目标 |
| ❌ D3 静态 html lang | 88/94；`/about/`、`/blog/`、`/contact/`、`/tools/squarecrop/`、`/tools/roundedcorners/`、`/tools/blurredframe/` 仍为 `x-default` |
| ⚠️ E4 同语言内链比例 | 平均 **0.561**（目标 ≥0.8）：本地化专题页内容内链多数仍指向英文页（5 条内容内链中仅 1 条同语言）→ 最终实现修复后 0.938 PASS（见 §4.1） |

已 PASS（当前 WIP 已达到）：A2 渲染正文语言、B1/B2 语言切换器结构与可达性、C1–C5 sitemap（94 loc/200/hreflang 一致互指）、D1/D2/D4 canonical 与 hreflang、E1–E3 BFS 可达/本地化入链、F1 robots 无 `?lang=` Disallow。

> 复跑：Lead 宣布实现完成后执行 `node scripts/seo-audit/run-seo-checks.mjs --label final`；目标为 **0 FAIL**（E4 为 WARN，可接受但建议确认同语言内链目标）。不要为了变绿放宽断言。

## 5. 已知限制

- 可见正文语言为启发式判定（相似度 / 字符-词占比）；**局部未翻译段落不单独判 FAIL**（属内容质量，不属于本验收矩阵）。
- 真实渲染只覆盖 25 个页面（任务列出的首页/本地化首页/工具页）；其余页面为静态 HTML 检查（canonical/hreflang/lang/sitemap 链接图）。
- 本地服务器模拟 Vercel 路由（cleanUrls/trailingSlash/tools rewrite/404），与线上 Cloudflare 边缘行为可能有差异；本阶段不部署、不上线验证。
- 工作区可能正被 Lead 修改：基线结论以报告头部记录的 dirty digest 为准；代码改动完成后应以 `--label final` 复跑结果作为验收结论。
- 不检查线上响应头/AdSense/GA、翻译质量、薄内容/关键词蚕食/结构化数据（属其他阶段范围）。

## 6. 维护记录

- **2026-11-05 v1.0.0（Phase B-2）**：首版 harness：A–F 六组检查（20 个用例）、本地 Vercel 模拟服务器（含两处修复）、25 页真实渲染 + 94 页静态分析、失败截图/HTML 快照、JSON/Markdown 报告。基线（WIP 工作区）PASS 16 / FAIL 3 / WARN 1。
- **2026-11-05 v1.0.1（Phase B-2 最终验收）**：E4 度量修正——语言导航 `<a class="language-link" data-language-nav="true">`（及 `a.lang-option`、跨语言同页链接）不再计入内容内链；报告新增工作区**内容级 digest**（`git diff` 哈希）以区分不同实现状态。最终验收 **20 PASS / 0 FAIL / 0 WARN（exit 0）**，E4 = 0.938。
