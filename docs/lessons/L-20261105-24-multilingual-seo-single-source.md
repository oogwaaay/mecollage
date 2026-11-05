# L-20261105-24 — sitemap / hreflang / 语言切换 / 内链必须由同一「页面 × 语言」映射生成

| 字段 | 值 |
|---|---|
| ID | L-20261105-24 |
| 日期 | 2026-11-05 |
| 状态 | closed（Phase B 修复；SEO harness 20/0/0，BFS 94/94；生产验收 41/0/2） |
| 严重度 | P0 |
| 证据层 | 代码层 + 静态链接图 + 浏览器 |
| 关联文件 | `sitemap.xml`、68 个本地化 HTML、`assets/js/i18n.js`（语言切换）、`robots.txt` |
| 发现来源 | 审计 P0-2；L-09；`audit/evidence/seo/` |

## 症状

- sitemap 仅 26 条英文 URL；68 个本地化页 0 条 `<loc>`；
- 52 个本地化页零入链；语言切换器是 `<button>` 不改 URL；
- 本地化页锚文本是本地语言但 `href` 指向英文页；
- sitemap/hreflang/内链/切换器四套体系互相矛盾。

## 根因

多语言停留在“运行时翻译”+ 单点手工维护；迁移子目录静态页时只生成了 HTML 与 hreflang，没有同步 sitemap、切换器链接、内链与入口图。

## 规则（必须）

1. 维护一份「base 页面 × 语言 → URL」映射；sitemap、canonical、hreflang、语言切换器、语言 nav 全部由它生成/校验。
2. 语言切换必须是真实 `<a href hreflang>`；JS 只做菜单增强，不得作为唯一入口。
3. 每页 hreflang 集合 = 该页语言簇（en/zh-CN/zh-TW/ja/es）+ x-default（英文 URL）；canonical 自引用且唯一。
4. sitemap 只放 `200 + canonical` 的可索引 URL；`?lang=` 重定向不应被 robots 屏蔽（否则 Google 无法跟随到干净 URL）。
5. 验收必须包含 BFS（从 `/` 只沿 `<a href>` 可达全部可索引页）与 hreflang 互指检查。

## 检测方法

```bash
node scripts/seo-audit/run-seo-checks.mjs --label final
# C1-C5 sitemap；D1-D4 canonical/hreflang；E1-E4 BFS/入链/同语言比例
```

## 反例 / 正确做法

- 反例：只加 68 条 sitemap，不改切换器/内链 → 提交一堆不可达页。
- 正确：先建映射；语言切换锚点 + 本地化内链 + 94 URL sitemap + 统一 hreflang 同一变更完成；BFS/hreflang 验收通过。

## 证据

- `sitemap.xml` 94 URL；`audit/evidence/phase-b/seo-report-final.{json,md}` C/D/E 全 PASS；
- E4 同语言内容内链 0.938（排除 376 个语言切换链接，阈值 0.8）。

## 后续动作

- [x] 68 本地化页全部进 sitemap 并有语言入口；BFS 94/94。
- [ ] 内容质量/低价值页的 noindex/合并决策后，映射与 sitemap 同步更新。
