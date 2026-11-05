# Phase D：square 工具意图区隔 + square-collage 恢复摘要

> 日期：2026-11-06｜分支：`fix/square-intent`｜站点提交 `b5c238a`｜生产部署 `mecollage-5wnar1xon…`｜**已上线生产**（验收 41/0/2）

## 背景与审计结论

维护者原方案：`/tools/square/` 301 到 `/tools/squarecrop/`，保留 `/square-collage/` 独立。

审计后未直接执行，原因：

1. **功能不对等**：square 有 blur/solid/resize/crop 四模式；squarecrop 只有 crop。只加文字 301 会让 fill 用户落到做不到的页面。
2. **Phase C 冲突**：`/square-collage/` 已被 301 到 `/tools/square/`；不恢复会形成两跳链并吞掉独立页。
3. 维护者描述的 sitemap 26/lastmod 2026-06-09/squarecrop 无 hreflang 已过期；当前实际 60/2026-11-05/已有 6 hreflang。

维护者选择 **A：不合并，意图区隔；恢复 square-collage**。

## 做了什么

- `/tools/square/`：Title/H1/Description/JSON-LD 改为 **fill/blur/color/resize，不裁剪** 意图；5 语言同步。
- `/tools/squarecrop/`：Title/H1 改为 **crop 1:1** 意图；5 语言同步。
- 两页 `.tool-intent-switch` 互链（10/10）。
- 恢复 `/square-collage/`：删除 2 条 301；sitemap 60→61；hreflang en+x-default；JSON-LD；首页内链；语言 nav；Title “Square Collage Maker - Free 1:1 Photo Collage”。
- square/squarecrop 10 页 lastmod = 2026-11-06；无 square 301；vertical 301 保持。
- 未删除任何工具 URL；未改 Publisher ID/广告/GA4。

## 验证

- SEO harness v1.3.0：**32 PASS / 0 FAIL / 0 WARN**（sitemap 61、intent 区隔、square-collage 恢复、JSON-LD 61、32 noindex、vertical 301）。
- Preview（`mecollage-3ffd9d88g…`）：`verify-site` **38 PASS / 0 FAIL / 5 WARN**；`/square-collage/` 200、两个工具 200、sitemap 61、H4 404。
- 生产（`mecollage-5wnar1xon…`）：`verify-site` **41 PASS / 0 FAIL / 2 WARN**；跳转矩阵与 canonical 实测通过（见 `audit/evidence/phase-d/production.{md,json}`）。
- 未做 GSC 重新提交与排名观察（维护者账户操作）。

## 未做/后续

- 本地化 square-collage 仍 noindex（Phase C 薄页止损），待内容重写后恢复。
- 全站 header 仍指向 `/tools/square/`；工具页导航同时有 Square Crop 入口，若需 header 增加另行改。
- 若未来仍要合并两个工具，先移植 fill 功能并做浏览器回归，再评估 301。

## 回滚

Vercel 上一生产部署 Promote/Rollback；或 `git revert` 本分支（恢复 Phase C 的 square-collage 301/sitemap 状态）。
