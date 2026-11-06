# scripts/design-system/ — 存量页面设计统一迁移脚本

> 零依赖（Node ≥ 20），只改 `.html`（不碰压缩 bundle / JS / 部署配置）。
> 建立：2026-11-06（G1，分支 `docs/design-tokens`）；当前 v1.0.0。
> 关联：[DESIGN-TOKENS.md](../../docs/design/DESIGN-TOKENS.md) · [PAGE-PATTERNS.md](../../docs/design/PAGE-PATTERNS.md) · [ADR-0006](../../docs/decisions/ADR-0006-design-token-single-source.md)

## 1. 做什么

把 95 个手写页面上「同语义、不同实现」的设计值接入 token 体系：

| 步骤 | 行为 | 视觉影响 |
|---|---|---|
| `--inject` | 94 个页面（**排除 404.html**）在 `<head>` 最后一个 `</style>` 之后插入 `design-tokens.css` + `components.css` 两个 `<link>` | 引入统一层 + 精修（本次改造的核心） |
| `--tokenize` | 把 `<style>` 块与 `style=""` 里的字面值**精确等价**替换为 `var(--mc-*)`（颜色 / font-size / border-radius / backdrop-filter blur / 整段 box-shadow、text-shadow） | **零视觉变化**（值不变，只换成变量） |
| 修复项 | 删除 29 个指南页 `<head>` 内 `</style>` 之后游离的裸 CSS 文本（`.ghibli-background {…}`，历史 HTML bug；旧白底不可见，深色壁纸启用后会显示成页面顶部一行 CSS） | 修复可见缺陷；背景层由 `components.css` 统一提供 |

不处理：`assets/*.css` 压缩 bundle（构建产物、无源码、禁止手改）、JS、`docs/`、`audit/`、`scripts/`、`404.html`（独立实底主题）。

## 2. 用法

```bash
# 默认 dry-run（只统计，不写盘）
node scripts/design-system/migrate.mjs --dry-run \
  --report audit/design-migration/migrate-dryrun.md \
  --json   audit/design-migration/migrate-dryrun.json

# 分步执行（推荐）
node scripts/design-system/migrate.mjs --inject  --apply
node scripts/design-system/migrate.mjs --tokenize --apply

# 两步一起（默认）
node scripts/design-system/migrate.mjs --apply

# 幂等验证：再跑一次 dry-run 应为 toModify=0 / replacements=0
node scripts/design-system/migrate.mjs --dry-run
```

退出码：`0` 成功；`1` 写盘失败（提示回滚）；`2` 环境/用法错误。

## 3. 映射规则（为什么是"精确等价"）

- **颜色**：解析 `design-tokens.css` 的 `--mc-*` 定义与解析值，建立「归一化颜色（RGB+alpha）→ token 名」映射；语义 token 优先（`--mc-color-brand` > `--mc-text-*` > `--mc-surface-*` > `--mc-border*` > 原始色板）；`transparent` 不替换；`url()` / `var()` / CSS 注释内的颜色跳过。
- **font-size**：rem/px 精确映射到 `--mc-font-size-*`（如 `2.5rem → --mc-font-size-h1`、`14px → --mc-font-size-label-sm`）；`em/%/clamp` 保持不动。
- **border-radius**：px/`%` 精确映射到 `--mc-radius-*`（`20px→--mc-radius-xl`、`30px→--mc-radius-3xl`、`999px→--mc-radius-pill`、`50%→--mc-radius-circle`……）；15/18/14/50/4px 等非 token 值保持不动（留给 G3 语义合并）。
- **backdrop-filter**：`blur(Xpx)` 精确映射到 `--mc-blur-*`。
- **box-shadow / text-shadow**：整段值（颜色归一 + 空白折叠后）与 token 解析值完全相等才替换；否则保留。
- 已是 `var()` 的不再替换（幂等）。

## 4. 边界与风险

- 只做等价值替换，**不改变视觉**；真正的语义合并（15px→16px、`#333`→surface、专题主题色→`--mc-color-theme-accent`）在 G3 做，必须逐页 Preview 截图。
- 若 HTML 结构异常（找不到 `</head>`、`<style>` 未闭合），脚本只跳过该文件并记录，不半写；写盘前所有内容在内存中构建。
- 已知限制：不做 HTML AST 级解析（正则级），极端压缩/跨行属性可能漏检；不解析 CSS `calc()`/`color-mix()` 中的颜色。

## 5. 回滚

```bash
# 回滚所有页面改动（token 化 + link 注入 + 游离 CSS 修复）
git checkout -- '*.html'
```

统一层本身（导致视觉变化的唯一来源）可单独回滚：删除页面中的两行 `<link>` 或 revert `components.css`；token 文件只声明变量，删除/回退零视觉影响。

## 6. 实测结果（2026-11-06，G1）

- 处理 94 页（404 排除）；注入 94 页；修复游离 CSS 29 页。
- 等价值替换 **6,955 处**：颜色 4,248 / font-size 1,006 / 圆角 731 / 模糊 439 / 整段阴影 531。
- 幂等：第二次 dry-run `toModify=0, replacements=0`。
- 结构：94 页各 +2 `<link>`，无其它标签变化；无未定义 `var(--mc-*)`。
- 回归：`scripts/functional-audit` **52 PASS / 0 FAIL / 1 WARN**；`scripts/seo-audit` **32 PASS / 0 FAIL / 0 WARN**；before/after 12 页 ×2 视口截图（`audit/design-migration/`）。


## `nav-role-separation.mjs` — 导航角色分离（R2 Phase 1）

```bash
node scripts/design-system/nav-role-separation.mjs                                   # dry-run
node scripts/design-system/nav-role-separation.mjs --apply --json out.json --report out.md
```

- 工具页 `.tool-nav` 去 Home；about/contact 移除 tool-nav；首页移除重复 `.home-tool-entry`；
- 所有**有 footer** 的页面插入本地化 `.footer-tools`（5 个真实工具链接，语言前缀 i18n JSON 生成）；
- 幂等；40 个没有 footer 的本地化/指南页跳过（报告 `skippedNoFooter`，遗留项）；
- 只改站点 HTML，不改 URL/canonical/hreflang；完成后跑 `check-layout.mjs`（F 项）、SEO、functional、mobile-touch。


## `nav-global-cleanup.mjs` — 全局导航收口（R2 Phase 2A）

```bash
node scripts/design-system/nav-global-cleanup.mjs            # dry-run
node scripts/design-system/nav-global-cleanup.mjs --apply --json out.json --report out.md
```

- 把全局导航（`.nav-left`）里的 `data-page="square"`（Square Image 工具链接）替换为对应语言的 Contact 真实 `<a href>`（5 语言，`nav.contact` i18n）；
- 共 54 页（有全局导航的页面）；40 个无导航落地页跳过；
- 不改 URL/canonical/hreflang；完成后跑 `check-layout.mjs` F 项、SEO、functional、mobile-touch。


## `footer-tools-standalone.mjs` — 无 footer 页面的 FooterTools（R2 Phase 2B-1）

```bash
node scripts/design-system/footer-tools-standalone.mjs            # dry-run
node scripts/design-system/footer-tools-standalone.mjs --apply --json out.json --report out.md
```

- 给 40 个没有 `<footer>` 的本地化/指南页插入 `.footer-tools--standalone`（5 个真实工具链接，本地化前缀/文案来自 i18n JSON，无 JS 也正确）；
- 不重建整站 footer、不改内容/URL；幂等；
- 门禁：`check-layout.mjs` F 项（所有页面必须有 footer-tools）。
