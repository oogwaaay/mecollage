# L-20261106-27 — JSON-LD 必须由真实页面内容生成，并覆盖同类所有页

| 字段 | 值 |
|---|---|
| ID | L-20261106-27 |
| 日期 | 2026-11-06 |
| 状态 | mitigated（Phase C 实现；本地 harness 28/0/0；生产待批准） |
| 严重度 | P3 |
| 证据层 | 代码层 + 渲染层 |
| 关联文件 | 60 个可索引 HTML、`scripts/seo-audit/run-seo-checks.mjs`（G1–G6） |
| 发现来源 | Phase C harness 首轮 FAIL（blurredframe 5 页缺 FAQPage）；独立复核复现 |

## 症状

- 全站 JSON-LD 为 0；补结构化数据后，4 个工具页中 3 个有 FAQPage，唯独 blurredframe（root+4 语言）没有——因为它的 FAQ 用 `<button class="faq-question">` + `<div class="faq-answer">`，而生成脚本只匹配 `<h3>` + `<p>`。
- 若不校验“同类页面是否一致”，会出现同一模板族的 schema 类型不一致，且不会报错。

## 根因

JSON-LD 由正则模板拼装，只覆盖一种 DOM 结构；没有按页面类别做“类型/必填字段/数量”断言，也没有覆盖所有同类页的矩阵检查。

## 规则（必须）

1. JSON-LD 只能从页面真实 title/description/FAQ/H1/日期生成；禁止编造评分、评论、价格、作者。
2. 同类页面必须使用同一 schema 类型集合；新增/修改工具页时，5 个语言版本同时生成并逐一校验。
3. 验收必须包含：60 个可索引页均可解析、均有 `@graph`、类型符合、FAQPage 的 Q/A 来自可见 FAQ、noindex/301 页不输出 JSON-LD。
4. FAQ 提取必须兼容实际 DOM（h3/p、button/div 等），不能用单一选择器假定模板。

## 检测方法

```bash
node scripts/seo-audit/run-seo-checks.mjs --label phase-c-final --evidence-dir audit/evidence/phase-c
# G1 可解析/G2 @graph/G3 类型/G4 FAQPage 覆盖/G5 noindex 无 JSON-LD/G6 必填字段
```

判定：任一可索引页 JSON-LD 不可解析、同类页类型缺失、FAQPage 与可见 FAQ 数量/内容不一致，均算复发。

## 反例 / 正确做法

- 反例：`public/tools/blurredframe/index.html` 有 8–12 个 FAQ，但 JSON-LD 只有 WebPage/SoftwareApplication/BreadcrumbList；harness G3 FAIL。
- 正确：按 `<button class="faq-question">` + `<div class="faq-answer">` 提取，补 FAQPage；5 页全部通过；harness 28/0/0。

## 证据

- `audit/evidence/phase-c/known-issue-blurredframe-faqpage.md`（首轮 FAIL）、`audit/evidence/phase-c/seo-report-phase-c-final.*`（修复后 28/0/0）。
- 独立复核自写 JSON-LD 校验在同一 5 页复现，修复后消失。

## 后续动作

- [x] blurredframe 5 页补 FAQPage；JSON-LD 60/60。
- [ ] 生产部署后复跑 G1–G6；新增工具/页面时按同类矩阵生成并校验。

## 变更记录

- 2026-11-06 Phase C：blurredframe 5 页补 FAQPage，harness 28/0/0。
- 2026-11-06 Phase E：发现 `/tools/squarecrop/` 把 `Easy to use`/`High-quality output`/`Free and unlimited` 等卖点写成 FAQ；改为真问题，重写 `Crop when/Fill when` 为完整句子，并从可见 FAQ 重新生成 JSON-LD；英文 8/8、本地化 6/6 匹配。
