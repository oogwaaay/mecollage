# L-20261106-26 — 薄内容止损（noindex/301）必须同一变更同步 sitemap、hreflang 与内链

| 字段 | 值 |
|---|---|
| ID | L-20261106-26 |
| 日期 | 2026-11-06 |
| 状态 | closed（Phase C；生产验收 41/0/2 + 冒烟 PASS） |
| 严重度 | P1 |
| 证据层 | 代码层 + 静态链接图 + 平台层 |
| 关联文件 | `sitemap.xml`、32 个本地化专题页、`vercel.json`、`docs/decisions/ADR-0004-content-quality-phase-c.md` |
| 发现来源 | Phase B 独立复核 §9.2 / §3.6；Phase C 实施 |

## 症状

- 32 个本地化专题页正文中位约 450 字符、模板化、0 独立价值，却仍在 sitemap 且参与 hreflang。
- 关键词蚕食页 `/square-collage/`、`/vertical-collage/` 与工具页/Instagram 页同需求竞争。
- 只给页面加 noindex 或只加 301 而不改 sitemap/hreflang/内链时，会留下“可索引声明与 noindex/redirect 矛盾”“内链继续指向 noindex 页”的混合状态。

## 根因

内容质量决策被当成“改单页”处理，没有把「页面状态（index/noindex/redirect）× sitemap × hreflang × 内链」当成同一张映射表；Phase B 为了观察 GSC 把 68 页全部保留索引，Phase C 止损时若只改 meta 会制造新的不一致。

## 规则（必须）

1. 任何 noindex/301 决策必须在同一变更内更新：sitemap、该页 hreflang、其他页指向它的 `<a href>`、语言 nav；不允许只加 meta。
2. noindex 页不得出现在 sitemap，也不得作为任何页面的 hreflang alternate；保留 canonical 自引用 + 可访问 URL 作为可逆止损。
3. 301 源页面不得在 sitemap；站内旧链接改为目标 URL；验收需覆盖带/不带尾斜杠变体与最终 200。
4. 止损后必须用独立脚本核对：sitemap 集合与可索引页一一对应、noindex 集合无 hreflang、旧链接为 0、重定向无循环。
5. 未来恢复索引（重写内容）时反向执行同一映射更新，不允许只删 noindex。

## 检测方法

```bash
node scripts/seo-audit/run-seo-checks.mjs --label phase-c-final --evidence-dir audit/evidence/phase-c
# C1-C6 sitemap 集合/alternates；D1-B 32 noindex；E5 旧链接；G JSON-LD
```

判定：sitemap 不等于可索引页集合、noindex 页有 hreflang、旧 square/vertical 内链 >0、重定向最终非 200/Circular 均算复发。

## 反例 / 正确做法

- 反例：只给 32 页加 noindex，sitemap 仍 94，root 专题 hreflang 仍指 noindex 本地化页。
- 正确：noindex + 移 sitemap + 删 hreflang + root 语言 nav 改指语言首页 + 旧内链改目标 + harness 集合断言；sitemap 94→60。

## 证据

- `audit/evidence/phase-c/seo-report.json`（28/0/0）；`audit/evidence/phase-c/preview.md`（38/0/5）。
- Preview：`/square-collage/` 308→200；32 页 noindex；sitemap 60。

## 后续动作

- [x] Phase C 完成映射同步与 harness 断言。
- [ ] 生产部署后复跑同一检测；若重写本地化页，反向恢复索引并更新映射。
