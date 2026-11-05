# ADR-0005: square / squarecrop 意图区隔与 /square-collage/ 恢复

- 状态：**Accepted**（2026-11-06 维护者要求上线并复查；生产部署验收 PASS：部署层 41/0/2）
- 日期：2026-11-06
- 分支：`fix/square-intent`
- 站点提交：`b5c238a`（harness v1.3.0 `ec9753e`）
- 生产部署：`mecollage-5wnar1xon…` → Aliased `https://www.mecollage.top/`（源 `fix/square-intent` @ `fb55584`）
- 关联：`audit/sections/seo.md` §6.2、用户 2026-11-06 的合并方案审计、Phase C / ADR-0004、L-21/L-26/L-28

## 背景

维护者提出以 `/tools/squarecrop/` 为主页、把 `/tools/square/` 及 4 个语言版 301 过去的方案，并要求：

- 保留 `/square-collage/` 为独立页（多图拼成方形拼图，不是单图变方形）；
- 先迁移功能、改内链，最后 301；
- 更新 sitemap、canonical/hreflang、24h 后验证。

## 审计发现（与方案不一致的事实）

1. **功能不对等（阻塞项）**：`/tools/square/` 有 blur / solid / resize / crop 四模式（1,729 行）；`/tools/squarecrop/` 只有 zoom/pan crop（1,173 行）。只加文字说明就 301，会让“想保留完整画面”的用户落到无法 fill 的页面，违反功能真实性。
2. **Phase C 冲突**：Phase C 已把 `/square-collage/` 301 到 `/tools/square/` 并从 sitemap 移除；若不先恢复，square→squarecrop 合并后会形成两跳链，并吞掉用户数据中 118 曝光/22.7 名的独立页。
3. **数据过期**：当前 sitemap 60 条（非 26），4 工具 ×5 语言均在 sitemap；lastmod 2026-11-05（非 2026-06-09）。
4. **已修项无需重做**：squarecrop 已是 `<html lang="en">`，head 已有 6 条 hreflang（en/zh-CN/zh-TW/ja/es/x-default）；不存在 `html lang="x-default"`。
5. 维护者 94/118 曝光、22.7/47.5 名是 GSC 账户数据，仓库侧无法复核；301 后权重转移需 2–4 周观察。

维护者 2026-11-06 明确选择：**A. 不合并，做意图区隔；恢复 /square-collage/ 独立页**。

## 决策

### D1 保留两个工具，按意图区隔（不做 301）

- `/tools/square/`：fill/blur/color/resize，定位“**不裁剪**把照片变方形”；Title “Square Image Converter: Add Blur or Color Background (No Crop)”；H1 “Square Image Converter: Fill, Blur or Resize Without Cropping”。
- `/tools/squarecrop/`：crop 1:1，定位“**裁剪**成方形”；Title “Square Crop: Crop Image to Square Online Free (1:1)”；H1 “Square Crop: Crop Any Photo to 1:1 Square Online”。
- 5 语言 title/H1/description/JSON-LD 同步；两页加 `.tool-intent-switch` 互链；工具导航保留两个入口。
- 不删除任何工具 URL；不加 square 的 301。

**理由**：两个工具功能不同、都有独立搜索意图；保留可避免功能丢失、避免 94 曝光先掉、避免误导 fill 用户。若未来仍要合并，必须先做功能移植与浏览器回归（见 ADR 备选）。

### D2 恢复 `/square-collage/` 独立页

- 删除 Phase C 的 2 条 301（`/square-collage/`、无斜杠）。
- 页面 200；Title “Square Collage Maker - Free 1:1 Photo Collage”；canonical 自引用；hreflang en + x-default（本地化版本仍 noindex，不加入 hreflang）；语言 nav 恢复指向本地化 square-collage。
- sitemap 新增 1 条（60→**61**）；首页 Square Collage 卡片内链恢复；加入 JSON-LD `WebPage`+`BreadcrumbList`。
- 本地化 square-collage 仍 noindex（Phase C 薄页止损），不恢复索引；本地化语言 nav 恢复可用。

### D3 sitemap / lastmod

- sitemap 61 URL；`/square-collage/` 加入；square/squarecrop 10 页 lastmod 改 **2026-11-06**。
- GSC 重新提交需维护者账户操作（AI 不碰 GSC），本 ADR 只保证线上 sitemap 正确。

### D4 301/308 与验证口径

- Vercel `permanent:true` 实际下发 **308**（Google 视同永久 301）；本阶段不再新增 301。
- 规范 URL 单跳；无斜杠变体经 Vercel `trailingSlash` 归一化为 2 跳（最终 200、无循环）。
- 24h/GSC 收录与排名变化由维护者观察；仓库侧只能验证 200/重定向/渲染/结构化数据。

## 验证

- 本地 SEO harness v1.3.0：**32 PASS / 0 FAIL / 0 WARN**（sitemap 61、intent 区隔 H1/H2/H3、square-collage 恢复、JSON-LD 61、32 noindex、vertical 301）。
- Preview（`mecollage-3ffd9d88g…`，head `ec9753e` / 站点 `b5c238a`）：`verify-site` **38 PASS / 0 FAIL / 5 WARN**；`/square-collage/` 200、`/square-collage` 308→200；两个工具 200；sitemap 61；H4 404。
- 生产验收（2026-11-06）：`verify-site` **41 PASS / 0 FAIL / 2 WARN**；`/square-collage/` **200（不再 301）**；`/square-collage` 308→带斜杠；`/tools/square/`、`/tools/squarecrop/` 均 200；`/vertical-collage/` 308→`/instagram-story-collage/`；sitemap 61；canonical 各自自引用（square-collage hreflang en+x-default，两工具 6 条 hreflang）；H4 404。

## 备选（未采用）

若维护者后续坚持合并：先把 blur/solid/resize 的功能、UI、FAQ、5 语言文案真正移植进 squarecrop，浏览器功能回归后，再评估 301；并先恢复 square-collage 独立页。仅内容合并+301 会使功能承诺与实现不符，不采用。

## 未做/后续

- 未改全站 header 导航（仍指向 `/tools/square/`；两个工具在工具页导航中都有入口）；如需 header 增加 Square Crop 入口，另行小改。
- GSC 重新提交、24h/2 周数据观察由维护者执行。
- 本地化 square-collage 仍 noindex（Phase C 决策），日后重写再恢复。

## 回滚

- 恢复 Phase C 状态：删除 square-collage 的 sitemap/JSON-LD，重新加 2 条 301；或 `git revert` 本分支。
- Vercel 上一生产部署 Promote/Rollback。
