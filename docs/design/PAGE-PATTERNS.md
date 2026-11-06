# MeCollage 页面规律总结与「只统一、不重设计」改造报告

> 版本：v1.0.0（2026-11-06）· 分支 `docs/design-tokens` · 基线 commit `fedc3ee`
> 关联：[DESIGN-TOKENS.md](DESIGN-TOKENS.md)（token 与规则）· [COMPONENT-RECIPES.md](COMPONENT-RECIPES.md)（组件配方）· [INTERACTION-AUDIT.md](INTERACTION-AUDIT.md)（交互审计与下一步）· [ADR-0006](../decisions/ADR-0006-design-token-single-source.md) · [L-20261106-30](../lessons/L-20261106-30-design-values-hardcoded-and-drift.md)
> 证据：`audit/design-migration/before/`、`audit/design-migration/after/`、`audit/design-migration/REGRESSION.md`、`audit/design-tokens/`（均为本机产物，不入库/不部署）

---

## 0. 一句话结论

站点有**一套明确的视觉语言**（壁纸 + 深色玻璃 + 薄荷绿），但**没有单一事实源**：95 个手写页 / 5 语言副本 / 3 个 CSS 产物（其中 2 个压缩无源码）+ 95 个内联样式块，导致同一组件有 2–4 套值，长页在首屏以下还会因 `html` 白色底而变成"浅灰玻璃 + 白字"的低对比灾难。本次做了三件事：① 建立 273 个 `--mc-*` token 与三层结构；② 新增统一层 `components.css`（页面内联样式之后加载）把语义相同的组件收敛到同一套值；③ 94 个页面接入 token/统一层并做 6,955 处**精确等价** token 化（颜色字面量 5,064 → 245，`var(--mc-*)` 引用 0 → 6,955）。**没有改**信息架构、文案、URL、广告/统计、导出默认值，也没有手改压缩 bundle。

---

## 1. 范围、方法与口径

| 项 | 说明 |
|---|---|
| 页面 | `git ls-files '*.html'` = **95**（root 15 + blog 9 + tools 4 + es/ja/tw/zh 各 17，实测 95） |
| 页面族 | **27 个族**（17 个族 ×5 语言副本 + 独立页/404 等）；同族页面 HTML 结构高度相似、样式块整段复制 |
| CSS 产物 | `assets/index-vAuRGWiM.css`（59,487B，单行压缩，无源码）、`assets/pages-C2UaL6ML.css`（16,733B，121/121 规则是 index 子集）、`assets/css/i18n.css`（1,415B，手写旧实现） |
| 内联样式 | 95 个 `<style>` 块 / 664,467B / 14,366 条声明 → 归一化后 **31 个不同版本** / 去重 166,852B；`style=""` **1,560** 处 |
| 方法 | 零依赖盘点脚本（`audit/design-tokens/extract-css.mjs`、`extract-ui.mjs`）+ 静态样式值聚类 + 12 个代表页 ×2 视口的渲染截图与计算样式（CDP） |
| 证据层 | 代码层（可复现命令/计数）+ 本地渲染层（截图/计算样式）；**未做**线上渲染与平台层验证 |

口径说明：盘点里的 `occurrences` 会被 5 语言副本放大，设计权重看 `units`（去重源单元）；颜色按 RGB+alpha 归一，`#00000040` 与 `rgba(0,0,0,.25)` 视为等价。

---

## 2. 页面族谱（规律一：骨架高度同构）

| 族 | 页面 | 样式来源 | 特征 |
|---|---|---|---|
| 首页/编辑器 | `index.html` + 4 语言 | 两个 bundle + 24,855B 内联块 | 三栏（侧栏 320 / 画布 / 图片 280），玻璃面板，云/树装饰层（bundle 里默认 `display:none`） |
| 工具页 ×4 | square / squarecrop / roundedcorners / blurredframe + 4 语言 | 两个 bundle + 12.8–17.1KB 内联块 | 页头 → 工具导航 → 预览区 + 设置面板（1fr + 300px），面板 30px 圆角/18px 模糊 |
| 内容页 | about / contact / privacy / terms + 4 语言 | 两个 bundle + 5,020–10,190B 内联块 | 页头 + 大玻璃面板；privacy/terms 共用同一 5,020B 块（10 份完全一致） |
| 博客 | `blog/index.html` + 9 篇文章 | 两个 bundle + 内联块（列表 5.5KB 级） | 列表卡 + 文章窄容器（800px）+ 相关文章 |
| 专题/指南页 | 生日/圣诞/婚礼/免费/教程/方形/竖版等 root 9 页 | **无 bundle**，仅内联（1–1.3KB） | 单列 `.container`，自带一套精简样式；缺少壁纸背景层 |
| 本地化专题/指南 | es/ja/tw/zh 各 8 页（共 32） | **无 bundle**，仅内联 | 与 root 专题同构，语言副本 |
| 404 | `404.html` | 纯内联（≈2KB） | 独立实底深色 `#101512` + 薄荷绿，自洽 mini 体系 |

关键事实：

1. **41 个页面完全不引用任何 CSS bundle**（root 9 + 每语言 8）：它们只有内联样式，缺 `.ghibli-background` 壁纸层、缺统一 body/标题规则 → 页面看起来是"白底灰块"，与主站视觉脱节。
2. **54 个页面引用两个 bundle**，其中 66 页额外加载 pages bundle（121/121 规则已在 index 中 → 全量重复下载）。
3. **95 个页面都有 1 个内联 `<style>`，全部在 `<head>` 内**（本次注入点即 `</style>` 之后、`</head>` 之前）。
4. 只有 **10 个页面**在自己的内联块里定义 `.lang-selector-toggle`（其余依赖 bundle 或 i18n.css）。

---

## 3. 共享骨架（规律二：每页都是同一套结构）

```
<html> → <head>（字体/FA/两个 bundle/i18n.css/内联 <style>）
  → <body class="app-container 或直接内容">
      .ghibli-background（壁纸 + 云/树/鸟装饰层，装饰默认关闭）
      .ghibli-nav（sticky，透明，pill 导航 + GitHub + 语言选择器）
      .page-header / 工具页 header（.page-title + .page-subtitle）
      .tool-nav（4 工具入口，玻璃面板）
      内容：.page-container / .preview-section+.settings-section / .container / .blog-article-container
      footer（无 class，纯文本 + 品牌绿链接）
```

**改造前最大的视觉缺陷**（before 截图可复现）：`.ghibli-background` 是 `position:fixed` 且只有视口高度；`html` 没有背景色（默认白），当页面高度 > 100vh 时，首屏以下所有 `rgba(0,0,0,.25~.4)` 玻璃都叠在**白底**上 → 显示为浅灰块，而文字仍是白色 → 对比度极低（privacy/free-collage-maker/首页 FAQ 均可见）。41 个无 bundle 页面则完全没有壁纸层，整页白底。

> 本次修复：统一层给 `html` 加实底深色兜底（`--mc-solid-bg`），并给 `.ghibli-background` 补齐固定壁纸层（`components.css` §0）。这是"修复既有设计意图"，不是新增视觉语言。

---

## 4. 样式来源与层叠（规律三：样式来自四个地方，且互相覆盖）

```
index bundle → pages bundle → i18n.css（54 页，部分在 body 末尾）→ 页面内联 <style> → style=""
```

- bundle 中 **91.6% 的颜色声明是字面色值**（4,657/5,083），纯 `var()` 仅 28 条；22 个 `:root` 旧变量里 **11 个从未被引用**。
- `pages` bundle 是 `index` bundle 的子集（121/121），但 66 页仍加载 → 重复下载与维护错觉。
- `i18n.css` 的 10/10 条规则**不在** index bundle 中，且 `.lang-selector*` 与 bundle 的新玻璃 pill 冲突（`#333`/4px/14px vs 玻璃/999px/.85rem；z-index 1000 vs 50）；它在 54 页的 **bundle 之后**加载 → 代码层推断会覆盖新样式（本次统一层用 `body` 前缀覆盖回来）。
- 内联块自成体系：474 条去重规则只有 5 条与 index 重合；31 个不同块之间共享 131 条规则；71/726 个 selector 存在多版本（`.cta-button` 12 种、`body` 6 种、`h1` 6 种、`.container` 4 种）。

---

## 5. 组件规律（规律四：组件同构，但值不统一）

| 组件 | 现有实现 | 规律（高频值） | 本次统一 |
|---|---|---|---|
| 顶部导航 | `.ghibli-nav` + `.nav-link` | 透明 sticky z-100，pill 导航，字重 600，`.95rem` | 统一 pill 背景/激活态/焦点/位移 |
| 语言选择器 | `.lang-selector*`（bundle + i18n.css 两套） | 玻璃 pill vs #333 方块 | 统一玻璃 pill（`--mc-surface-menu` 浮层） |
| 工具导航 | `.tool-nav` + `.tool-nav-link` | 30px 圆角、18px 模糊、玻璃面板 | 统一面板/链接激活态 |
| 页面标题 | `.page-title` / `.policy-title` / 裸 `h1` | 2.5rem/700/`#8fd68f`/双层 text-shadow | 统一 mint/2.5rem/700/双层阴影 |
| 副标题 | `.page-subtitle` / `.policy-subtitle` / `.subtitle` | `1.2rem`，胶囊或纯文字两种形态 | 保留两种既定形态，统一字号/颜色/间距 |
| 玻璃面板/卡片 | `.page-container` / `.preview-section` / `.container` / `.feature-card` / `.blog-post` | 20/24/30px 圆角、10/18px 模糊、surface .25–.35 | 卡片 20 / 面板 30 / 条目 16 / 控件 12 / 胶囊 999 |
| 按钮 | `.btn*` / `.cta-button`（14 变体）/ `.download-btn` | 蓝=主操作、绿=成功；圆角 12/14/20/50px 混用 | 半径 12、字重 600、位移 2px；CTA 统一 capsule |
| 表单 | `.blog-search-input` / `.grid-input` / tool 页 `select`/`range` | 深色玻璃 + 白 18% 描边；placehoder 50% 白 | 统一 input 底/描边/焦点 ring |
| 上传区 | `.upload-area` | 2px 虚线薄荷绿、20px 圆角、.2 黑底 | 统一虚线/圆角/拖拽态（绿色阴影） |
| 编辑器画布控件 | `.remove-btn` / `.drag-handle` / `.add-image-btn` | 照片上浅色圆形按钮（白 .95/红 #ef4444/slate 占位） | 保留浅色叠加体系，统一 overlay token；占位块改深色玻璃 |
| FAQ | `.faq-*` | surface .3、16px 圆角、mint 问题 | 统一卡片/描边/hover/图标旋转 |
| Toast | `.toast` | 深灰 `#111827f2`、8px 圆角、z-9999 | 统一 token；**未新增** error 变体 |
| Footer | 裸 `<footer>`（无 class） | 居中、90% 白、mint 链接、surface .3 | 统一 surface-2/描边/链接色 |

---

## 6. 设计值规律（规律五：视觉语言清晰，但取值碎片化）

| 维度 | 规律 | 碎片化事实 |
|---|---|---|
| 颜色 | **薄荷绿是品牌锚点**（`#8fd68f` 1,588 次/93 文件）；蓝 `#4A90E2` 只是主操作按钮（15 次）；玻璃=黑 alpha 阶梯 + 白 alpha 阶梯 | 黑 alpha 27 层、白 alpha 46 层、绿 alpha 28 层；另有 Tailwind slate（浅色叠加控件）、Material 红/紫/青（专题/对比表）、`#333`（i18n.css）等**三套外来色板** |
| 字体 | Noto Sans SC 400/500/600/700 + 系统回退；字重 600 主导（280 次） | **6 个 font-family 栈**（含 `Noto Sans SC, sans-serif` 简化版 30 次、Courier New 2 次）；43 个不同 font-size；旧页 `2.5em/2em` |
| 间距 | 4px 基准的 rem 阶梯与 px 旧值并存 | rem `{.5,.75,1,1.5,2,3,4}` + px `{8,10,12,15,20,30,40,50,60}` 两套 |
| 圆角 | 20/30/12 为高频；胶囊 999 主要用于语言/工具导航 | 23 个不同值（15px 49 次、50px 42 次、4px 35 次为非标） |
| 阴影 | 容器主阴影 `0 20px 60px rgba(0,0,0,.35)`（159 次）；卡片 `0 8px 24px rgba(143,214,143,.3)`（50 次，品牌绿阴影） | 112 个不同 box-shadow 值 |
| 模糊 | 18px（容器主力 210 次）、10px（卡片 193 次）、8px | 7 个值（5/6/8/10/12/18/0） |
| 动效 | `transition: all .3s ease` 342 处；hover 位移 1–5px；装饰动画 4 个（云/鸟/叶/太阳），bundle 中默认隐藏 | 缓动混用 ease/cubic-bezier/ease-in-out；未处理 reduced-motion |
| 断点 | **768px（61 处/56 文件）+ 992px（30 处/25 文件）**承担 94% 响应式 | 960/1024/1280/600 各 1 处遗留；无 576/1200 |
| 布局 | 内容容器 1200；编辑器 1800（320/1fr/280 三栏）；工具页 1fr+300；文章 800 | 41 页 `.container` 900px；政策页 1000px；5 个工具容器类名不同 |

---

## 7. 改造前的"不规范"清单（量化）

| # | 问题 | 证据 |
|---|---|---|
| 1 | 长页玻璃叠白底 → 浅灰 + 白字低对比 | `privacy-desktop.png`、`free-collage-maker-desktop.png`、`home-desktop.png` 首屏以下 |
| 2 | 41 页无壁纸/背景层，整页白底灰块 | `es-christmas-collage-maker-desktop.png` |
| 3 | 同一标题 2.5rem/em/2rem 混用，颜色 mint/白/深绿混用 | 内联块 6 种 `h1` 变体 |
| 4 | 语言选择器两套样式互相覆盖 | bundle vs `i18n.css:7-44` |
| 5 | 按钮圆角 12/14/20/50px 混用，CTA 14 种变体 | `audit/design-tokens/css-inventory.json` conflicts |
| 6 | 专题页主题色各写一套（生日 `#fcb69f`、婚礼 `#d81b60/#e91e63`、圣诞 `#228b22/#ffc107`…） | 5 语言副本各一份 |
| 7 | 政策页标题/副标题与主站不同（1000px 容器、纯文字副标题、白字标题） | `privacy-desktop.png` |
| 8 | 首页画布占位块用浅色 slate（`#f1f5f9`），与深色站不协调 | `index.html` 内联 `.add-image-btn` |
| 8 | 图片画布占位块用浅色 slate（`#f1f5f9`），与深色站不协调 | `index.html` 内联 `.add-image-btn` |
| 9 | `pages` bundle 全量重复加载（66 页） | 121/121 子集关系 |
| 10 | **29 个指南页 `<head>` 内 `</style>` 之后有裸 CSS 文本**（`.ghibli-background {…}`），旧白底时白字白底不可见，深色壁纸启用后会显示成页面顶部一行 CSS | es/ja/tw/zh + root 指南页；本次已修复 |
| 11 | 无 focus-visible 统一、无 reduced-motion、hover 在触屏"粘住"、`transition: all` | 全站检索 |

---

## 8. 统一决策：把"标准"钉死（只统一、不重设计）

> 完整规则见 [DESIGN-TOKENS.md](DESIGN-TOKENS.md) §4；组件实现见 [COMPONENT-RECIPES.md](COMPONENT-RECIPES.md)。

| 语义 | 标准值 | token |
|---|---|---|
| 页面标题 | 2.5rem / 700 / `#8fd68f` / 双层深色 text-shadow；移动端 2rem | `--mc-font-size-h1` / `--mc-text-heading` / `--mc-text-shadow-display` |
| 副标题 | 1.2rem，hero 用薄荷绿胶囊、政策/文章用 85% 白纯文字（两种既有形态） | `--mc-font-size-h4` / `--mc-radius-xl` |
| 玻璃面板 | 30px 圆角 / 18px 模糊 / surface-2 / 18% 白描边 / 深阴影 + 上沿高光 | `--mc-panel-*` |
| 卡片 | 20px 圆角 / 10px 模糊 / surface-1 / hover 上浮 5px | `--mc-card-*` |
| 控件 | 12px 圆角 / surface-3 / 20% 白描边 / 内阴影 / 焦点 mint ring | `--mc-input-*` / `--mc-focus-ring-*` |
| 按钮 | 主操作=蓝渐变、成功/CTA=绿渐变；字重 600；hover 上浮 2px；禁用 50% | `--mc-button-*` / `--mc-gradient-*` |
| 玻璃层级 | 面板 18 / 卡片 10 / 导航与菜单 8 / 小控件 5–6 | `--mc-blur-*` |
| 阴影 | e1 列表 → e2 卡片 → e3 标准卡 → e4 面板 → e5 hover；绿色阴影仅 CTA/拖拽 | `--mc-shadow-*` |
| 间距 | 4px 基准：4/8/12/16/20/24/32/40/48/64 | `--mc-space-*` |
| 动效 | 0.15/0.2/0.25/0.3/0.5s，ease；具体属性过渡 | `--mc-duration-*` |
| 断点 | 768（主）/ 992（工具页），其余视为遗留 | `--mc-bp-md` / `--mc-bp-tool` |
| 专题页主题色 | 页面级覆盖 `--mc-color-theme-accent`，不再复制 5 份色值 | `--mc-color-theme-accent` |

**明确不做**：不改信息架构/布局列数、不改文案、不改 URL（H9）、不碰广告/统计/Publisher ID（H5）、不改导出与 canvas 产品默认值（`#ffffff` 背景 / scale 2 / 文字默认 24px 等）、不手改压缩 bundle、不引入构建系统。

---

## 9. 精修清单（审美 / 交互 / 高级感，克制）

| # | 方向 | 改动 | 理由 |
|---|---|---|---|
| 1 | 审美 | `html` 实底深色兜底 + 全站补齐固定壁纸层（94 页） | 修复长页浅灰玻璃/白字低对比；壁纸在任何滚动位置都固定存在 |
| 1b | 审美/可读性 | 壁纸压暗层 `--mc-surface-scrim`（38%） | 亮云区域正文对比度 3.75:1 → **7.55:1**（AA），壁纸仍保留约 62% 亮度；不接收指针事件，不影响交互 |
| 2 | 审美 | 玻璃面板/卡片加 1px 上沿高光（`inset 0 1px 0 rgba(255,255,255,.05–.06)`） | 让玻璃有"厚度"，比纯半透明更精致，不增加视觉噪音 |
| 3 | 审美 | 标题统一 mint + 双层深色阴影；`text-wrap: balance` | 标题换行更均衡，长标题不再出现孤立词 |
| 4 | 审美 | 细节控件统一圆角/描边/模糊；非标 15px/50px 圆角随迁移收敛 | 减少"这里差 1px"的廉价感 |
| 5 | 审美 | 正文链接统一 mint + `text-underline-offset: .2em` | 长文可读性与精致度 |
| 6 | 审美 | 页面/侧栏滚动条极细化、品牌绿半透明 thumb；选区用品牌绿 30% | 去掉浏览器默认灰滚动条的突兀感 |
| 7 | 交互 | 统一 `focus-visible` 3px 薄荷绿 ring + 2px offset | 键盘可用性；也让焦点态与品牌一致 |
| 8 | 交互 | 按钮/卡片 hover 统一位移（2px/5px）与阴影升级；`:active` 回落 | 交互反馈一致，不再是"有的动有的不动" |
| 9 | 交互 | hover 位移仅 `@media (hover:hover)` 生效；触屏不粘住 | 移动端不再出现"点完还悬着"的错觉 |
| 10 | 交互 | `prefers-reduced-motion` 下关闭装饰动画与过渡 | 可访问性；眩晕敏感用户友好 |
| 11 | 交互 | 锚点 `scroll-margin-top: 5rem` | sticky 导航不再遮住跳转目标 |
| 12 | 高级感 | 数字等宽（计数器/尺寸/日期） | 数值变化不抖动，更"专业工具" |
| 13 | 高级感 | 渐变按钮加内高光、绿色 CTA 阴影用 `--mc-shadow-brand*` | 让仅有的几个彩色元素更有质感 |
| 14 | 高级感 | 图片加载时用深色底占位 | 避免图片未加载时的白色闪块 |
| 15 | 修复 | 移动端横向溢出根治（首页 218px、5 个 free-collage 106–187px、博客文章 71px、320px 下 30 页 ×11px） | 修复后 390/360/320 三宽度 94 页全部 0 溢出；壁纸层在可滚动范围内完整；同时解决"横向拖动露深色兜底"的边界问题 |
| 16 | R0/R1 | 交互审计落地：toast、可见 Undo/Redo、未保存保护、移动导航 60px、工具优先布局、导出反馈、AI 懒加载、触控拖拽 | 移动端上传区 1148→109px（首页）/1193→259–434px（工具页）；functional 51/0/2、SEO 32/0/0、token PASS；详见 `audit/design-migration/R1-RESULTS.md` |

> 所有精修都集中在 `assets/css/components.css` 一个文件，可单独回滚；不新增动画语言、不新增字体、不改布局。

---

## 10. 实施方式（可回滚、可验证）

1. **新增** `assets/css/design-tokens.css`（273 个 token，仅变量）与 `assets/css/components.css`（统一层 + 精修）。
2. `scripts/design-system/migrate.mjs`：
   - `--inject`：94 个页面在 `<head>` 的 `<style>` 之后插入 tokens/components 两个 `<link>`（**404.html 排除**）；
   - `--tokenize`：**只在值精确等价时**把字面值换成 `var(--mc-*)`（颜色 4,248 / font-size 1,006 / 圆角 731 / 模糊 439 / 整段阴影 531 = **6,955 处**；不等的值保持原样）；
   - 修复 29 页 `<head>` 内游离 CSS 文本（`.ghibli-background {…}` 历史 bug）；
   - 幂等（二次 dry-run `toModify=0`）；先 `--dry-run` 出报告，`--apply` 才写入；回滚 `git checkout -- '*.html'`（详见 `scripts/design-system/README.md`）。
3. **不手改**压缩 bundle 与 JS；`i18n.css` 的冲突由统一层用 `body` 前缀优先级覆盖（删除该旧块留到 G2，需逐页视觉核对）。
4. **修复历史 HTML bug**：29 个指南页 `</style>` 之后的裸 CSS 文本（`.ghibli-background {…}`）。旧白底时不可见；统一层启用深色壁纸后会暴露为页面顶部的样式文本，因此删除这段游离文本（背景改由 `components.css` 统一提供）。该修复已纳入 `migrate.mjs --inject` 步骤（幂等）。
4. 验证：静态审计 + 本地渲染截图 before/after + 功能/SEO harness（结果见 §11）。
5. **移动端溢出修复**（`components.css` 媒体查询内）：`.collage-tool-container/.blog-article-container` 宽度 100% + 去 auto margin；表格 `table-layout:fixed` + 换行；长词断行；320px 卡片单列。桌面不受影响；证据 `audit/design-migration/MOBILE-OVERFLOW.md`。

---

## 11. 结果与证据

| 指标 | before | after |
|---|---|---|
| 注入 tokens/components 的页面 | 0 | **94**（404.html 保持独立主题） |
| HTML 中 `var(--mc-*)` 引用 | 0 | **6,955** |
| HTML 内联样式里的颜色字面量 | **5,064** | **245**（−95.2%） |
| `--mc-*` token 数 | 0 | **273** |
| 设计值审计 | 无门禁 | `run-token-audit.mjs` **PASS**（新增漂移 0；存量债务基线化） |
| 结构完整性 | — | 94 页 tag 计数检查：仅 +2 `<link>/页`，无其它标签变化；无未定义 `var(--mc-*)` |
| 视觉回归 | — | 12 页 ×2 视口 before/after 截图：**404 逐像素 0.000%**（控制组）；其余页变化 74–99%（预期：深色兜底 + 统一层生效）。**回归复核 #2：R1–R5 修复后无新增回归**——首页移动端溢出回到 before 值（scrollWidth 608）、工具页新增溢出清零（390/0）、旧版 `.container` 宽度/列数恢复（900/1000px、es-christmas 2×2）、CTA 恢复居中、表格对齐按页面原值、移动端 h2 统一 24px；767/768/769 断点均无横向溢出（`audit/design-migration/REGRESSION.md`） |
| 功能回归 | — | `scripts/functional-audit/run-tests.mjs`：**PASS 52 / FAIL 0 / WARN 1**（2026-11-06 本地） |
| SEO/多语言 harness | — | `scripts/seo-audit/run-seo-checks.mjs --label design-unify-g1`：**PASS 32 / FAIL 0 / WARN 0** |
| 历史 bug 修复 | — | 29 个指南页 `<head>` 内游离 CSS 文本（`.ghibli-background {…}`）删除；由 `components.css` 统一提供背景层 |
| 移动端横向溢出 | 390px：7 页（最大 +218px）；320px：30 页（各 +11px） | **0 / 94 页**（390/360/320 三宽度全量扫描） |
| 壁纸层固定 | — | **94/95 页**有壁纸标记且 `position:fixed` 覆盖视口（10 个代表页 × scroll 0/600/1500/底部全部通过）；`/wallImage.webp` 200；404 独立主题例外。壁纸压暗后面板背景对比度最低 **7.55:1**（原 3.75:1），独立文本对比度采样 min **4.91:1**（AA 通过）。详见 `audit/design-migration/WALLPAPER.md` |

补充：审计脚本的"既有债务"计数（颜色 338 等）主要来自**无法精确等价的存量值**（如 15px 圆角、`#333`、专题主题色、压缩 bundle 内部值），token 化只做零视觉变化的替换，因此不改变该计数；真正的语义合并放到 G3，见 §12。

---

### 11.1 回归复核（R1–R6）：修复与决策

首轮 after 采集发现 5 项疑似回归，已全部修复并按同一口径重采复核（`REGRESSION.md` 复核轮次 #2，14 个定向断言见 `audit/design-migration/verify-fixes.json`）：

| 编号 | 问题 | 决策 | 结果 |
|---|---|---|---|
| R1 | 统一层在 ≤768px 仍给内容容器 32px padding（页面原本 16px）→ 首页移动溢出 +32px、工具页新增 26.5px 溢出 | **修复**：容器 padding/width 交还页面原值（见 R2），只统一玻璃视觉 | 首页 scrollWidth **608→608**（回到 before，溢出 218px）；tool-square **390/0**；博客移动正文列回 **308px** |
| R2 | `.container` 900/1000→1200 导致卡片 2×2→1×4 重排 | **修复**：不改旧版页容器 max-width/padding（遵守"不改布局列数"） | es-christmas 回 **900px + 2×2（374px 374px）**；free-collage-maker 回 **1000px**、3+1 布局保持 |
| R3 | `.cta-button` 由居中变左对齐 | **修复**：保留块级居中（`display:block; width:fit-content; margin:auto`） | 实测左右中心差 **0px** |
| R4 | 表格对齐被统一改为左对齐 | **修复**：删除全局 `text-align` 覆盖，按页面原值 | free 表格 **6/6 采样回 center**；tool-square 保持原 left |
| R5 | 移动端 h2 被放大（about/contact 24→28.8px） | **修复**：≤768 统一 24px（多数页面原值） | 实测 390 视口 h2 = **24px**；privacy 20.8→24 为有意统一 |
| R6 | 语言按钮对比度 12.63:1 → 6.83:1 | **接受**：仍 ≥ WCAG AA 4.5:1；浅色壁纸区域留 Preview 抽查 | 不改 |

> 结论：**未发现新增回归**；剩余与 before 的差异均为设计层统一/精修的预期结果（深色兜底、字体栈/标题/页脚/语言按钮统一、页脚高度、可读行宽等）。

## 12. 剩余工作（G2–G4）

| 阶段 | 内容 | 风险/门禁 |
|---|---|---|
| G2 | 收敛重复内联块（31 版本 → 共享 CSS）；删除 `i18n.css` 的重复 `.lang-selector*`；评估移除 66 页的 pages bundle 冗余引用 | C2：Preview + `verify-site` + 功能/SEO harness + 逐页截图对比 + 维护者批准 |
| G3 | 语义合并存量非标值（15px→16px、50px→pill、`#333`→surface、专题主题色→`--mc-color-theme-accent`）；41 个无 bundle 页正式迁入共享层 | 同上；每批 ≤10 页，基线逐步下降 |
| G4 | 用覆盖层替代旧 bundle 关键组件或重建可维护源 CSS；删除 i18n.css；审计债务趋近 0 | C3：全量回归 + ADR |

本次（G1）仍为**本地分支改造**：未提交、未推送、未部署生产。按 H1/H2，下一步是 push 分支 → Vercel Preview → `verify-site` + 截图回归 → 维护者明确批准 → 生产。

---

## 13. 回滚

- 只回滚统一层：删除 94 页的两行 `<link>`（或 `git checkout -- '*.html'`），页面恢复改造前样式；token 化本身零视觉变化，可单独保留。
- 回滚某类精修：编辑 `components.css` 对应小节即可，不影响 token 定义。
- 回滚 token 系统：删除新增文件即可；页面未引用时零影响。

---

## 附录：证据索引

| 路径 | 内容 |
|---|---|
| `audit/design-tokens/css-inventory.{json,md}` | 样式值全量盘点（4,237 规则/17,108 声明/颜色家族/冲突/组件簇） |
| `audit/design-tokens/ui-inventory.{json,md}` | 组件与运行时样式盘点（95 块/1,560 style/JS 默认值/命名冲突） |
| `audit/design-tokens/audit.json` + `baseline-design-tokens.json` | token 审计报告与存量基线 |
| `audit/design-migration/before/` | 改造前 12 页 ×2 视口截图 + metrics.json |
| `audit/design-migration/after/` | 改造后截图 + metrics.json |
| `audit/design-migration/REGRESSION.md` | before/after 计算样式对比与回归清单 |
| `audit/design-migration/migrate-apply.{md,json}` | 迁移统计（6,955 处替换明细/按 token 统计/无法映射值） |
