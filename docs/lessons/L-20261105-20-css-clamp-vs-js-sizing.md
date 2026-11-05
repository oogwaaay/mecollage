# L-20261105-20 — CSS clamp/box-sizing 会静默覆盖 JS 计算的尺寸与比例

| 字段 | 值 |
|---|---|
| ID | L-20261105-20 |
| 日期 | 2026-11-05 |
| 状态 | closed（生产验证 2026-11-05） |
| 严重度 | P0 |
| 证据层 | 代码层 + 浏览器实测 |
| 关联文件 | `index.html`（`.collage-grid`）、`assets/js/mecollage-main.js`（`renderCollage/exportCollage`）、`public/tools/blurredframe/index.html` |
| 发现来源 | 用户反馈“按比例...排列样式有问题” |

## 症状

- JS 计算 600×600（1:1），实际渲染 600×500（CSS `max-height:500px`）；
- 9:16 实际 338×500（比例 0.676 而非 0.5625）；
- 导出继承错误尺寸，且临时容器 `padding:20px` + 全局 `box-sizing:border-box` 导致右/下裁 20px；
- `min-height:100px` 在宽比例多图时导致行重叠/裁切。

## 根因

CSS 的 `max-height`/`min-height`/`padding`/`overflow` 与 JS 的 inline width/height 同时存在时，渲染尺寸由 CSS 约束优先；导出读取 `getBoundingClientRect()` 得到的是被约束后的尺寸。`aspect-ratio` 在 width/height 都显式设置时会被忽略。

## 规则（必须）

1. 凡由 JS 控制尺寸的容器，移除/运行时覆盖会改变尺寸的 CSS 约束（`max-height`、`min-height`、非对称 padding）；`aspect-ratio` 不能当作尺寸保证。
2. 导出容器必须与内容同尺寸（`box-sizing` 一致、无 padding），并显式设置 background。
3. 验收要断言“实际渲染比例”（`getBoundingClientRect`），不能只断言 inline style。

## 检测方法

```bash
node scripts/functional-audit/run-tests.mjs   # IDX-10/12 断言渲染比例
# 代码层：找 max-height/min-height 与 JS 尺寸同时作用的容器
grep -n "max-height\|min-height\|aspect-ratio\|box-sizing" index.html public/tools/*/index.html
```

## 反例 / 正确做法

- 反例：`.collage-grid { max-height:500px }` + JS `style.height=600px`。
- 正确：`renderCollage()` 运行时 `maxHeight:'none'`、`padding:'0'`，按视口计算；导出容器尺寸=网格尺寸且无 padding。

## 证据

- `audit/evidence/phase-f/editor/feature-bug-matrix.md` R1/R3
- `audit/evidence/phase-f/browser/report.md` IDX-10/12（基线 FAIL → 修复 PASS）

## 后续动作

- [x] 修复首页比例/导出/单图布局。
- [x] blurredframe 画布改为按比例（不再恒正方形）。
- [ ] 清理其余页面同模式风险（Phase B 页面模板化时统一检查）。
