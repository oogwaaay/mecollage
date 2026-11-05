# L-20261105-19 — 预览与导出禁止各写一套几何公式

| 字段 | 值 |
|---|---|
| ID | L-20261105-19 |
| 日期 | 2026-11-05 |
| 状态 | mitigated（Phase F 已修复 4 处；回归 52/0/1） |
| 严重度 | P0 |
| 证据层 | 代码层 + 浏览器实测 |
| 关联文件 | `public/tools/squarecrop/index.html`、`public/tools/square/index.html`、`public/tools/blurredframe/index.html`、`assets/js/mecollage-main.js` |
| 发现来源 | 用户反馈“按比例做圆/方、排列样式有问题”；Phase F 审计 + CDP 回归 |

## 症状

- squarecrop：预览构图正确，下载后图片被拉伸/偏移/空白；
- square crop：导出源矩形把“显示尺寸”当“源像素尺寸”；
- blurredframe：预览按所选比例、导出恒正方形；
- 首页：预览比例/文字/贴纸与导出不一致。

## 根因

每个页面维护两套几何：预览 `drawImage` 一套、导出 `draw*ToCanvas/downloadImage` 另一套；且对 zoom/pan/DPR/容器尺寸的换算口径不同。修改预览时不会同步导出。

## 规则（必须）

1. 预览与导出必须复用同一个变换函数（或导出 = 预览变换的同比放大）；禁止复制粘贴第二套公式。
2. 导出尺寸变化时，pan 偏移必须按 `outSize/previewSize` 归一化。
3. 验收必须包含“预览 vs 导出构图一致”的断言（像素/采样/关键坐标），不能只断言导出尺寸。

## 检测方法

```bash
# 浏览器回归（含导出尺寸/内容变化）
node scripts/functional-audit/run-tests.mjs
# 代码层：每个工具页只允许一个 drawScene/drawImage 类函数被预览与导出共同调用
grep -n "function draw.*ToCanvas\|function drawImage\|function drawScene" public/tools/*/index.html
```

## 反例

- 反例：squarecrop 旧代码 `sourceX = (-centerX / canvas.width) * imgWidth`（把显示宽度当源宽度），导出与预览完全不同。
- 正确：Phase F 改为 `outScale = max(O/W,O/H)*zoom`、`pan*O/previewW`，直接 `drawImage` 整图。

## 证据

- `audit/evidence/phase-f/tools/feature-bug-matrix.md` BUG-03/06/12/13
- `audit/evidence/phase-f/browser/report.md` CRP-05/SQR-05/SQR-06/BLR-02/06

## 后续动作

- [x] 修复 square/squarecrop/blurredframe/首页导出。
- [x] 回归断言覆盖导出尺寸与内容变化。
- [ ] 增加“预览 vs 导出”逐像素断言（可选，Phase G）。
