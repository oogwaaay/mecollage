# L-20261106-28 — 工具页合并前必须验证功能对等；301 不能替代功能迁移

| 字段 | 值 |
|---|---|
| ID | L-20261106-28 |
| 日期 | 2026-11-06 |
| 状态 | closed（Phase D 选择意图区隔；生产验收 41/0/2） |
| 严重度 | P1 |
| 证据层 | 代码层 + 功能层 + 线上层 |
| 关联文件 | `public/tools/square/index.html`（1,729 行/4 模式）、`public/tools/squarecrop/index.html`（1,173 行/仅 crop）、ADR-0005 |
| 发现来源 | 维护者 square→squarecrop 合并方案审计；Phase D |

## 症状

- 维护者方案要求“把功能搬过去、改内链、最后 301”，但实际页面功能不对等：square 有 blur/solid/resize/crop 四模式，squarecrop 只有 crop（zoom/pan）。
- 若只加“想保留完整画面就用 fill”的文字，再把 square 301 到 squarecrop，用户会落到一个无法执行 fill 的页面；文案承诺与实现不符。
- 同时 Phase C 已把 `/square-collage/` 301 到 `/tools/square/`，若继续合并会形成 `/square-collage/`→`square`→`squarecrop` 两跳链，并吞掉独立专题页。

## 根因

把“URL 合并/关键词集中”当成纯 SEO 任务，没有先做功能矩阵对照；也没有先核对当前 sitemap/重定向/已上线状态，使用了过期的 GSC/页面描述。

## 规则（必须）

1. 任何工具页合并/301 前，先做功能矩阵：每个模式、每个导出路径、每种语言是否对等；不对等必须先移植功能并跑浏览器回归，不能只加文字。
2. 301 之前先处理已有重定向与 sitemap：恢复被误 301 的独立页，避免多跳链与页面被吞。
3. 合并方案必须核对当前 sitemap/hreflang/lastmod/线上状态，不能用过期快照；GSC 数据无法在仓库侧验证时标注“需维护者确认”。
4. 若两个页面服务不同意图（fill vs crop），优先做 title/H1/description/互链的意图区隔，而不是合并；保留现有曝光与功能入口。
5. 验证必须包含：两页 200、sitemap 集合、title/H1 不重复、互链、重定向无循环、渲染无 JS 异常。

## 检测方法

```bash
node scripts/seo-audit/run-seo-checks.mjs --label phase-d-final --evidence-dir audit/evidence/phase-d
# H1 意图区隔/H2 square-collage 恢复/H3 首页内链；sitemap 61
```

判定：两工具 title/H1 重复或缺少 fill/crop 信号、square 出现 301、square-collage 被重定向/不在 sitemap、出现多跳链均算复发。

## 反例 / 正确做法

- 反例：直接给 `/tools/square/` 5 条 301，squarecrop 仍只有 crop；只加说明文字；square-collage 仍 301 到 square。
- 正确：审计功能差异 → 选择意图区隔（square=fill/no-crop，squarecrop=crop）→ 5 语言 title/H1/JSON-LD + 互链 → 恢复 square-collage 独立页 → sitemap 61 → 32/0/0 + Preview。

## 证据

- `audit/evidence/phase-d/seo-report.json`（32/0/0）、`preview.md`（38/0/5）。
- ADR-0005；Phase D summary。

## 后续动作

- [x] Phase D 采用意图区隔，未合并；square-collage 恢复。
- [ ] 若未来仍要合并，先移植 fill 功能并做浏览器回归；再评估 301。
