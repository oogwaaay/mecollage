# ADR-0004: 内容质量整改（Phase C）— 薄页止损、蚕食合并、博客扩写与结构化数据

- 状态：**Proposed**（Preview 已验证；生产未部署，待维护者批准）
- 日期：2026-11-05/06
- 分支：`phase-c/content-quality`
- 源提交：`8f13eaf`（基于 `main` `65199c7`）
- 关联：`audit/AUDIT-REPORT.md` §3.6、`audit/sections/seo.md` §6.2/§9.2、ADR-0003、L-02/L-21/L-26/L-27

## 背景

Phase B 修复了多语言/SEO 结构，但审计划出的内容质量项仍未处理：

- 32 个本地化专题页（es/ja/tw/zh × 8 题材）正文中位约 450 字符（141–724），模板化、无独立价值；Phase B 为观察 GSC 先全部保留索引。
- 4 组关键词蚕食：`/square-collage/` vs `/tools/square/`；`/how-to-make-a-collage/` vs 博客同题；`/vertical-collage/` vs `/instagram-story-collage/`；`/free-collage-maker/` 与首页抢主词。
- 3 篇博客 171/226/277 词，内容不足以支撑排名。
- 全站 JSON-LD 为 0；20 页 description >160；本地化首页仍有英文 H1；专题页存在“templates”等站内不存在的功能承诺。

维护者 2026-11-05 明确选择：**薄本地化页 noindex + 移出 sitemap/hreflang；蚕食页 301/合并；3 篇薄博客扩写**。

## 决策

### D1 32 个本地化专题页止损（noindex + 移出 sitemap/hreflang）

- 页面保留可访问（`200`）与 UX，但加 `<meta name="robots" content="noindex, follow">`，删除 `<link rel="alternate" hreflang>`，从 sitemap 删除。
- 对应 6 个英文专题页（birthday/christmas/free/how-to/instagram-story/wedding）保留索引；hreflang 仅 `en` + `x-default`。
- 英文专题页的 `.language-links` 改指向对应语言首页，避免把内链继续导向 noindex 页面。
- 后续若重写本地化内容，再逐页移除 noindex 并恢复 sitemap/hreflang；本 ADR 不删除 URL。

**理由**：32 页正文太薄、模板化、且无独立搜索需求；继续索引会稀释站点质量信号。noindex 是可逆止损，不阻塞未来重写。

### D2 蚕食页 301/合并

- `/square-collage/` 与 `/square-collage` → `/tools/square/`（308 permanent，Vercel `permanent:true`）。
- `/vertical-collage/` 与 `/vertical-collage` → `/instagram-story-collage/`。
- 两个源页面从 sitemap 移除；站内所有旧 `href` 改为目标 URL（15 个文件）。
- `/blog/how-to-make-photo-collage/` **不改 URL**，但改题为 “25 Creative Photo Collage Ideas for Gifts, Scrapbooks & Social Media”，与 `/how-to-make-a-collage/` 教程页区隔（不 301，保留已有外链/收录）。
- `/free-collage-maker/` 重定位为 “MeCollage vs Canva, Fotor & FotoJet” 对比页，title/H1/description 不再抢首页主词。

**理由**：301 是合并重复需求最直接的方式；保留教程专题页与博客各自的独立意图，避免误删内容。

### D3 3 篇薄博客扩写

- `blog/custom-grid-layout-feature/`：877 词（原 171）。
- `blog/ai-powered-enhancements/`：812 词（原 277）。
- `blog/how-to-make-photo-collage/`：882 词（原 226），改题后与教程页区隔。
- 同步 `blog/index.html` 卡片标题/摘要；新增 Article JSON-LD。

**理由**：这 3 页在 sitemap 中但内容不足；扩写比 noindex 更适合已有收录/外链的博客。

### D4 JSON-LD（60 个可索引页）

- 首页 ×5：`WebSite` + `WebPage` + `SoftwareApplication`。
- 工具页 ×20：`WebPage` + `SoftwareApplication` + `FAQPage`（FAQ 来自页面真实 Q/A；blurredframe 的 FAQ 是 button/div 结构，已兼容）+ `BreadcrumbList`。
- 博客 ×9：`WebPage` + `Article` + `BreadcrumbList`。
- 其余可索引页：`WebPage` + `BreadcrumbList`。
- `@id` 全部绝对 URL；不添加评分/评论/价格等页面不存在的数据（`offers.price=0` 是真实免费）。

**理由**：结构化数据应由真实页面内容生成；只覆盖可索引页，noindex/重定向页不加。

### D5 Meta/标题/描述与 H1 清理

- 全站 description ≤160 字符（含 20 个原超长页与博客）。
- 4 个本地化首页改为单一 H1，H1 文本本地化（`您的照片…` / `あなたの写真を…` / `Tus fotos…`），移除第二个 H1。
- 删除生日/圣诞专题的 “templates” 虚假承诺，改为 layouts/decorations。

## 未在本 ADR 范围

- `privacy.html`/`terms.html` 及本地化版仍提“注册账号/邮件订阅”等站内不存在功能（审计 P3；内容/法务复核后再改，避免误改法律文本）。
- 本地化首页仍有卡片指向 noindex 的本地化专题页（28 条，UX 保留；后续重写后恢复）。
- `christmas-collage-maker`（750 字符）、`wedding-collage-maker`（894）仍偏薄；`free-collage-maker` 已重定位但可继续扩写。
- sitemap `lastmod` 60/60 为 2026-11-05（本轮确有改动；后续建议按真实 mtime）。
- blog index 仍用 `Article` 类型（列表页更合适 `Blog`/`CollectionPage`，P3 非阻断）。
- 54 页残留失效 `data-i18n` 属性（无害）。

## 验证

- 本地 `node scripts/seo-audit/run-seo-checks.mjs --label phase-c-final --evidence-dir audit/evidence/phase-c`：**28 PASS / 0 FAIL / 0 WARN**（v1.2.0：sitemap=60、32 noindex、4 个重定向变体、60 页 JSON-LD、博客扩写、description≤160、H1、E4/E5）。
- Preview（`mecollage-470l033ft…`，head `8f13eaf`）：`verify-site` **38 PASS / 0 FAIL / 5 WARN**；sitemap 60；`/square-collage/`、`/vertical-collage/` 308→200 单跳；无斜杠变体因 Vercel `trailingSlash` 为 2 跳（最终 200、无循环）；32 页 noindex、JSON-LD、H4 404 均抽查通过。
- 独立复核（seo-audit）：待最终报告；预期 0 FAIL。

## 回滚

- 代码回滚：`git revert` 本分支提交后重新部署；内容页可保留。
- SEO 回滚：移除 32 页 noindex、恢复 sitemap/hreflang 与旧内链；移除 2 条 301；恢复旧博客内容（git revert）。
- 生产回滚：Vercel Dashboard 上一生产部署 Promote/Rollback。
