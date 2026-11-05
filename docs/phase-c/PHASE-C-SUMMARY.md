# Phase C：内容质量整改摘要

> 日期：2026-11-05/06｜分支：`phase-c/content-quality`｜源提交：`8f13eaf`｜状态：**Preview 已验证，生产待批准**

## 做了什么

| 项 | 结果 |
|---|---|
| 薄本地化专题页 | 32 页（es/ja/tw/zh × 8 题材）**noindex,follow**；移出 sitemap；删除 hreflang；URL 保留可访问 |
| sitemap | **94 → 60 URL**（45 个 5 语言核心簇 + 6 个英文专题 + 9 篇博客） |
| 关键词蚕食 | `/square-collage/` → `/tools/square/`、`/vertical-collage/` → `/instagram-story-collage/`（308 永久）；旧内链 15 个文件已改；`/blog/how-to-make-photo-collage/` 改题不 301；`/free-collage-maker/` 重定位为对比页 |
| 薄博客 | custom-grid 877 词（原 171）、AI 812 词（原 277）、how-to 882 词（原 226）并改题；blog 首页卡片同步 |
| JSON-LD | **60 个可索引页**：首页 WebSite+SoftwareApplication、工具页 SoftwareApplication+FAQPage、博客 Article、其余 WebPage+BreadcrumbList |
| On-page | 全站 description ≤160；本地化首页单一本地语言 H1；删除 “templates” 虚假承诺 |
| 内链 | 6 个英文专题页语言 nav 改指语言首页；旧 square/vertical 链接清零 |

## 验证

- 本地 SEO harness：**28 PASS / 0 FAIL / 0 WARN**（`scripts/seo-audit/` v1.2.0）。
- Preview（head `8f13eaf`，deployment `mecollage-470l033ft…`）：`verify-site` **38 PASS / 0 FAIL / 5 WARN**；sitemap 60；重定向单跳 308→200（规范 URL）；32 页 noindex；JSON-LD 可解析；H4 内部文件 404。
- 独立复核：待 seo-audit 最终报告；本地预跑仅 blurredframe FAQPage 一项 FAIL，已修复后 harness 28/0/0。

## 仍需后续处理（不在本阶段阻塞）

1. `privacy/terms` 及本地化版仍提注册/账号/邮件订阅（P3，需法务/内容复核）。
2. 本地化首页仍有 28 条卡片指向 noindex 本地化专题页（UX 保留；重写后恢复索引）。
3. `christmas-collage-maker`（750 字符）、`wedding-collage-maker`（894）仍偏薄；`free-collage-maker` 可继续扩写。
4. sitemap lastmod 全为 2026-11-05；blog index 用 Article 类型（P3）。
5. 无斜杠 `/square-collage`、`/vertical-collage` 因 Vercel trailingSlash 为 2 跳（规范 URL 单跳；最终 200、无循环）。

## 回滚

- Vercel 上一生产部署 Promote/Rollback；或 `git revert` 后重新部署。
- 内容层可单独回滚：移除 32 页 noindex、恢复 sitemap/hreflang/旧内链、移除 2 条 301、恢复旧博客内容。
