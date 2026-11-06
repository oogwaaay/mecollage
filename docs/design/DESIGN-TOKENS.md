# MeCollage Design Tokens 规范（v1.0）

> 状态：**v1.0.0 / 2026-11-06 / 分支 `docs/design-tokens`（C1 文档+工具类变更，尚未合并）**
> 适用范围：全站（拼图编辑器、4 个工具页、专题页、博客、多语言副本、404）
> 单一事实源：[`assets/css/design-tokens.css`](../../assets/css/design-tokens.css)（273 个 `--mc-*` token）
> 配套文件：[组件配方](COMPONENT-RECIPES.md) · [页面规律与统一报告](PAGE-PATTERNS.md) · [交互审计与 Apple 式改进建议](INTERACTION-AUDIT.md) · [可视化预览页](token-preview.html) · [审计脚本](../../scripts/design-audit/run-token-audit.mjs) · [ADR-0006](../decisions/ADR-0006-design-token-single-source.md) · [教训 L-20261106-30](../lessons/L-20261106-30-design-values-hardcoded-and-drift.md)
> 治理：[AGENTS.md](../../AGENTS.md) 硬规则 H2/H7；[GOVERNANCE.md](../../GOVERNANCE.md) C1/C2 分级

---

## 0. 30 秒版（新页面/新功能直接照做）

1. 新页面 `<head>` 里按顺序引入：字体 → Font Awesome → 两个既有 bundle → **`/assets/css/design-tokens.css`** → 页面内联 `<style>`（越靠后越优先，见 §4.1）。
2. **只允许**写 `var(--mc-*)`；禁止再出现裸 `#hex` / `rgba()` / 裸 `font-size` / 裸 `border-radius` / 裸 `rgba(0,0,0,x)` 背景。
3. 组件优先用 Tier 2 语义 token（`--mc-surface-*`、`--mc-text-*`、`--mc-card-*`、`--mc-button-*` 等），原始色只用于装饰/渐变。
4. 需要新的颜色/尺寸 → **先提案**：在 `design-tokens.css` 加 token + 在本文件加表格行 + 说明用途，再写组件；不允许在页面里临时造值。
5. 改完必须跑：
   ```bash
   node scripts/design-audit/run-token-audit.mjs --check-docs
   ```
   PASS 才能进 Preview；新代码的任何 token 外值都会 FAIL（存量债务由基线记录，见 §9）。
6. 多语言页面必须 5 份一起改（`/`、`/zh/`、`/tw/`、`/ja/`、`/es/`），head 的 title/description/hreflang 同步——这是本项目最大的漂移来源（L-02）。
7. 需要跨页面复用的组件样式，不要复制进每个 HTML 的内联 `<style>`；放到 `assets/css/components.css`（G1 阶段创建）并在页面引用。**禁止**把 24KB 内联样式块复制 5 份。
8. 本文件与 token 文件不一致时，以 `design-tokens.css` 为准，并立即修文档（`--check-docs` 会失败）。

---

## 1. 设计语言与事实基线

### 1.1 视觉原则（从现有线上样式归纳，不是新设计）

| # | 原则 | 具体表现 |
|---|---|---|
| 1 | **壁纸 + 深色玻璃** | 全站固定壁纸（`/wallImage.webp`）+ 云/树/太阳/飞鸟装饰层；所有内容放在半透明黑玻璃卡片上，`backdrop-filter: blur(...)` |
| 2 | **薄荷绿是品牌强调色** | `#8fd68f` 是出现频率最高的颜色（CSS 产物中 52 次），用于标题、链接、激活态、描边、品牌底 |
| 3 | **大圆角 + 柔和深阴影** | 面板 30px、卡片 20px、控件 12px、胶囊 999px；阴影为大范围低不透明度黑色投影 |
| 4 | **文字自带阴影保证可读** | 玻璃叠在壁纸上，正文/标题都带 `text-shadow`；标题用深色投影 + 薄荷绿 |
| 5 | **小幅度动效** | hover 位移 1–5px、缩放 1.02–1.1；时长 0.15–0.5s；没有大幅弹跳/旋转 |

> 结论：**不要发明新的视觉语言**。新页面看起来应该和 `/`、`/tools/square/`、`/blog/` 是同一套东西。

### 1.2 事实基线（2026-11-06 实测，命令可复现）

| 项 | 事实 | 取证方式 |
|---|---|---|
| 站点 HTML | **95 个**（root 15 + blog 9 + tools 4 + 本地化 67） | `git ls-files '*.html' \| wc -l` |
| 外部 CSS 产物 | 3 个：`assets/index-vAuRGWiM.css`（59,487B，单行压缩）、`assets/pages-C2UaL6ML.css`（16,733B）、`assets/css/i18n.css`（1,415B）。**pages bundle 与 index bundle 重复**：pages 的 121/121 条规则经归一后都存在于 index，但仍有 66 页额外加载 pages（重复下载） | `wc -c assets/*.css assets/css/*.css`；`audit/design-tokens/css-inventory.json` |
| CSS 无源码 | 两个 bundle 是压缩构建产物，仓库内**没有源 SCSS/Less/入口**，`git log` 只有 deploy 提交；不能重新生成 | `git log --oneline -- assets/index-vAuRGWiM.css` |
| 引用情况 | **54** 页引用两个 bundle；**41** 页（root 9 + 每种语言 8）完全不引用 bundle，样式全在页面内联 `<style>`；**54** 页引用 i18n.css | `grep -l ... $(git ls-files '*.html') \| wc -l` |
| 内联 CSS 体量 | **664,467 B** / 95 个 `<style>` 块 / 14,366 条声明；归一化后只有 **31 个不同版本**（去重 166,852B）；**1,560** 个 `style=""` 属性 | `audit/design-tokens/{css,ui}-inventory.md` |
| 内联块重复 | index 的 24,855B 块复制 **5 份**（5 语言）；4 个工具页各复制 **5 份**；about/contact 复制 5 份；privacy/terms 各 5 份组成 **10×5,020B** 共享块；blog 文章共享 4×5,537B 块；共 27 个页面族（17 族 ×5 语言副本） | 附录 A；`audit/design-tokens/ui-inventory.md` §2 |
| 旧 CSS 变量 | bundle `:root` 定义 **22 个**旧变量，全站仅 **34 处** `var()` 引用；大量样式直接写死值 | `grep -oE 'var\\(--' ... \| wc -l` |
| 颜色硬编码 | 颜色类声明 5,083 条中 **4,657 条（91.6%）是字面色值**，纯 `var()` 仅 28 条；全量语料 **4,832 处 / 239 个写法 / 225 个等价组**；token 化后仍有 **334 处** 在 token 外（R2 Phase 1 清理后；基线见 §9.4） | `css-inventory.md` §2；`run-token-audit.mjs` 基线 |
| 断点 | 实际主断点只有两个：**768px（61 处 / 56 文件）** 与 **992px（30 处 / 25 文件，工具页等内联块）**；bundle 里的 960/1024/1280/600 各仅 1 处（遗留）；无 576/1200 | `grep -oE '@media[^{]+'`；`css-inventory.md` §6 |
| 404 页 | 独立主题：实底深色 `#101512` + 薄荷绿，≈2KB 内联样式，不引用任何 bundle | `404.html` |
| i18n.css 冲突 | 54 页都在 bundle **之后**加载 i18n.css；其 10/10 条规则均不在 index bundle 中，`.lang-selector-toggle/.lang-menu/.lang-option` 与 bundle 同名但值不同（#333 深灰 / 4px 圆角 / z-index 1000 vs 玻璃 / 999px 胶囊 / z-index 50）→ **最后一层加载，疑似覆盖新 pill 样式**，尚未做渲染验证 | 见 §8.4；`css-inventory.md` §9 |

### 1.3 G1 统一改造结果（2026-11-06，本分支已执行、未部署）

| 指标 | 改造前 | 改造后 |
|---|---:|---:|
| 接入 tokens/components 的页面 | 0 | **94**（`404.html` 保持独立实底主题） |
| HTML 中 `var(--mc-*)` 引用 | 0 | **6,955** |
| HTML 内联样式里的颜色字面量 | 5,064 | **245**（−95.2%） |
| 精确等价 token 化 | — | 颜色 4,248 / font-size 1,006 / 圆角 731 / 模糊 439 / 整段阴影 531 |
| `<head>` 内游离 CSS 文本（历史 bug） | 29 页 | **0**（已删除，背景层由 components.css 统一提供） |
| token 审计 | 无 | **PASS**（新增漂移 0；存量债务基线化） |
| 功能回归 / SEO harness | — | **52 PASS / 0 FAIL / 1 WARN**；**32 PASS / 0 FAIL / 0 WARN** |
| 移动端横向溢出 | 390px：7 页（最大 +218px）；320px：30 页（各 +11px） | **0 / 94 页**（390/360/320/1440 全量扫描）；壁纸层在可滚动范围完整 |
| 视觉回归复核 | — | **无新增回归**（R1–R5 已修：移动溢出清零、旧容器宽度恢复、CTA 居中、表格对齐还原、移动 h2 24px；404 控制组 0.000%） |

详见 [`PAGE-PATTERNS.md`](PAGE-PATTERNS.md) §11 与 `audit/design-migration/`。

### 1.4 为什么必须 token 化（问题不是"不够好看"，而是"会继续漂"）

- 同一语义有 2–4 个值：标题绿 `#8fd68f` / `#66BB6A`；面板圆角 20/24/30px；按钮圆角 12/14/20px；正文白 0.85/0.88/0.9/0.95。
- 根目录旧 [`design-system.md`](../../design-system.md) 与代码**不一致**：它声明 47 个变量，其中 **42 个在产物 CSS 中从未定义**；5 个同名不同值（如它写 `--primary-color: #8fd68f`，产物 `:root` 是 `#4A90E2` 蓝；它写断点 576/768/992/1200，实际主断点是 768/992）；它的圆角 8/12/20/30 也与实际的 6/10/14/15/16/18/24/50/999 不符。该文件已被 `.vercelignore` 排除、未部署，但会误导后续会话。
- 多语言复制 + 内联样式复制，使"改一处"变成"改 5 处甚至 10 处"；没有构建/模板兜底。
- 没有 token 前，新页面作者只能"抄最近的页面"，于是继续复制、继续漂。

---

## 2. 分层与命名规则

### 2.1 三层结构

| 层 | 例子 | 谁可以用 | 规则 |
|---|---|---|---|
| **Tier 1 原始值** | `--mc-green-300`、`--mc-slate-500`、`--mc-blue-500` | 仅装饰/渐变/图形 | 不直接表达语义；组件里出现原始色必须能说明原因（如"专题页主题色"） |
| **Tier 2 语义值** | `--mc-surface-2`、`--mc-text-body`、`--mc-border-brand`、`--mc-shadow-e3`、`--mc-font-size-h2` | **新代码默认使用** | 语义代表用途，不绑定具体值；换主题/调色只改 Tier 1/2 |
| **Tier 3 组件值** | `--mc-card-bg`、`--mc-panel-radius`、`--mc-button-primary-bg` | 组件实现使用 | 只收跨页面复用且需要固定组合的组件（卡片/面板/按钮/输入/聚焦环） |

### 2.2 命名规则

```
--mc-{类别}-{语义}[-{变体}]
```

- 类别固定：`green|blue|purple|orange|yellow|pink|white|slate|ink|black`（原始色）
  / `surface|text|border|shadow|blur|font|space|radius|duration|ease|lift|z|container|bp`（语义/尺度）
  / `card|panel|button|input|focus|overlay|gradient|card-title…`。
- 变体限定词只用：`subtle|strong|hover|active|solid|compact|inverse|on-brand|wash|haze|tint`。
- **禁止**：一个 token 两种语义（本文件修正过一例：字号与文字色都叫 `--mc-text-body`，已拆为 `--mc-text-body` 颜色 / `--mc-font-size-body` 字号）；禁止用旧变量名 `--primary-color` 等作为新 token 别名。
- 新增 token 必须有：用途注释（CSS 内）+ 本文件表格行 + 至少一个使用点（或标注 `@deprecated` 的替代关系）。

### 2.3 本版规模（273 个）

| 组 | 数量 | 组 | 数量 |
|---|---:|---|---:|
| 原始色 | 32 | 阴影 | 12 |
| 语义色/表面/边框/渐变/叠加控件 | 85 | 动效 | 13 |
| 字体/字号/行高/字距 | 34 | 布局/断点 | 14 |
| 间距 | 18 | 层级 | 10 |
| 圆角 | 15 | 组件 token | 35 |
| 模糊 | 5 | **合计** | **273** |

---

## 3. Token 总表（273）

> 值列：能直接给出的给值；`var(--mc-*)` 表示引用其他 token（解析后的最终值以浏览器计算值为准）。
> 表中 token 必须与 `design-tokens.css` 完全一致（`--check-docs` 校验）；本表由 token 文件自动生成，改 token 后重新生成。

### 品牌绿（薄荷绿系）

| Token | 值 | 用途 |
|---|---|---|
| `--mc-green-100` | `#e5ffe5` | 薄荷绿上的浅色文字 |
| `--mc-green-300` | `#8fd68f` | 品牌主色（全站出现频率最高的颜色） |
| `--mc-green-400` | `#66bb6a` | 品牌 hover / 成功态 |
| `--mc-green-500` | `#4caf50` | 品牌深色 / 渐变终点 |
| `--mc-green-600` | `#7cb342` | 装饰绿 |
| `--mc-green-700` | `#388e3c` | 深绿描边 / 阴影 |
| `--mc-green-900` | `#0b2e1b` | 浅绿底上的深色文字 |
| `--mc-green-950` | `#0f2410` | 更深文字（upload CTA 等） |

### 功能蓝

| Token | 值 | 用途 |
|---|---|---|
| `--mc-blue-400` | `#87ceeb` | 天空蓝装饰 |
| `--mc-blue-300` | `#b0e0e6` | 浅天空蓝装饰 |
| `--mc-blue-500` | `#4a90e2` | 主操作按钮 |
| `--mc-blue-600` | `#357abd` | 主操作按钮 hover |

### 点缀色

| Token | 值 | 用途 |
|---|---|---|
| `--mc-purple-400` | `#ba68c8` | 点缀色：徽章 / 图标 / 插画层 |
| `--mc-purple-600` | `#9c27b0` |  |
| `--mc-orange-400` | `#ff8c42` |  |
| `--mc-orange-600` | `#ff6b35` |  |
| `--mc-yellow-400` | `#ffd700` |  |
| `--mc-pink-300` | `#ffb6c1` |  |

### 中性色

| Token | 值 | 用途 |
|---|---|---|
| `--mc-white` | `#ffffff` | 中性色 |
| `--mc-white-soft` | `#f9fbff` | 旧 bundle 的 --text-primary |
| `--mc-slate-100` | `#f1f5f9` | 浅色占位块底 |
| `--mc-slate-200` | `#e2e8f0` | 浅色占位块描边 |
| `--mc-slate-400` | `#94a3b8` | 浅色占位块图标 |
| `--mc-slate-500` | `#64748b` | 浅色占位块文字 |
| `--mc-ink-900` | `#111827` | toast 深色底 |
| `--mc-ink-950` | `#141414` | <select> option 深色底 |
| `--mc-black` | `#000000` |  |

### 实底深色主题

| Token | 值 | 用途 |
|---|---|---|
| `--mc-solid-bg` | `#101512` | 实底深色主题（404 页面在用；玻璃主题之外的例外） |
| `--mc-solid-text` | `#f2f7f3` |  |
| `--mc-solid-text-secondary` | `#cfe8d1` |  |
| `--mc-solid-text-muted` | `#b9c9bc` |  |
| `--mc-solid-text-faint` | `#93a497` |  |

### 背景 / 玻璃表面

| Token | 值 | 用途 |
|---|---|---|
| `--mc-surface-canvas` | `transparent` | body 本身透明，背景由壁纸层提供 |
| `--mc-surface-0` | `rgba(0, 0, 0, 0.20)` | 上传区 / 轻量凹槽 |
| `--mc-surface-1` | `rgba(0, 0, 0, 0.25)` | 卡片、侧栏 |
| `--mc-surface-2` | `rgba(0, 0, 0, 0.30)` | 面板、工具导航、FAQ 项 |
| `--mc-surface-3` | `rgba(0, 0, 0, 0.35)` | 预览区、输入框、设置卡片 |
| `--mc-surface-4` | `rgba(0, 0, 0, 0.40)` | 上传区、强调面板 |
| `--mc-surface-hover` | `rgba(0, 0, 0, 0.35)` | 卡片 hover |
| `--mc-surface-inverse` | `rgba(255, 255, 255, 0.06)` | 浅色玻璃（浅色 CTA 卡） |
| `--mc-surface-inverse-hover` | `rgba(255, 255, 255, 0.12)` |  |
| `--mc-surface-inverse-strong` | `rgba(255, 255, 255, 0.15)` | quick-link 底 |
| `--mc-surface-toast` | `rgba(17, 24, 39, 0.95)` |  |
| `--mc-surface-menu` | `rgba(17, 24, 39, 0.72)` | 语言/下拉菜单浮层（比 toast 略透明） |
| `--mc-surface-scrim` | `rgba(6, 10, 8, 0.38)` | 壁纸压暗层：保证固定壁纸上的文字对比度 |
| `--mc-surface-solid` | `var(--mc-solid-bg)` |  |

### 文字色

| Token | 值 | 用途 |
|---|---|---|
| `--mc-text-primary` | `#ffffff` | 导航 / 标题 / 深底上的强调 |
| `--mc-text-body` | `rgba(255, 255, 255, 0.90)` | 正文 |
| `--mc-text-secondary` | `rgba(255, 255, 255, 0.85)` | 次级正文 |
| `--mc-text-muted` | `rgba(255, 255, 255, 0.70)` | 辅助说明 |
| `--mc-text-faint` | `rgba(255, 255, 255, 0.50)` | placeholder / 禁用提示 |
| `--mc-text-tertiary` | `rgba(255, 255, 255, 0.80)` | 卡片描述 / 工具按钮 |
| `--mc-text-emphasis` | `rgba(255, 255, 255, 0.95)` | 次级标题 / FAQ 问题 |
| `--mc-text-on-brand` | `var(--mc-green-900)` | 浅绿底上的文字 |
| `--mc-text-on-brand-strong` | `var(--mc-green-950)` |  |
| `--mc-text-on-brand-soft` | `rgba(0, 0, 0, 0.80)` | 浅绿圆形按钮上的深色图标 |
| `--mc-text-heading` | `var(--mc-green-300)` | 页面标题 / 小节标题的薄荷绿 |
| `--mc-text-link` | `var(--mc-green-300)` |  |
| `--mc-text-link-hover` | `var(--mc-green-400)` |  |
| `--mc-text-solid` | `var(--mc-solid-text)` |  |
| `--mc-text-solid-secondary` | `var(--mc-solid-text-secondary)` |  |
| `--mc-text-solid-muted` | `var(--mc-solid-text-muted)` |  |
| `--mc-text-solid-faint` | `var(--mc-solid-text-faint)` |  |

### 边框色

| Token | 值 | 用途 |
|---|---|---|
| `--mc-border-subtle` | `rgba(255, 255, 255, 0.10)` | 分隔线、弱描边 |
| `--mc-border` | `rgba(255, 255, 255, 0.18)` | 玻璃卡片默认描边 |
| `--mc-border-input` | `rgba(255, 255, 255, 0.20)` | 输入框 / 图标按钮 |
| `--mc-border-strong` | `rgba(255, 255, 255, 0.25)` | pill / 强调描边 |
| `--mc-border-brand-subtle` | `rgba(143, 214, 143, 0.25)` |  |
| `--mc-border-brand` | `rgba(143, 214, 143, 0.40)` |  |
| `--mc-border-brand-strong` | `rgba(143, 214, 143, 0.60)` |  |
| `--mc-border-brand-solid` | `#8fd68f` | 虚线 dropzone / 强强调 |
| `--mc-border-brand-heavy` | `rgba(143, 214, 143, 0.80)` | 拖拽 / 激活强描边 |
| `--mc-border-success-strong` | `rgba(76, 175, 80, 0.80)` | 拖拽完成态描边 |
| `--mc-border-track` | `rgba(255, 255, 255, 0.30)` | 滑块轨道 / 弱分隔 |

### 边框宽度

| Token | 值 | 用途 |
|---|---|---|
| `--mc-border-width` | `1px` | 边框（Border） |
| `--mc-border-width-strong` | `2px` |  |

### 品牌 / 操作 / 状态

| Token | 值 | 用途 |
|---|---|---|
| `--mc-color-brand` | `#8fd68f` | 品牌 / 操作 / 状态 |
| `--mc-color-theme-accent` | `var(--mc-color-brand)` |  |
| `--mc-color-brand-hover` | `#66bb6a` |  |
| `--mc-color-brand-active` | `#4caf50` |  |
| `--mc-color-brand-contrast` | `#0b2e1b` |  |
| `--mc-color-brand-wash` | `rgba(143, 214, 143, 0.10)` | 极浅底 |
| `--mc-color-brand-haze` | `rgba(143, 214, 143, 0.15)` | drag-over / 表列底 |
| `--mc-color-brand-tint` | `rgba(143, 214, 143, 0.20)` | hover 底 |
| `--mc-color-brand-tint-strong` | `rgba(143, 214, 143, 0.30)` | active / 选中底 |
| `--mc-color-action` | `var(--mc-blue-500)` |  |
| `--mc-color-action-hover` | `var(--mc-blue-600)` |  |
| `--mc-color-success` | `var(--mc-green-400)` |  |
| `--mc-color-success-hover` | `var(--mc-green-500)` |  |
| `--mc-color-danger` | `#ef4444` | 删除 / 危险操作（画布控件） |
| `--mc-color-info` | `var(--mc-blue-500)` | 信息态（toast info / 帮助提示） |
| `--mc-color-warning` | `var(--mc-orange-400)` | 警告态（toast warning / 限制提示） |
| `--mc-color-focus` | `rgba(143, 214, 143, 0.50)` | focus ring |
| `--mc-color-focus-contrast` | `rgba(255, 255, 255, 0.60)` |  |
| `--mc-color-selection` | `rgba(143, 214, 143, 0.30)` | 文本选中（新增，此前未定义） |

### 渐变

| Token | 值 | 用途 |
|---|---|---|
| `--mc-gradient-brand` | `linear-gradient(135deg, rgba(143, 214, 143, 0.45) 0%, rgba(102, 187, 106, 0.70) 100%)` | 渐变（Gradients） |
| `--mc-gradient-action` | `linear-gradient(135deg, #4a90e2 0%, #357abd 100%)` |  |
| `--mc-gradient-action-hover` | `linear-gradient(135deg, #357abd 0%, #4a90e2 100%)` |  |
| `--mc-gradient-success` | `linear-gradient(135deg, #66bb6a 0%, #4caf50 100%)` |  |
| `--mc-gradient-success-hover` | `linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)` |  |
| `--mc-gradient-step` | `linear-gradient(135deg, #4a90e2 0%, #4caf50 100%)` |  |
| `--mc-gradient-title` | `linear-gradient(135deg, #4a90e2 0%, #66bb6a 50%, #ba68c8 100%)` |  |
| `--mc-gradient-badge-orange` | `linear-gradient(135deg, #ff8c42 0%, #ff6b35 100%)` |  |
| `--mc-gradient-badge-green` | `linear-gradient(135deg, #66bb6a 0%, #4caf50 100%)` |  |
| `--mc-gradient-badge-blue` | `linear-gradient(135deg, #4a90e2 0%, #357abd 100%)` |  |
| `--mc-gradient-badge-purple` | `linear-gradient(135deg, #ba68c8 0%, #9c27b0 100%)` |  |

### 光面叠加控件

| Token | 值 | 用途 |
|---|---|---|
| `--mc-overlay-control-bg` | `rgba(255, 255, 255, 0.95)` | 白色圆形按钮 |
| `--mc-overlay-control-text` | `var(--mc-slate-500)` |  |
| `--mc-overlay-control-danger` | `var(--mc-color-danger)` |  |
| `--mc-overlay-placeholder-bg` | `var(--mc-slate-100)` | 空图片格占位 |
| `--mc-overlay-placeholder-border` | `var(--mc-slate-200)` |  |
| `--mc-overlay-placeholder-text` | `var(--mc-slate-400)` |  |
| `--mc-overlay-placeholder-text-hover` | `var(--mc-slate-500)` |  |
| `--mc-overlay-dot` | `var(--mc-slate-500)` | 拖拽手柄白点 |

### 文字阴影

| Token | 值 | 用途 |
|---|---|---|
| `--mc-text-shadow-body` | `1px 1px 3px rgba(0, 0, 0, 0.40)` | 文字阴影（玻璃主题下保证可读性，属于视觉规范而非装饰） |
| `--mc-text-shadow-heading` | `2px 2px 6px rgba(0, 0, 0, 0.50)` |  |
| `--mc-text-shadow-display` | `3px 3px 12px rgba(0, 0, 0, 0.60), 0 0 30px rgba(0, 0, 0, 0.40)` |  |

### 字体族 / 字重

| Token | 值 | 用途 |
|---|---|---|
| `--mc-font-sans` | `'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,` | 字体（Typography） |
| `--mc-font-weight-regular` | `400` |  |
| `--mc-font-weight-medium` | `500` |  |
| `--mc-font-weight-semibold` | `600` |  |
| `--mc-font-weight-bold` | `700` |  |

### 字号

| Token | 值 | 用途 |
|---|---|---|
| `--mc-font-size-display` | `3.5rem` | 56px — hero 主标题 |
| `--mc-font-size-h1` | `2.5rem` | 40px — 页面标题（桌面） |
| `--mc-font-size-h1-compact` | `2rem` | 32px — 页面标题（移动端） |
| `--mc-font-size-h2` | `1.8rem` | 28.8px — 区块标题 |
| `--mc-font-size-h3` | `1.4rem` | 22.4px — 卡片 / 步骤标题 |
| `--mc-font-size-h4` | `1.2rem` | 19.2px — 小标题 |
| `--mc-font-size-lead` | `1.1rem` | 17.6px — 文章正文 / 引导语 |
| `--mc-font-size-body` | `1rem` | 16px |
| `--mc-font-size-body-sm` | `0.95rem` | 15.2px |
| `--mc-font-size-label` | `0.9rem` | 14.4px — 按钮 / 标签 |
| `--mc-font-size-caption` | `0.85rem` | 13.6px — 辅助信息 |
| `--mc-font-size-xs` | `0.8rem` | 12.8px — 角标 / tag |
| `--mc-font-size-2xs` | `0.75rem` | 12px — 最小尺寸 |
| `--mc-font-size-h2-sm` | `1.6rem` | 25.6px — CTA / 小号区块标题 |
| `--mc-font-size-h3-lg` | `1.5rem` | 24px — 工具页设置标题 / 步骤数字 |
| `--mc-font-size-card-title` | `1.3rem` | 20.8px — 卡片标题 |
| `--mc-font-size-xl` | `1.25rem` | 20px — 工具页控件 |
| `--mc-font-size-lg` | `1.125rem` | 18px — 大号正文 |
| `--mc-font-size-label-sm` | `0.875rem` | 14px — 工具页标签（px 值与 .875rem 等价） |
| `--mc-font-size-icon` | `3rem` | 48px — 功能图标 |
| `--mc-font-size-icon-lg` | `4rem` | 64px — 上传区图标 |

### 行高 / 字距

| Token | 值 | 用途 |
|---|---|---|
| `--mc-leading-tight` | `1.2` | 大标题 |
| `--mc-leading-snug` | `1.5` | 卡片 / 表单 |
| `--mc-leading-normal` | `1.6` | 正文默认 |
| `--mc-leading-relaxed` | `1.8` | 博客长文 |
| `--mc-tracking-tight` | `-0.02em` | 大标题 |
| `--mc-tracking-normal` | `0` | 正文 |
| `--mc-tracking-wide` | `0.02em` | 按钮 / 标签 |
| `--mc-tracking-wider` | `0.03em` | 语言切换等小控件 |

### 间距

| Token | 值 | 用途 |
|---|---|---|
| `--mc-space-1` | `0.25rem` | 4px |
| `--mc-space-2` | `0.5rem` | 8px |
| `--mc-space-3` | `0.75rem` | 12px |
| `--mc-space-4` | `1rem` | 16px |
| `--mc-space-5` | `1.25rem` | 20px |
| `--mc-space-6` | `1.5rem` | 24px |
| `--mc-space-8` | `2rem` | 32px |
| `--mc-space-10` | `2.5rem` | 40px |
| `--mc-space-12` | `3rem` | 48px |
| `--mc-space-16` | `4rem` | 64px |
| `--mc-space-page-x` | `var(--mc-space-8)` | .page-content 左右内边距（桌面） |
| `--mc-space-page-x-compact` | `var(--mc-space-4)` | 移动端 |
| `--mc-space-panel` | `var(--mc-space-12)` | 大玻璃面板内边距 |
| `--mc-space-panel-compact` | `var(--mc-space-6)` |  |
| `--mc-space-card` | `var(--mc-space-8)` | 卡片内边距 |
| `--mc-space-section` | `var(--mc-space-8)` | 区块间距 |
| `--mc-space-stack` | `var(--mc-space-4)` | 元素纵向间距 |
| `--mc-space-inline` | `var(--mc-space-2)` | 行内元素间距 |

### 圆角

| Token | 值 | 用途 |
|---|---|---|
| `--mc-radius-xs` | `6px` | 圆角（Radius） |
| `--mc-radius-sm` | `8px` |  |
| `--mc-radius-md` | `12px` |  |
| `--mc-radius-lg` | `16px` |  |
| `--mc-radius-xl` | `20px` |  |
| `--mc-radius-2xl` | `24px` |  |
| `--mc-radius-3xl` | `30px` |  |
| `--mc-radius-pill` | `999px` |  |
| `--mc-radius-circle` | `50%` |  |
| `--mc-radius-control` | `var(--mc-radius-md)` | 按钮 / 输入框 |
| `--mc-radius-card` | `var(--mc-radius-xl)` | 内容卡片 |
| `--mc-radius-item` | `var(--mc-radius-lg)` | FAQ / 列表项 |
| `--mc-radius-tag` | `10px` | 标签 / 小徽章 |
| `--mc-radius-panel` | `var(--mc-radius-3xl)` | 页面级大面板 |
| `--mc-radius-sidebar` | `var(--mc-radius-2xl)` | 侧边栏 |

### 模糊

| Token | 值 | 用途 |
|---|---|---|
| `--mc-blur-xs` | `5px` | 导航 pill 背后的轻模糊 |
| `--mc-blur-sm` | `6px` | 小控件 |
| `--mc-blur-md` | `8px` | 导航 / 菜单 / 副标题胶囊 |
| `--mc-blur-lg` | `10px` | 卡片 / 下拉菜单 |
| `--mc-blur-xl` | `18px` | 大面板 / 侧栏 / 画布（标准玻璃层） |

### 阴影

| Token | 值 | 用途 |
|---|---|---|
| `--mc-shadow-e1` | `0 4px 12px rgba(0, 0, 0, 0.20)` | 列表项 hover |
| `--mc-shadow-e2` | `0 10px 35px rgba(0, 0, 0, 0.28)` | 卡片 / 上传区 |
| `--mc-shadow-e3` | `0 12px 40px rgba(0, 0, 0, 0.30)` | 标准卡片 |
| `--mc-shadow-e4` | `0 20px 60px rgba(0, 0, 0, 0.35)` | 页面级面板 |
| `--mc-shadow-e5` | `0 18px 48px rgba(0, 0, 0, 0.40)` | 面板 hover / 浮层 |
| `--mc-shadow-toast` | `0 6px 18px rgba(0, 0, 0, 0.25)` |  |
| `--mc-shadow-inset` | `inset 0 2px 6px rgba(0, 0, 0, 0.40)` | 内嵌输入框 |
| `--mc-shadow-brand` | `0 8px 24px rgba(143, 214, 143, 0.30)` | 绿色 CTA / drag-over |
| `--mc-shadow-brand-strong` | `0 12px 32px rgba(143, 214, 143, 0.40)` | drag-over 激活 |
| `--mc-shadow-overlay-1` | `0 2px 8px rgba(0, 0, 0, 0.15)` | 画布白色控件 |
| `--mc-shadow-overlay-2` | `0 4px 12px rgba(0, 0, 0, 0.15)` |  |
| `--mc-shadow-overlay-3` | `0 3px 12px rgba(0, 0, 0, 0.20)` |  |

### 动效

| Token | 值 | 用途 |
|---|---|---|
| `--mc-duration-fast` | `0.15s` | 统一使用 ease；玻璃主题的动作幅度小（1–5px） |
| `--mc-duration-base` | `0.20s` |  |
| `--mc-duration-medium` | `0.25s` |  |
| `--mc-duration-slow` | `0.30s` |  |
| `--mc-duration-slower` | `0.50s` |  |
| `--mc-ease` | `ease` |  |
| `--mc-ease-in-out` | `ease-in-out` |  |
| `--mc-lift-1` | `-1px` |  |
| `--mc-lift-2` | `-2px` |  |
| `--mc-lift-3` | `-3px` |  |
| `--mc-lift-5` | `-5px` |  |
| `--mc-press-scale` | `1.02` | drag-over 放大 |
| `--mc-hover-scale` | `1.1` | 删除按钮等图标 hover |

### 布局 / 断点

| Token | 值 | 用途 |
|---|---|---|
| `--mc-container-content` | `1200px` | 内容页 / 工具页容器 |
| `--mc-container-app` | `1800px` | 拼图编辑器三栏布局 |
| `--mc-container-narrow` | `800px` | 说明文案 / 404 |
| `--mc-container-404` | `720px` |  |
| `--mc-sidebar-width` | `320px` | 编辑器左侧栏 |
| `--mc-sidebar-width-min` | `240px` | 1280px 以下收缩 |
| `--mc-tool-panel-width` | `300px` | 工具页设置面板 |
| `--mc-editor-grid-gap` | `var(--mc-space-6)` |  |
| `--mc-bp-sm` | `600px` |  |
| `--mc-bp-md` | `768px` | 主断点（全站 61 处） |
| `--mc-bp-tool` | `992px` | 工具页/内联块移动断点（30 处，与 bundle 的 960 并存） |
| `--mc-bp-lg` | `960px` |  |
| `--mc-bp-xl` | `1024px` |  |
| `--mc-bp-2xl` | `1280px` |  |

### 层级

| Token | 值 | 用途 |
|---|---|---|
| `--mc-z-background` | `-1` | 壁纸层 |
| `--mc-z-content` | `1` | 应用容器 |
| `--mc-z-decor` | `2` | 背景装饰层 |
| `--mc-z-toolbar` | `5` | 画布工具条 |
| `--mc-z-dropdown` | `50` | 语言 / 下拉菜单 |
| `--mc-z-nav` | `100` | 顶部导航（sticky） |
| `--mc-z-overlay` | `150` | 画布全屏模式 |
| `--mc-z-fab` | `200` | 返回顶部 |
| `--mc-z-modal` | `999` | 模态 / 菜单遮罩（i18n.css 现有值） |
| `--mc-z-toast` | `9999` | 全局 toast |

### 组件 token

| Token | 值 | 用途 |
|---|---|---|
| `--mc-glass-backdrop` | `var(--mc-blur-xl)` | docs/design/COMPONENT-RECIPES.md |
| `--mc-card-bg` | `var(--mc-surface-1)` |  |
| `--mc-card-border` | `var(--mc-border-width) solid var(--mc-border)` |  |
| `--mc-card-radius` | `var(--mc-radius-card)` |  |
| `--mc-card-shadow` | `var(--mc-shadow-e3)` |  |
| `--mc-card-shadow-hover` | `var(--mc-shadow-e5)` |  |
| `--mc-card-padding` | `var(--mc-space-card)` |  |
| `--mc-card-blur` | `var(--mc-blur-lg)` |  |
| `--mc-panel-bg` | `var(--mc-surface-2)` |  |
| `--mc-panel-border` | `var(--mc-border-width) solid var(--mc-border)` |  |
| `--mc-panel-radius` | `var(--mc-radius-panel)` |  |
| `--mc-panel-shadow` | `var(--mc-shadow-e4)` |  |
| `--mc-panel-padding` | `var(--mc-space-panel)` |  |
| `--mc-button-radius` | `var(--mc-radius-control)` |  |
| `--mc-button-font-weight` | `var(--mc-font-weight-semibold)` |  |
| `--mc-button-primary-bg` | `var(--mc-gradient-action)` |  |
| `--mc-button-primary-bg-hover` | `var(--mc-gradient-action-hover)` |  |
| `--mc-button-success-bg` | `var(--mc-gradient-success)` |  |
| `--mc-button-success-bg-hover` | `var(--mc-gradient-success-hover)` |  |
| `--mc-button-secondary-bg` | `var(--mc-surface-4)` |  |
| `--mc-button-secondary-border` | `var(--mc-border-width) solid var(--mc-border-input)` |  |
| `--mc-button-shadow` | `var(--mc-shadow-e2)` |  |
| `--mc-input-bg` | `var(--mc-surface-3)` |  |
| `--mc-input-border` | `var(--mc-border-width) solid var(--mc-border-input)` |  |
| `--mc-input-radius` | `var(--mc-radius-md)` |  |
| `--mc-input-shadow` | `var(--mc-shadow-inset)` |  |
| `--mc-input-focus-border` | `var(--mc-border-brand-strong)` |  |
| `--mc-input-focus-shadow` | `0 0 0 3px var(--mc-color-focus)` |  |
| `--mc-focus-ring-color` | `var(--mc-color-focus)` |  |
| `--mc-focus-ring-width` | `3px` |  |
| `--mc-focus-ring-offset` | `2px` |  |

### 其他

| Token | 值 | 用途 |
|---|---|---|
| `--mc-tap-target-min` | `44px` | 触控目标最小热区（Apple HIG / WCAG 2.5.5） |
| `--mc-toast-radius` | `var(--mc-radius-sm)` |  |
| `--mc-toast-max-width` | `min(92vw, 420px)` |  |
| `--mc-mobile-nav-height` | `56px` | 移动端顶栏高度 |

---

## 4. 使用规则（强制）

### 4.1 CSS 引入顺序与层叠

**本次统一改造后，存量页面的实际层叠顺序**（由迁移脚本注入，见 `docs/design/PAGE-PATTERNS.md`）：

```
index bundle → pages bundle → i18n.css（54 页，部分在 body 末尾）→ 页面内联 <style>
  → /assets/css/design-tokens.css → /assets/css/components.css
```

- `components.css` 在页面内联 `<style>` 之后加载，并用 `body` 前缀提高优先级，因此能覆盖各页 24.8KB/17KB 内联块里的旧值；对在 body 末尾加载的 `i18n.css` 同样靠优先级覆盖。
- `404.html` 保持独立实底主题，**不注入** tokens/components。

**新页面推荐顺序**：

```html
<!-- 1) 字体/图标（全站统一） -->
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
<!-- 2) 既有基础样式（复用现有 class 时） -->
<link rel="stylesheet" href="/assets/index-vAuRGWiM.css">
<link rel="stylesheet" href="/assets/pages-C2UaL6ML.css">
<!-- 3) Design tokens + 统一层（新页面必须；顺序固定） -->
<link rel="stylesheet" href="/assets/css/design-tokens.css">
<link rel="stylesheet" href="/assets/css/components.css">
<!-- 4) 页面专属样式：≤50 行，只用 token；如需覆盖统一层，用页面内联或更高优先级选择器 -->
<style>…</style>
```

规则：

1. `design-tokens.css` 必须在 `components.css` 之前（组件层依赖变量）。
2. 新页面**不要**引用 `i18n.css`（G2 会删除；语言切换用既有 bundle 的 `.lang-selector*` 结构 + `assets/js/i18n.js`）。
3. 页面内联 `<style>` 只放该页独有布局（如 `#page-works` 的 hero），颜色/字号/圆角/阴影全部用 token。
4. 永远不要用 `!important` 去压 bundle/统一层；用更具体的选择器或调整加载顺序。唯一例外是工具页 `.tool-intent-switch` 的历史内联样式（已在 components.css 内用 `!important` 收敛）。
5. 组件层已有标准类 `.mc-panel/.mc-card/.mc-input/.mc-sr-only` 可直接用于新页面。

### 4.2 颜色

| 场景 | 用 token | 说明 |
|---|---|---|
| 页面/区块标题 | `--mc-text-heading` + `--mc-text-shadow-heading` | 薄荷绿标题是全站识别度最高的元素 |
| 正文 | `--mc-text-body` | 90% 白；玻璃上必须保留 text-shadow（用 `--mc-text-shadow-body`） |
| 次级正文 / 卡片描述 | `--mc-text-secondary` / `--mc-text-tertiary` | 85% / 80% 白 |
| 辅助说明 / 占位符 | `--mc-text-muted` / `--mc-text-faint` | 70% / 50% 白 |
| 导航文字 / 强标题 | `--mc-text-primary` | 纯白 |
| 链接 / 激活态 | `--mc-text-link` → hover `--mc-text-link-hover`；底色 `--mc-color-brand-tint(-strong)` | 不要让链接和标题抢同一个视觉层级 |
| 玻璃表面层级 | 上传区/凹槽 `--mc-surface-0` → 卡片 `--mc-surface-1` → 面板 `--mc-surface-2` → 输入/预览 `--mc-surface-3` → 强调 `--mc-surface-4`；hover `--mc-surface-hover` | 层级差 = 5–10% 不透明度；不要自造 `rgba(0,0,0,x)` |
| 浅色玻璃（CTA 卡/quick-link） | `--mc-surface-inverse*` | |
| 边框 | 默认 `--mc-border`；弱分隔 `--mc-border-subtle`；输入 `--mc-border-input`；强调 `--mc-border-strong`；品牌描边 `--mc-border-brand(-strong/-heavy)` | |
| 主操作按钮 | `--mc-gradient-action`（蓝） | 历史语义：蓝色=主操作，绿色=品牌/成功；**不要**把主按钮改成绿色，除非同时改所有工具页并留 ADR |
| 成功/确认 | `--mc-gradient-success`、`--mc-color-success(-hover)` | |
| 危险操作 | `--mc-color-danger`（#ef4444） | 目前只用于画布图片删除按钮；没有 error/warning 体系（见 §10） |
| 浅绿底上的文字 | `--mc-text-on-brand` / `--mc-text-on-brand-soft` | 深绿 #0b2e1b / 80% 黑 |
| 叠加在照片上的浅色控件 | `--mc-overlay-control-bg` / `--mc-overlay-control-danger` / `--mc-overlay-placeholder-*` | 画布区域的白色圆形按钮、浅灰占位格；**不要**把玻璃 token 用到照片上（对比度不够） |
| 专题页主题色 | 页面级覆盖 `--mc-color-theme-accent`（默认=品牌绿） | 生日/婚礼/圣诞等页面当前各写一套内联色；以后统一用该变量覆盖，不要复制 5 份 |

禁止：

1. 在页面里新增 `#8fd68f`、`rgba(0,0,0,.25)` 这类裸色值（存量不算，新代码算漂移，审计会 FAIL）。
2. 用 `opacity` 代替已有 alpha token（如 `background: #000; opacity:.3`），会影响子元素。
3. 在深色玻璃上直接用灰色系文字（如 `#64748b`）——那是浅色叠加控件的文字色，不是正文色。
4. 修改 `--mc-green-300` 的品牌地位：它是 token 体系的锚点，改它等于改全站识别度，需要 ADR + 维护者批准。

### 4.3 字体与排版

| 层级 | token | 值 | 用途 |
|---|---|---|---|
| 展示标题 | `--mc-font-size-display` | 3.5rem / 700 | 首页 hero（`.ghibli-title`） |
| 页面标题 | `--mc-font-size-h1`（移动端 `--mc-font-size-h1-compact`） | 2.5rem / 2rem，700 | `.page-title` |
| 区块标题 | `--mc-font-size-h2`（小号 `--mc-font-size-h2-sm`） | 1.8rem / 1.6rem，600 | FAQ/教程/CTA |
| 卡片/步骤标题 | `--mc-font-size-h3` / `--mc-font-size-h3-lg` / `--mc-font-size-card-title` | 1.4 / 1.5 / 1.3rem，600 | |
| 小标题 | `--mc-font-size-h4` | 1.2rem，600 | |
| 正文 | `--mc-font-size-body` | 1rem，400 | |
| 长文正文 | `--mc-font-size-lead` | 1.1rem，400 | 博客正文 |
| 按钮/标签 | `--mc-font-size-label` / `--mc-font-size-label-sm` | 0.9 / 0.875rem，500–600 | |
| 辅助/角标 | `--mc-font-size-caption`、`--mc-font-size-xs`、`--mc-font-size-2xs` | 0.85 / 0.8 / 0.75rem | |

规则：

1. 字体族唯一：`--mc-font-sans`（Noto Sans SC + 系统回退）。不要新增 web font（多语言 + 性能成本）。
2. 字重只用 400/500/600/700；标题 600–700，正文 400，按钮 600。
3. 行高：大标题 `--mc-leading-tight`（1.2）；卡片/表单 `--mc-leading-snug`（1.5）；正文 `--mc-leading-normal`（1.6）；博客长文 `--mc-leading-relaxed`（1.8）。
4. 字距：大标题 `--mc-tracking-tight`（-0.02em）；按钮/标签 `--mc-tracking-wide`（0.02em）；语言切换等小控件 `--mc-tracking-wider`（0.03em）；中文正文不要加字距。
5. 玻璃主题下正文/标题必须使用对应 `--mc-text-shadow-*`；深色实底页面（如 404）可以不加。
6. 移动端字号策略：沿用现有"桌面值 + `@media (max-width: 768px)` 覆盖"的写法（与存量页面一致），移动值用 `--mc-font-size-h1-compact` 等 token。

### 4.4 间距 / 圆角 / 模糊 / 阴影 / 边框

**间距**：4px 基准阶梯，组件默认值用语义 token。

| 语义 token | 值 | 场景 |
|---|---|---|
| `--mc-space-page-x` | 2rem | 内容页左右 padding（移动端 `--mc-space-page-x-compact`=1rem） |
| `--mc-space-panel` | 3rem | 大玻璃面板内边距（移动端 `--mc-space-panel-compact`=1.5rem） |
| `--mc-space-card` | 2rem | 卡片内边距 |
| `--mc-space-section` | 2rem | 区块垂直间距 |
| `--mc-space-stack` | 1rem | 表单/列表纵向间距 |
| `--mc-space-inline` | 0.5rem | 行内元素间距 |

- 只允许 `--mc-space-1/2/3/4/5/6/8/10/12/16`（4/8/12/16/20/24/32/40/48/64px）。存量 0.35/0.45/0.55/0.6/0.65/0.85/1.1rem 等一律取最近阶梯（映射见 §8.2）。

**圆角**：控件 12、条目 16、卡片 20、面板 30、标签 10、胶囊 999、圆形 50%。

- 语义 token：`--mc-radius-control` / `--mc-radius-item` / `--mc-radius-card` / `--mc-radius-panel` / `--mc-radius-tag` / `--mc-radius-pill` / `--mc-radius-circle`。
- 只有装饰图形（云朵、树叶）允许百分比椭圆圆角；组件不允许 15px/50px 这类非阶梯值（存量迁移见 §8.3）。

**模糊**：玻璃层级 5 级——`--mc-blur-xl`(18) 大面板/侧栏/画布、`--mc-blur-lg`(10) 卡片/菜单、`--mc-blur-md`(8) 导航/胶囊、`--mc-blur-sm`(6)、`--mc-blur-xs`(5)。禁止 `blur(0px)` 假装玻璃；禁止 blur > 20px（性能）。

**阴影**：`--mc-shadow-e1…e5` 由浅到深：e1 列表 hover，e2 卡片/上传区，e3 标准卡片，e4 页面级面板，e5 面板 hover/浮层；另有 `--mc-shadow-toast`、`--mc-shadow-inset`（输入框）、`--mc-shadow-overlay-1…3`（照片上的浅色控件）。

- 卡片：`box-shadow: var(--mc-shadow-e3)`，hover `--mc-shadow-e5`。
- 页面级面板：`--mc-shadow-e4`。
- 不要给文字/小图标加 20px 以上大阴影；**彩色阴影只有一种例外**：品牌绿阴影，用 `--mc-shadow-brand`（CTA/上传 hover）或 `--mc-shadow-brand-strong`（drag-over 激活），其余场景一律黑色阴影。

**边框**：默认 1px `--mc-border`；强调 2px `--mc-border-width-strong`；虚线 dropzone 用 `--mc-border-width-strong dashed var(--mc-border-brand-solid)`。

### 4.4.1 壁纸层（每页必须有，固定不滚动）

| 规则 | 说明 |
|---|---|
| 标记 | 每个站点页面 `<body>` 第一个子元素必须是 `<div class="ghibli-background" aria-hidden="true"></div>`；装饰层（云/树/鸟）可留在其中，但默认 `display:none` |
| 固定 | `position: fixed; inset: 0; z-index: -1; background: url(/wallImage.webp) center/cover no-repeat`；**不允许**改成 `background-attachment: fixed` 的普通元素或滚动容器背景（移动端会随内容滚动/裁切） |
| 兜底 | `html` 必须有实底深色（`--mc-solid-bg`），杜绝壁纸加载前/首屏以下出现白底 |
| 阅读性 | `.ghibli-background::after` 加 `--mc-surface-scrim`（38% 深色）压暗壁纸；亮云区域面板背景对比度由 3.75:1 → 7.55:1，独立文本对比度采样 min 2.16 → 4.91:1、median 2.75 → 5.92:1（AA 通过）；壁纸仍保留约 62% 亮度 |
| 内容层 | 正文必须放在玻璃面板/卡片（`--mc-surface-*` + `--mc-blur-*`）上；直接铺在壁纸上的文字必须用 `--mc-text-shadow-*` 并保持短文本 |
| 例外 | `404.html` 是独立实底主题，不加载 token/统一层、无壁纸层（若未来要统一，按 C3 错误页变更单独做） |
| 禁止 | 给 `body`/`html` 设不透明背景色（会盖住壁纸）；用 `position: sticky`/大高度元素伪装壁纸；在壁纸层上绑定交互/点击；**页面产生横向溢出**（横向拖动会露出非壁纸的深色兜底） |
| 布局约束 | 移动端容器用 `width:100%`、长表格 `table-layout:fixed` + 换行、长词 `overflow-wrap:anywhere`、窄屏卡片单列；验收：320/360/390px 下 `scrollWidth === innerWidth`（见 `audit/design-migration/MOBILE-OVERFLOW.md`） |
| 验证 | 本地滚动 0/600/1500/底部，`.ghibli-background` 的计算样式必须是 `fixed` 且 rect 覆盖视口；见 `audit/design-migration/WALLPAPER.md` |

### 4.5 动效

| token | 值 | 场景 |
|---|---|---|
| `--mc-duration-fast` | 0.15s | toast、颜色过渡 |
| `--mc-duration-base` | 0.20s | 按钮、图标 |
| `--mc-duration-medium` | 0.25s | 菜单、toggle、返回顶部 |
| `--mc-duration-slow` | 0.30s | 卡片 hover、面板 |
| `--mc-duration-slower` | 0.50s | 大面板/背景层（上限） |

- 缓动统一 `--mc-ease`（ease）；只在需要对称进出时用 `--mc-ease-in-out`。
- hover 位移：`--mc-lift-1/-2/-5`；拖拽放置放大 `--mc-press-scale`(1.02)；图标 hover `--mc-hover-scale`(1.1)。
- **不要**新增超过 0.5s 的交互过渡；装饰动画（云、鸟、树叶）除外，且必须是纯 transform/opacity。
- `prefers-reduced-motion: reduce` 时 token 时长自动归 0（已在 token 文件处理）；新组件仍应避免依赖动画表达状态。
- 过渡优先写具体属性（`transition: transform var(--mc-duration-base) var(--mc-ease), box-shadow …`），禁止 `transition: all`（存量大量使用，迁移时改掉）。

### 4.6 布局与断点

| token | 值 | 用途 |
|---|---|---|
| `--mc-container-content` | 1200px | 内容页/工具页容器（`.page-content`、`.*-tool-container`） |
| `--mc-container-app` | 1800px | 编辑器三栏（`.main-content`） |
| `--mc-container-narrow` | 800px | 说明文案、404 主体 |
| `--mc-sidebar-width` | 320px | 编辑器左栏 |
| `--mc-sidebar-width-min` | 240px | 1280px 以下左栏下限 |
| `--mc-tool-panel-width` | 300px | 工具页设置面板 |
| `--mc-editor-grid-gap` | 24px | 三栏间距 |

断点（CSS 变量不能用于 `@media`，请写**字面值**并保持与下表一致）：

| 断点 token | 值 | 现有用途 |
|---|---|---|
| `--mc-bp-sm` | 600px | 编辑器细节收敛 |
| `--mc-bp-md` | 768px | **主断点**：导航/标题/卡片/工具页移动布局（实际 61 处 / 56 文件） |
| `--mc-bp-tool` | 992px | 工具页/内联块移动断点（实际 30 处 / 25 文件；与 bundle 的 960 并存） |
| `--mc-bp-lg` | 960px | 首页 quick-links 显示切换 |
| `--mc-bp-xl` | 1024px | 编辑器布局收敛 |
| `--mc-bp-2xl` | 1280px | 三栏 → 两栏 |

策略：与存量一致，**桌面优先 + `max-width` 覆盖**；不要在一个页面里混用 mobile-first（`min-width`）与 desktop-first。实际只有 768/992 两个断点承担了 94% 的响应式逻辑（768：61 处；992：30 处），960/1024/1280/600 是零散遗留；新页面优先用 768，工具页可用 992，新增其他断点需在文档登记。

### 4.7 层级（z-index）

| token | 值 | 用途 |
|---|---|---|
| `--mc-z-background` | -1 | 壁纸层 |
| `--mc-z-content` | 1 | 应用容器 |
| `--mc-z-decor` | 2 | 云/树/鸟装饰 |
| `--mc-z-toolbar` | 5 | 画布工具条 |
| `--mc-z-dropdown` | 50 | 语言/下拉菜单（**与 i18n.css 的 1000 冲突，见 §8.4**） |
| `--mc-z-nav` | 100 | sticky 导航 |
| `--mc-z-overlay` | 150 | 画布全屏 |
| `--mc-z-fab` | 200 | 返回顶部 |
| `--mc-z-modal` | 999 | 模态/遮罩 |
| `--mc-z-toast` | 9999 | 全局 toast |

规则：只能从这 10 个值里选；如果觉得"不够高"，说明层级设计有问题，先讨论。禁止 101、1000、99999 等临时值。

---

### 4.8 反馈与状态（R0，2026-11-06）

| 场景 | 规则 | token / 类 |
|---|---|---|
| 轻量反馈 | **禁止 `alert()`**；统一用 `window.mcUI.toast(message,{type})`（非阻塞、`aria-live=polite`、最多 3 条、可带 action/关闭） | `.mc-toast` 系列 + `--mc-toast-*` |
| 类型 | success / info / error / undo 四种；不要自造新颜色，边框色取自 `--mc-color-success` / `--mc-color-info` / `--mc-color-danger` / `--mc-color-brand` | `.mc-toast--*` |
| 操作反馈 | 上传完成 → toast + 滚动画布 + 焦点；导出 → 按钮禁用 + `aria-busy` + 进度提示 → 成功/失败 toast；AI → loading 文案 + 失败重试 | `mcUI.setBusy` / `mcUI.announcePhotosAdded` |
| 撤销 | 可见 Undo/Redo 按钮（`#undoBtn`/`#redoBtn`），有 disabled 态，快捷键保留；撤销/重做后给 toast | `.toolbar-btn:disabled` |
| 未保存 | 有未导出照片时 `beforeunload` 提示（i18n `beforeunload.unsaved`） | 原生 beforeunload |
| 触控 | toast 的操作/关闭按钮 ≥ `--mc-tap-target-min`（44px） |  |
| 动效 | 入场 ≤ `--mc-duration-base`；`prefers-reduced-motion` 下由 token 归零 |  |

### 4.9 移动端布局与触控（R1，2026-11-06）

**工具优先（≤768px，视觉顺序，DOM/SEO 文本不变）**：

1. 首页：工具/上传区 → 页头 → 工具导航 → 内容 → FAQ → footer（`body.mc-collage-page`）；
2. 工具页：紧凑页头 → 工具区（upload → editor）→ 横向工具导航 → 意图条 → SEO/FAQ → footer（`body.mc-tool-page`）；
3. 编辑器：画布在上、侧栏控件在下；底部工具栏 sticky 在视口底部；
4. 工具导航：横向可滚动 pill 行（不再竖排 350px）；
5. 顶部导航：≤768px 单行 ≤ `--mc-mobile-nav-height`（56px）：品牌 + 语言 + 菜单按钮；桌面链接折叠为面板（`body.mc-nav-open`）。

**4.9.1 导航角色分离（R2 Phase 1+2A，2026-11-06）**

- **全局导航** = wayfinding：品牌（Home）+ Blog/About/Contact + 语言；**不放具体工具**（R2 Phase 2A 已收口：54 页全局 nav 的 Square Image → Contact）。
- **局部工具切换** = 页面上下文：`.tool-nav` 只放工具，**不得包含 Home**；about/contact 等内容页**不显示** tool-nav。
- 首页工具入口只出现一次（tool-nav），移除重复的 `.home-tool-entry` 卡片。
- **footer-tools**：**全部 94 个站点页**（除 404）必须有 5 个真实工具链接（本地化前缀 + `data-i18n` 标签 + `aria-label`/`nav.tools`）：有 footer 的放在 footer 内；40 个无 footer 的本地化/指南页使用 `.footer-tools--standalone`（Phase 2B-1，R2）。既保 SEO 内链也作为无 JS 兜底。
- 桌面把 `.tool-nav` 降级为轻量上下文 tab（透明、无第二层导航容器）；移动保持横向滚动。
- 工具入口：首页/工具页内的 `.tool-nav` + 所有有 footer 页面的 `.footer-tools`；内容页 footer 兜底，全局 nav 不再承担工具入口。
- **GitHub 入口**：右上角为纯图标按钮（内联 SVG，不依赖 Font Awesome CDN；44×44；`aria-label` + `title` 本地化）；页脚保留 "GitHub Issues" 文字链接作为发现性/无 JS 兜底。
- 门禁：`check-layout.mjs` **F 项**（静态）检查以上规则，**所有页面必须有 footer-tools**（含无 footer 页的 standalone 变体）。

**硬性约束**：

- 320 / 360 / 390 宽度下 `scrollWidth === innerWidth`（横向溢出会让固定壁纸层露出深色兜底，见 `audit/design-migration/MOBILE-OVERFLOW.md`）；
- 独立控件触控热区 ≥ `--mc-tap-target-min`（44px）；正文行内链接除外；
- 移动端排序/拖拽必须支持 touch/pointer，不能只写 HTML5 drag；
- 移动端改动不得改变桌面（>768px）布局；验收脚本 `scripts/design-audit/check-layout.mjs`。

### 4.10 性能预算（R2，2026-11-06）

移动端性能不能靠"感觉"优化：headless Chrome 的 rAF 锁 60fps、GPU 合成被虚拟化，A/B 缩减 blur 实测无差异（ADR-0008）。因此预算落在**可复现、能防回归**的指标上，由 `scripts/design-audit/check-performance.mjs` 执行：

| 类别 | 预算（文件 `scripts/design-audit/performance-budget.json`） | 当前基线 |
|---|---|---|
| CSS gzip | design-tokens ≤9KB / components ≤16KB / 旧 bundle 保持 ≤12KB / pages ≤4KB | 7.4 / 13.1 / 11.1 / 2.9 KB |
| JS gzip | main ≤26KB / ui ≤10KB / i18n ≤4KB | 22.4 / 7.4 / 2.8 KB |
| HTML gzip | 首页 ≤14KB | 11.8 KB |
| 图片 | 壁纸 ≤100KB | 80 KB |
| 渲染（390×844，离线） | 单页 DOM ≤600 节点 / 深度 ≤16 / backdrop-filter 元素 ≤60 / 样式表 ≤8 / 外部脚本 ≤2 | 首页 282 / 11 / 48 / 7 / 2 |
| 参考项 | 滚动 A/B（FPS/长任务）只记录，**不做门槛** | headless 无差异 |

规则：
- 新增 UI 后用 `--bench` 记录参考数据；**禁止**以 headless FPS 差异作为"性能优化"依据（L-37）。
- 新增阻塞脚本、把 AI 大库放回首屏、单页 DOM 超预算 → 门禁 FAIL；接近预算（>90%）→ WARN，需同批说明。
- 真机性能（iOS Safari）在 Preview/真机用 DevTools 复核；headless 结果仅作结构回归。

## 5. 组件配方

组件级 CSS 配方（可直接复制到新页面/`components.css`）见 [`COMPONENT-RECIPES.md`](COMPONENT-RECIPES.md)，覆盖：

页面骨架/面板、顶部导航、工具页导航、按钮（主/成功/次要/图标/上传 CTA）、玻璃卡片（feature/blog/FAQ）、表单（输入/下拉/滑块/色板）、上传 dropzone、编辑器三栏与画布浅色控件、Toast、Footer、404 实底页、博客正文排版、专题页主题色。

---

## 6. 新页面 / 新功能检查单（硬性）

- [ ] 已读本文件 + 相关 `docs/lessons/L-*`（多语言改动读 L-02/L-23；SEO head 改动读 L-24/L-25）。
- [ ] `<head>` 按 §4.1 顺序引入 token 文件；没有引用 `i18n.css`。
- [ ] 所有颜色/字号/间距/圆角/阴影/动效都来自 `--mc-*`；页面内联 `<style>` ≤50 行且无裸值。
- [ ] 组件优先复用既有 class 或 G1 的 `components.css`；没有复制其他页面的内联样式块。
- [ ] 多语言：5 份页面同步（或明确标记为英文 only 且不参与索引），title/description/canonical/hreflang 静态正确（L-25）。
- [ ] 移动端在 768px 断点符合现有布局习惯；键盘可聚焦（用 `--mc-focus-ring-*` / `--mc-border-brand`），不依赖颜色单独传达状态。
- [ ] 无新增第三方资源；无密钥/凭据；未改 Publisher ID/广告/GA4（H3/H5）。
- [ ] 已运行并记录：
  ```bash
  node scripts/design-audit/run-token-audit.mjs --check-docs
  node scripts/verify-site.mjs --base <preview-url>        # 部署类改动必跑
  node scripts/seo-audit/run-seo-checks.mjs                # 多语言/head/SEO 改动必跑
  node scripts/functional-audit/run-tests.mjs              # 功能类改动必跑
  ```
- [ ] 新 token 若新增：已加 CSS 注释、本文件表格、至少一个使用点；已考虑旧值迁移。
- [ ] 走分支 → Preview → 证据 → 维护者批准（H1/H2/L-12）；AI 不自主部署生产。

---

## 7. 存量迁移策略（分阶段，每阶段单独 C2 变更）

> G1 已执行：token/统一层已接入 **94 个页面**（`grep -l design-tokens.css $(git ls-files '*.html')` = 94；404 例外），页面内联值已做 6,955 处等价值 token 化（视觉零变化）；G2/G3 继续收敛重复内联块与语义合并。

| 阶段 | 内容 | 范围 | 门禁 |
|---|---|---|---|
| **G0（本次，已完成）** | token 文件 + 本文档 + 预览页 + 审计脚本 + 基线 + ADR/教训；重写旧 design-system.md 为入口指针；`pages-C2UaL6ML.css` 与 index bundle 的重复关系记录在案 | 新增文件 + 文档 | C1：分支 + 人工审阅 + 维护者合并批准；不部署 |
| **G1（本次，已完成）** | 交付 `assets/css/components.css`（统一层 + 精修）+ `scripts/design-system/migrate.mjs`（link 注入 + 精确等价 token 化）；94 个页面接入 tokens/components；`404.html` 保持独立主题 | 94 个 HTML（各 +2 行 link + 内联值 token 化） | C2：本地改造 + 审计 PASS + 视觉基线/改造后截图 + 功能/SEO harness（**Preview 与生产仍需维护者批准**） |
| **G2** | 收敛重复内联样式：index（5×24.8KB）、4 工具页（各 5 份）、about/contact（5 份）、privacy/terms（10×5KB 共享块）抽到 components/页面共享 CSS（31 个不同块→可去重 166KB）；删除 i18n.css 重复的 `.lang-selector*` 块；评估移除冗余的 pages bundle 引用（66 页） | 约 25 个页面 | C2：Preview + `verify-site` + 功能/SEO harness + 逐页视觉对比 + 维护者批准 |
| **G3** | 全站迁移：41 个纯内联页接入 token/components；把 5 语言内联块清空为引用；bundle 只保留为历史 class 兜底（无源码，无法重生成） | 95 页 | 同 G2，分批（每次 ≤10 页）+ 基线逐步下降 |
| **G4（可选）** | 用 token 覆盖层替代旧 bundle 的关键组件（或重建可维护的源 CSS）；删除 i18n.css；审计基线趋近 0 | 全站 | C3（涉及样式重构 + 全量回归 + ADR） |

执行原则：

1. **每次只做一层**：先抽样式（G2），再换值（G3），最后删旧（G4）；不要一次改值又改结构。
2. 每阶段结束跑 `--update-baseline`，但必须人工复核下降数字后才提交（禁止为了让审计变绿而放宽基线）。
3. 迁移出现视觉差异时，先截图对比（Preview vs 生产），确认是"统一为 token 值"的预期差异，写进证据。
4. bundle 无源码 → **不要手改压缩 bundle**去迁 token；用覆盖层/新组件替换，或另立 ADR 重建源 CSS。

---

## 8. 旧值 → token 映射（迁移时照此替换）

### 8.1 旧 CSS 变量（22 个）

| 旧变量 | 旧值 | 新 token | 备注 |
|---|---|---|---|
| `--primary-color` | `#4A90E2` | `--mc-color-action` | **不是品牌绿**；旧变量名有误导性，迁移时注意 |
| `--primary-hover` | `#357ABD` | `--mc-color-action-hover` | |
| `--success-color` | `#66BB6A` | `--mc-color-success` | |
| `--success-hover` | `#4CAF50` | `--mc-color-success-hover` | |
| `--bg-color` | `rgba(0,0,0,.25)` | `--mc-surface-1` | |
| `--card-bg` | `rgba(0,0,0,.25)` | `--mc-surface-1` | |
| `--card-bg-hover` | `rgba(0,0,0,.35)` | `--mc-surface-hover` | |
| `--border-color` | `rgba(255,255,255,.25)` | `--mc-border-strong` | |
| `--text-primary` | `#f9fbff` | `--mc-text-primary` | |
| `--text-secondary` | `rgba(255,255,255,.85)` | `--mc-text-secondary` | |
| `--spacing` | `1rem` | `--mc-space-4` | |
| `--shadow-soft` | `0 4px 20px rgba(0,0,0,.08)` | `--mc-shadow-e1` | 旧值按浅色主题设计，暗色玻璃下已不适用；不要直接抄 |
| `--shadow-medium` | `0 8px 30px rgba(0,0,0,.12)` | `--mc-shadow-e2` | 同上 |
| `--shadow-strong` | `0 12px 40px rgba(0,0,0,.15)` | `--mc-shadow-e3` | 同上 |
| `--ghibli-sky-blue` | `#87CEEB` | `--mc-blue-400` | 装饰 |
| `--ghibli-light-blue` | `#B0E0E6` | `--mc-blue-300` | 装饰 |
| `--ghibli-green` | `#7CB342` | `--mc-green-600` | 装饰 |
| `--ghibli-dark-green` | `#4CAF50` | `--mc-green-500` | 渐变终点 |
| `--ghibli-yellow` | `#FFD700` | `--mc-yellow-400` | 装饰 |
| `--ghibli-orange` | `#FF8C42` | `--mc-orange-400` | 装饰 |
| `--ghibli-pink` | `#FFB6C1` | `--mc-pink-300` | 装饰 |
| `--ghibli-purple` | `#BA68C8` | `--mc-purple-400` | 装饰 |
| `--placeholder-icon-url` | 运行时由 JS `style.setProperty` 注入 | **不是 design token** | 属运行时资源变量（WebP 检测），不要纳入 token |

### 8.2 颜色 / 字号 / 圆角映射（存量高频值）

#### 颜色（token 外 Top 20，按出现次数）

| 旧值 | 出现次数 | 最接近 token | 迁移建议 |
|---|---:|---|---|
| `#333` | 23 | `--mc-green-900` | i18n.css 旧语言按钮配色；G2 删除该重复块后由 --mc-surface-* 替代 |
| `#1a1a1a` | 20 | `--mc-ink-950` | 工具页导出选项深色文字；映射 --mc-ink-950 或 --mc-text-primary |
| `#4caf5099` | 12 | `--mc-gradient-brand` | 品牌绿 60% 描边/底；用 --mc-border-success-strong / --mc-color-brand-tint |
| `#388e3cb3` | 8 | `--mc-border-success-strong` | 深绿 70%；用 --mc-border-success-strong 或新增前先提案 |
| `rgba(255, 255, 255, 0.88)` | 8 | `--mc-text-body` | 接近正文 90%；改用 --mc-text-body |
| `#8fd68fbf` | 6 | `--mc-border-brand-heavy` | 品牌绿 75% 描边；用 --mc-border-brand-heavy |
| `#8fd68fb3` | 6 | `--mc-border-brand-heavy` | 品牌绿 70% 描边；用 --mc-border-brand-heavy |
| `#fcb69f` | 6 | `--mc-pink-300` | 生日专题页暖色强调；用 --mc-color-theme-accent 覆盖机制 |
| `#1e5631` | 6 | `--mc-green-900` | 深绿文字；用 --mc-green-900 |
| `#8fd68f59` | 5 | `--mc-color-brand-tint-strong` | 品牌绿 35% 底；用 --mc-color-brand-tint-strong |
| `#4caf5040` | 5 | `--mc-border-brand-subtle` | 品牌绿 25% 底；用 --mc-color-brand-tint / haze |
| `#228b22` | 5 | `--mc-green-700` | 圣诞专题页森林绿；改用 --mc-color-theme-accent |
| `#f44336` | 5 | `--mc-color-danger` | 映射到最近的语义 token；若无对应语义，先提案新增 token |
| `rgba(143, 214, 143, 0.7)` | 5 | `--mc-border-brand-strong` | 映射到最近的语义 token；若无对应语义，先提案新增 token |
| `#3b82f6` | 5 | `--mc-blue-500` | 映射到最近的语义 token；若无对应语义，先提案新增 token |
| `rgba(0, 0, 0, 0.7)` | 5 | `--mc-text-shadow-display` | 深色遮罩；用 --mc-surface-4 或 --mc-overlay-* |
| `#f5576c` | 5 | `--mc-color-danger` | 映射到最近的语义 token；若无对应语义，先提案新增 token |
| `rgba(255, 255, 255, 0.4)` | 5 | `--mc-text-faint` | 弱文字/描边；用 --mc-text-faint 或 --mc-border-strong |
| `#14b8a6` | 5 | `--mc-green-500` | 映射到最近的语义 token；若无对应语义，先提案新增 token |
| `#d81b60` | 5 | `--mc-color-danger` | 映射到最近的语义 token；若无对应语义，先提案新增 token |

#### 字号（token 外全部存量）

| 旧值 | 出现次数 | 归一 px | 最接近 token |
|---|---:|---:|---|
| `.78rem` | 4 | 12.48 | `--mc-font-size-xs`（12.8px） |
| `.68rem` | 2 | 10.88 | `--mc-font-size-2xs`（12px） |
| `13px` | 2 | 13 | `--mc-font-size-xs`（12.8px） |
| `1.15rem` | 1 | 18.4 | `--mc-font-size-lg`（18px） |
| `4.5rem` | 1 | 72 | `--mc-font-size-icon-lg`（64px） |
| `1.05rem` | 1 | 16.8 | `--mc-font-size-body`（16px） |
| `0.88rem` | 1 | 14.08 | `--mc-font-size-label-sm`（14px） |
| `.65rem` | 1 | 10.4 | `--mc-font-size-2xs`（12px） |
| `2.2rem` | 1 | 35.2 | `--mc-font-size-h1-compact`（32px） |
| `2.4rem` | 1 | 38.4 | `--mc-font-size-h1`（40px） |
| `2.1rem` | 1 | 33.6 | `--mc-font-size-h1-compact`（32px） |
| `.92rem` | 1 | 14.72 | `--mc-font-size-label`（14.4px） |
| `.82rem` | 1 | 13.12 | `--mc-font-size-xs`（12.8px） |

#### 圆角（token 外 px 值）

| 旧值 | 出现次数 | 迁移建议 |
|---|---:|---|
| `15px` | 49 | --mc-radius-item (16px) / --mc-radius-tag (10px) |
| `50px` | 42 | --mc-radius-pill (999px) |
| `4px` | 35 | --mc-radius-xs (6px) |
| `14px` | 11 | --mc-radius-panel (30px) |
| `18px` | 7 | --mc-radius-xl (20px) |
| `2rem` | 5 | --mc-radius-panel (30px) |
| `25px` | 2 | --mc-radius-2xl (24px) |
| `2px` | 2 | --mc-radius-xs (6px) |

补充规则：

- 迁移优先级：先替换"语义明确"的值（正文白、标题绿、玻璃底、描边、圆角），再处理专题页主题色（用 `--mc-color-theme-accent` 覆盖）。
- 专题页当前各自硬编码一套强调色（生日 `#fcb69f`、婚礼 `#d81b60/#e91e63`、圣诞 `#228b22/#ffc107` 等）→ G3 统一为 `--mc-color-theme-accent` 页面级覆盖，颜色值进入 token 提案（作为"专题主题色"组），不要再散写。
- 工具页可选背景色（`tool.square.colors.*`、色板预设）属于**产品内容数据**，不是 UI 设计 token，不要收进 `design-tokens.css`；如要统一，放独立内容配置文件并注明。

### 8.3 间距 / 字号的非标值

| 旧值 | 取最近 token |
|---|---|
| `0.35rem` ≈ 5.6px | `--mc-space-1`（4px）或 `--mc-space-2`（8px），看视觉重量 |
| `0.45rem` ≈ 7.2px | `--mc-space-2`（8px） |
| `0.55rem` ≈ 8.8px | `--mc-space-2` / `--mc-space-3` |
| `0.6rem` ≈ 9.6px | `--mc-space-2`（8px）或 `--mc-space-3`（12px） |
| `0.65rem` ≈ 10.4px | `--mc-space-3`（12px） |
| `0.85rem` ≈ 13.6px | `--mc-space-3` / `--mc-space-4` |
| `1.1rem` ≈ 17.6px | `--mc-space-4`（16px） |
| `1.2rem` ≈ 19.2px | `--mc-space-5`（20px） |
| `1.8rem` ≈ 28.8px | `--mc-space-8`（32px） |
| `2.2rem` ≈ 35.2px | `--mc-space-8` / `--mc-space-10` |
| px 8 / 16 / 20 / 24 / 32 / 40 / 48 / 64 | 分别对应 `--mc-space-2/4/5/6/8/10/12/16`（16px root 下等价） |
| px 10 / 15 / 25 / 30 / 50 / 60（工具页内联块常用） | 不在 4px 基准上：15/25/30/50/60 取最近阶梯（12/16/24/32/48/64）；10px 用 `--mc-space-2`(8) 或 `--mc-space-3`(12) |
| 13px / 18px 等 | 未纳入间距 token；组件内改用最近阶梯；确需保留则提案新增 |

### 8.4 已知冲突：i18n.css 与主 bundle 的 `.lang-selector*`

- 事实：`assets/css/i18n.css` 定义了与 bundle 同名的 `.lang-selector-toggle` / `.lang-menu` / `.lang-option`，但值为深灰 `#333`、4px 圆角、z-index 1000；bundle 是玻璃/薄荷绿、999px 胶囊、z-index 50。
- 加载顺序：54 个引用 i18n.css 的页面里它都在 bundle 之后（`index.html` 例外：i18n.css 在 bundle 之后、页面内联 `<style>` 之前；其中 10 个页面又在内联块里定义了 `.lang-selector-toggle`）。
- 结论（代码层推断，未做像素级渲染取证）：**同一组件存在两套样式，最终生效取决于该页内联块与 i18n.css 的先后顺序**。这是迁移必须处理的冲突，不能简单删掉其中一个而不做 Preview 视觉对比。
- 处理：G2 删除 i18n.css 中重复块（只保留必要的 `.lang-menu-backdrop` 等结构样式），统一到 bundle/token；变更需在 5 语言 × 3 类页面（首页/工具页/内容页）做视觉核对。

---

## 9. 审计与防漂移门禁

### 9.1 命令

```bash
# 日常检查（默认输出摘要 + Top 列表 + 文档一致性）
node scripts/design-audit/run-token-audit.mjs

# 证据归档（JSON 机器可读 + Markdown 人读）
node scripts/design-audit/run-token-audit.mjs --report-all \
  --json audit/design-tokens/audit-$(date +%Y%m%d-%H%M).json \
  --md  audit/design-tokens/audit-$(date +%Y%m%d-%H%M).md

# 人工复核"存量债务下降"后固化基线
node scripts/design-audit/run-token-audit.mjs --update-baseline

# 输出 token 清单（Markdown 表格行，用于重新生成本文件 §3）
node scripts/design-audit/run-token-audit.mjs --list-tokens
```

### 9.2 判定

| 情形 | 结果 |
|---|---|
| 新增文件含 token 外颜色/字号/圆角/inline style | **FAIL** |
| 既有文件违规数比基线上涨 | **FAIL** |
| `DESIGN-TOKENS.md` 缺 token / 多 token / token 内部 `var()` 未定义 | **FAIL** |
| 违规数下降（迁移成效） | PASS + 提示复核后 `--update-baseline` |
| 存量违规（基线内） | 不判错，计入基线债务 |

退出码：`0` 无漂移；`1` 有漂移/文档不一致；`2` 环境或用法错误（如基线不存在）。

### 9.3 基线

- 文件：`scripts/design-audit/baseline-design-tokens.json`（存每个文件的颜色/字号/圆角/内联样式数量 + 总量 + tokenHash + gitHead）。
- 基线是**存量债务快照，不是目标值**；只有在"人为确认迁移成效"后才能更新。
- token 集合变化（新增/改值）会改变 tokenHash：如果新增 token 导致存量违规下降，属预期，复核后更新基线。

### 9.4 当前基线（v1.0.0 生成）

| 指标 | 数量 |
|---|---:|
| 扫描文件 | 102 |
| token 外颜色 | 338（不同值 144） |
| token 外 font-size | 18 |
| token 外 border-radius | 153 |
| 相对单位 font-size（不判错） | 363（含无法静态解析的 em/%/var 组合） |
| `style=""` 内联属性 | 1,560 |
| 内联 `<style>` 块 | 95 |

> 基线数字不是"允许继续写"的额度：新代码一律 0 违规；存量迁移按 §7 分阶段下降。
> **R2 Phase 1 后基线（2026-11-06 刷新）**：颜色 334 / font-size 18 / 圆角 151 / 内联样式 1,553（移除重复工具卡与内容页 tool-nav 的收益）；token 273 / hash `3db11395ede1`。
> G1 的 6,955 处 token 化是"等价值替换"，不改变上述"token 外"计数（被替换的值本来就在 token 集合内）；该计数要等 G3 语义合并（15px→16px、#333→surface 等）才会下降。

---

## 10. 已知缺口 / 不确定项（不要假装设计系统是完整的）

1. **404 页无壁纸层**：404 是独立实底主题（不加载 token/统一层），本次保持例外；其余 **94/95** 页已固定壁纸（验收见 `audit/design-migration/WALLPAPER.md`，含滚动固定性、对比度、已知横向溢出边界）。若要让 404 也有壁纸，需单独 C3 变更。
2. **没有亮色模式**：全站依赖壁纸 + 深色玻璃，无 `prefers-color-scheme`；若未来要亮色主题，需要新 token 组 + ADR，不允许在页面里临时反色。
3. **没有 warning/info 语义色**：只有 `--mc-color-success` / `--mc-color-action` / `--mc-color-danger`；toast 只有深灰底一种，没有 error 样式。新功能需要错误/警告提示时，先提案补状态色 token（warning/info 两组，命名待定）及 toast 变体。
4. **存量收敛尚未完成（G2/G3）**：token/统一层已接入 94 页，但 31 个不同内联块（95 份）仍在页面里，重复样式与专题主题色尚未合并；语义合并（15px→16px、`#333`→surface、专题色→`--mc-color-theme-accent`）全部留在 G3。
5. **bundle 无源码**：无法从源文件重新生成两个压缩 bundle，旧 class 样式只能通过覆盖层或替换组件逐步淘汰；G4 是长期项。
6. **i18n.css 冲突**（§8.4）：同一语言选择器两套样式，统一层已用 `body` 前缀覆盖；删除旧块留到 G2，且必须逐页视觉核对。
7. **41 个原生无 bundle 页面**（root 9 + 每语言 8）：本次已通过 tokens/components 统一视觉与壁纸层，但其页面内联块仍在；迁移成本最高，G2/G3 分批收敛。
8. **移动端排版靠媒体查询覆盖**，没有响应式 token（CSS 变量不能进 `@media`）；已有 `--mc-font-size-h1-compact` 等移动值 token，但断点值仍需字面写。
9. **审计 v1 限制**：压缩 bundle 行号只能报 `:1`；JS 只扫描样式赋值/对象字面量中的颜色（不解析 canvas 运行时计算色）；`style=""` 的检测是正则级，不处理跨行属性；百分比圆角与相对字号（em/%/clamp）不判违规。详见 `scripts/design-audit/README.md`。
10. **JS / 运行时默认值不属 CSS token 范围**（但属于"设计决策"，改动需同步文档）：导出默认底色 `#ffffff`、html2canvas `scale 2`、PNG `quality 1.0`；文字层默认 `24px / #000000 / bold`；贴纸默认 `48px`；滤镜 5 组（noir/retro/fade/glow/cool）；工具页 canvas 默认值（square: 背景 `#ffffff` + blur 20 + JPG 85 + size 1200；squarecrop quality 0.85；roundedcorners 圆角 10；blurredframe quality 0.9 + 背景 `#0f172a`）。逐条 file:line 见 `audit/design-tokens/ui-inventory.md` §4。
11. **命名不一致**（迁移前必须先定义组件 API）：工具页容器有 5 个名字；`related-post-*` vs `related-article-*`；`.cta-button`(80 次) vs `.cta-btn`(5 次)，且 `.cta-button` 有 14 种声明变体；34 个 class 在内联块与外部 CSS 中同名但声明不同；同一 class 多语义。
12. **字体栈共 6 个**：主力 `Noto Sans SC, -apple-system…`（49 次/17 units）与 `Noto Sans SC, sans-serif`（30 次/9 units）；另有 `Courier New, Courier, monospace` 2 次等。新代码只用 `--mc-font-sans`；旧页面 `2.5em / 2em` 字号按 §8.2 映射。
13. **内联 style 高频复制串**：`color:#8fd68f` 387 次、语言菜单相关 270 次、语言入口 200 次、`display:none` 90 次、专题页 feature 卡整串 40 次——迁移目标是 class 化，不是把这些串收进 token。
14. **`transition: all .3s ease` 仍有 342 处**：性能与不可预测样式的来源；新代码必须写具体属性（§4.5）。
15. **数据口径不确定项**：`#333/#444/#555` 来自 i18n.css 旧语言选择器；`#64748b/#94a3b8/#e2e8f0/#f1f5f9` 来自画布浅色占位控件（已 token 化为 `--mc-overlay-*`）；`#d81b60/#e91e63/#fcb69f/#228b22/#ffc107` 为专题页主题色（G3 统一）；若某类实际是"产品内容数据"，迁移时剔除、不强行 token 化。

## 11. 证据与复核

### 11.1 本文件事实的取证命令

```bash
# 页面数量 / 引用情况
git ls-files '*.html' | wc -l                                   # 95
grep -l 'index-vAuRGWiM.css' $(git ls-files '*.html') | wc -l   # 54
grep -l 'i18n.css' $(git ls-files '*.html') | wc -l             # 54

# CSS 产物与旧变量/颜色字面量
wc -c assets/index-vAuRGWiM.css assets/pages-C2UaL6ML.css assets/css/i18n.css
grep -oE 'var\(--[a-zA-Z0-9-]+' assets/index-vAuRGWiM.css assets/pages-C2UaL6ML.css assets/css/i18n.css | wc -l   # 34
grep -oE '#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)' assets/index-vAuRGWiM.css assets/pages-C2UaL6ML.css assets/css/i18n.css | sort -u | wc -l  # 233

# 内联样式规模与重复（脚本见附录 A 说明）
# 全部统计与明细
node scripts/design-audit/run-token-audit.mjs --report-all \
  --json audit/design-tokens/audit.json --md audit/design-tokens/audit.md
```

### 11.2 本次交付物

| 文件 | 说明 | 是否部署 |
|---|---|---|
| `assets/css/design-tokens.css` | token 层，273 个 `--mc-*` | 是（新静态文件，未被页面引用，零运行时影响） |
| `docs/design/DESIGN-TOKENS.md` | 本规范 | 否（`docs/` 在 `.vercelignore`） |
| `docs/design/COMPONENT-RECIPES.md` | 组件配方 | 否 |
| `docs/design/token-preview.html` | 可视化 token 预览页（本地打开） | 否 |
| `docs/design/PAGE-PATTERNS.md` | 页面规律总结 + 统一改造与精修报告（本次改造记录） | 否 |
| `assets/css/components.css` | 统一设计层：存量页面组件统一 + 交互/可访问性精修（273 个 token 驱动） | 是（新增静态文件；由 94 页 link 引用） |
| `scripts/design-audit/run-token-audit.mjs` | 防漂移审计脚本 | 否（`scripts/` 在 `.vercelignore`） |
| `scripts/design-audit/baseline-design-tokens.json` | 存量债务基线 | 否 |
| `scripts/design-audit/README.md` | 审计脚本说明 | 否 |
| `scripts/design-system/migrate.mjs` + `README.md` | 页面 link 注入 + 精确等价 token 化迁移脚本（幂等、可回滚） | 否（`scripts/` 被 `.vercelignore`） |
| `docs/decisions/ADR-0006-design-token-single-source.md` | 决策记录 | 否 |
| `docs/lessons/L-20261106-30-design-values-hardcoded-and-drift.md` | 教训回灌 | 否 |
| `design-system.md` | 旧文档改为入口指针（避免两份规范打架） | 否（已在 `.vercelignore`） |
| `AGENTS.md` | 文档索引增加 design token 入口 | 否 |

## 附录 A：内联 `<style>` 块重复清单（迁移重点）

> 口径：`audit/design-tokens/ui-inventory.md` §2 / `css-inventory.md` 附录；同一 SHA1 归一化块计 1 个版本。全站 95 块 → 31 个不同版本 → 去重后 166,852B（原始 664,467B）。

| 块大小 | 副本数 | 所在页面 |
|---:|---:|---|
| 5,020B | 10 | `privacy.html` / `terms.html`（5 语言 × 2 页共用同一块） |
| 24,855B | 5 | 5 语言首页 `index.html` |
| 17,073B | 5 | `/tools/square/`（5 语言） |
| 13,931B | 5 | `/tools/blurredframe/`（5 语言） |
| 13,149B | 5 | `/tools/roundedcorners/`（5 语言） |
| 12,780B | 5 | `/tools/squarecrop/`（5 语言） |
| 10,190B | 5 | `about.html`（5 语言） |
| 7,298B | 5 | `contact.html`（5 语言） |
| 5,537B | 4 | 4 篇 blog 文章共享块 |
| 1.0–1.3KB | 4 | 生日/圣诞/免费/教程/竖版/婚礼专题页（各语言） |
| 1,094B | 3 | `square-collage`（3 语言，en 缺失） |

### 11.2.1 原始盘点产物（本机、未入库）

以下文件在 `audit/design-tokens/`（`.gitignore`/`.vercelignore` 排除，不部署、不入库）：

| 文件 | 内容 |
|---|---|
| `css-inventory.json`（≈1.9MB） | 4,237 条规则 / 17,108 条声明 / 每个值的 occurrences+units+file:line+selector / 22 个旧变量与引用 / 冲突 selector / 组件簇 |
| `css-inventory.md`（127 行） | 上述数据的人读摘要与口径/限制 |
| `ui-inventory.json`（≈1.2MB） | 95 页组件/类名索引、1,560 条内联 style、31 个内联块、JS 运行时事实、响应式、命名冲突 |
| `ui-inventory.md`（141 行） | 上述数据的人读摘要 |
| `extract-css.mjs` / `extract-ui.mjs` | 零依赖可复跑盘点脚本 |
| `audit.json` / `audit.md` | 本次 `run-token-audit.mjs --report-all` 输出（含全部违规明细与最接近 token 建议） |

### 11.3 证据层声明

- 本文所有"事实"均为**代码层**取证（仓库文件 + 可复现命令 + 审计脚本输出），取证时间 2026-11-06（Asia/Shanghai），基线 commit `fedc3ee`（分支 `docs/design-tokens` 起点）。
- **未做**线上渲染层取证的结论：i18n.css 与 bundle 的最终生效值、专题页各语言的视觉差异——已标注为"代码层推断"，需要 Preview/浏览器渲染对比确认。
- 本文不涉及线上层/平台层（Cloudflare/Vercel/AdSense）结论。
