# L-20261105-21 — 功能文案必须与实现逐条核对（HEIC/模板/JPG/unlimited/控件语义）

| 字段 | 值 |
|---|---|
| ID | L-20261105-21 |
| 日期 | 2026-11-05 |
| 状态 | closed（生产验证 2026-11-05） |
| 严重度 | P1 |
| 证据层 | 代码层 + 页面文案 + 浏览器实测 |
| 关联文件 | `index.html`、`i18n/*.json`、`public/tools/*/index.html`、`how-to-make-a-collage.html`、`contact.html` |
| 发现来源 | 用户反馈“描述的功能并不实在” |

## 症状（已修正的真实例子）

- 全站宣称 HEIC，但 Chrome/Firefox 无法 `<img>` 解码 → 选了文件无反应（旧代码无 `onerror`）；
- 宣称“20+ templates”，全站无模板实现；
- 宣称“Export PNG or JPG”，实际只有 PNG；
- 同一句写“unlimited images...support up to 20 photos”；
- roundedcorners FAQ 宣称“JPG/WEBP solid background + color picker”，页面无背景色控件；
- blurredframe FAQ 宣称“frame width 5–40% / blur 1–100”，实际控件是 mainScale 50–200 / blur 0–200；
- square resize 文案“stretches exactly”，实现是白底 contain。

## 规则（必须）

1. 新增/修改用户可见文案时，逐条对照实现（含失败路径、格式支持、数量上限、导出格式、控件真实范围）。
2. 浏览器不能支持的能力不要承诺（如 HEIC 解码）；只承诺实际可验证的能力。
3. FAQ/SEO meta 与 UI 文案同源检查；i18n 5 个语言的值全部更新（不能只改英文）。
4. 验收时把“文案承诺”列入检查项（本阶段用 grep + 浏览器上传/导出实测）。

## 检测方法

```bash
# 1) 查仍存在的可疑承诺
grep -rniE 'HEIC|20\+ templates|PNG or JPG|unlimited images|color picker|5-40%|1-100' \
  --include='*.html' --include='*.json' . | grep -v '^./audit'
# 2) 浏览器回归覆盖上传/导出/模式切换
node scripts/functional-audit/run-tests.mjs
```

## 反例 / 正确做法

- 反例：`upload.format_hint = "PNG, JPG, HEIC up to 20 images"`（无 HEIC 解码）。
- 正确：改为 WEBP；并在 `img.onerror` 给出明确提示。

## 证据

- `git diff` 中 26 个站点文件 + 5 个 i18n JSON；
- `audit/PHASE-F-REPORT.md` §5 文案真实性修正表。

## 后续动作

- [x] 修正本期发现的文案夸大。
- [x] 改完跑浏览器回归（52/0/1）。
- [ ] Phase B 再做一次全站文案 ↔ 实现对照（尤其 SEO 落地页）。
