# scripts/design-audit/ — Design Token 审计 + 布局/交互门禁

> 零依赖（Node ≥ 20 内置模块 + 本机 Chrome for check-layout），默认不联网、不修改任何文件（`--update-baseline` 除外）。
> 建立：2026-11-06（分支 `docs/design-tokens`）；2026-11-06 R0/R1 后扩展为两个脚本，R2 增加性能预算后为**三个脚本**。
> 单一事实源：`assets/css/design-tokens.css`；规范：`docs/design/DESIGN-TOKENS.md`；决策：[ADR-0006](../../docs/decisions/ADR-0006-design-token-single-source.md) / [ADR-0007](../../docs/decisions/ADR-0007-interaction-refinement.md) / [ADR-0008](../../docs/decisions/ADR-0008-r2-mobile-touch-performance-blog-search.md)；教训：L-20261106-30~39。
>
> | 脚本 | 作用 | 依赖 |
> |---|---|---|
> | `run-token-audit.mjs` | token 外设计值 + **JS 运行时裸色** + 基线比对 + `DESIGN-TOKENS.md` 一致性 | 纯 Node（git 仓库内运行） |
> | `check-layout.mjs` | 移动溢出 / 固定壁纸 / 触控目标 / `alert()` / AI 库预加载 | Node + 本机 Chrome（复用 `scripts/seo-audit/server.mjs` 与 `scripts/functional-audit/cdp.mjs`，离线） |
> | `check-performance.mjs` | 性能预算：资源 gzip 体积 + 390×844 渲染结构（DOM/深度/backdrop/样式表/脚本）；`--bench` 滚动 A/B 仅参考 | Node + 本机 Chrome（B/C 项）|

## 1. 是什么

`run-token-audit.mjs` 扫描站点源文件（95 个 HTML 的 `<style>` 块与 `style=""`、CSS 产物、**站点 JS 的运行时样式赋值**），把「token 之外的设计值」计数，并和 `baseline-design-tokens.json` 比对：

- **新增漂移 → FAIL**：新文件里出现 token 外颜色/字号/圆角/内联样式，既有文件违规数上涨，或 **JS 运行时裸色**上涨；
- **存量债务 → 基线内不判错**：95 个手写页的历史硬编码不是本轮要一次清完的，基线记录它；
- **token 与文档一致性 → FAIL**：`DESIGN-TOKENS.md` 必须覆盖全部 `--mc-*` 且不能出现不存在的 token。

`check-layout.mjs` 把交互审计里会反复回归的 5 类问题变成可执行检查（见 §2）；`check-performance.mjs` 把性能预算变成可执行回归门禁（见 §3，`--bench` 参考不设门槛，L-37）。

## 2. `check-layout.mjs` — 布局 / 触控 / 壁纸 / 反馈门禁（v1.0.0）

把「移动端横向溢出、固定壁纸被打断、触控目标过小、alert 式反馈、AI 大库提前加载」变成可执行门禁。背景见 `audit/design-migration/MOBILE-OVERFLOW.md`、`WALLPAPER.md`、`docs/design/INTERACTION-AUDIT.md`。

```bash
# 默认：390 全量（95 页）+ 代表页 1440/360/320（快）
node scripts/design-audit/check-layout.mjs

# 发布前全量四宽度矩阵（慢）
node scripts/design-audit/check-layout.mjs --full

# 触控目标不足也判 FAIL（默认 WARN）
node scripts/design-audit/check-layout.mjs --strict-touch

# 证据归档（JSON 机器可读 + Markdown 人读；写 audit/ 已被 gitignore）
node scripts/design-audit/check-layout.mjs --json audit/design-migration/verify/layout.json \
  --md audit/design-migration/verify/layout.md
```

| # | 检查 | PASS 条件 | 备注 |
|---|---|---|---|
| A | 横向溢出 | `documentElement.scrollWidth - innerWidth ≤ 1px`（每种宽度 × 每个页面） | 溢出会让固定壁纸露出深色兜底（L-34） |
| B | 固定壁纸层 | 非 404 页：`.ghibli-background` 存在、`position: fixed`、rect 覆盖视口、`background-image` 含 `wallImage` | `404.html` 是独立实底主题，豁免 |
| C | 触控目标 | 独立控件（button/`.toolbar-btn`/`.lang-selector-toggle`/`.nav-link`/`.tool-nav-link`/`.remove-btn`/`.mode-btn`/`.download-btn`/select/range 等）≥ 44×44 | 默认 **WARN**；`--strict-touch` 升级 FAIL；正文行内 `<a>` 不算 |
| D | 反馈方式 | `assets/js/*.js` 中**不得**出现 `alert()` 调用（注释除外） | 产品反馈用 `window.mcUI.toast`（L-32） |
| E | 首屏资源 | 初始 HTML（`index.html`、`*/index.html`）不得静态 `<script>` 引入 `onnxruntime` / `face-api` | AI 大库应在用户点击时 `ensureLibs()` 懒加载（ADR-0007 D5） |

- **宽度**：默认 390 全量 + 代表页（`/`、`/zh/`、`/blog/`、`/blog/how-to-make-photo-collage/`、`/about/`、`/contact/`、`/tools/square/`、`/tools/roundedcorners/`、`/privacy/`、`/free-collage-maker/`、`/es/christmas-collage-maker/`、`/__no_such_page__/`）再跑 1440/360/320；`--full` = 四宽度全量。
- **退出码**：`0` 无 FAIL（WARN 允许）；`1` 存在 FAIL；`2` 环境/用法错误（无 Chrome、git 不可用、参数错误）。FAIL 明细写入 `--json/--md`。
- **环境**：本机 Chrome + 离线（`https://*`/`wss://*` 请求被 CDP 阻断）；不依赖线上站点。`404` 用不存在的 URL 触发。

## 3. `check-performance.mjs` — 性能预算门禁（R2 新增）

用途：防"可测量回归"（资源体积、DOM/backdrop 数量、脚本数量），并记录 headless 滚动 A/B 参考。

```bash
node scripts/design-audit/check-performance.mjs                  # 静态 + 390 渲染结构
node scripts/design-audit/check-performance.mjs --bench          # 额外跑 blur A/B 参考（仅记录）
node scripts/design-audit/check-performance.mjs --json out.json --md out.md
```

- 预算文件：`scripts/design-audit/performance-budget.json`（含 rationale/caveats/基线）
- 检查项：A 静态 gzip 体积；B 390×844 渲染结构（DOM/深度/backdrop/样式表/外部脚本）；C 滚动 A/B（INFO）
- 退出码：0 预算内（WARN 允许）；1 超预算；2 环境/用法错误
- 注意：headless 的 rAF 锁 60fps、GPU 合成虚拟化，**不能**用其 FPS 差异证明 blur 优化收益；真机复核见 ADR-0008。

## 4. `run-token-audit.mjs` 快速使用

```bash
# 日常检查（摘要 + Top 列表 + 文档一致性）；退出码 0=PASS 1=FAIL 2=环境错误
node scripts/design-audit/run-token-audit.mjs

# 证据归档（JSON 机器可读 + Markdown 人读；写 audit/ 已被 gitignore）
node scripts/design-audit/run-token-audit.mjs --report-all \
  --json audit/design-tokens/audit-$(date +%Y%m%d-%H%M).json \
  --md  audit/design-tokens/audit-$(date +%Y%m%d-%H%M).md

# 人工复核「存量债务下降」后固化基线（会改 scripts/design-audit/baseline-design-tokens.json）
node scripts/design-audit/run-token-audit.mjs --update-baseline

# 打印 token 清单（Markdown 表格行，用于重新生成 DESIGN-TOKENS.md §3）
node scripts/design-audit/run-token-audit.mjs --list-tokens
```

参数：`--report-all`（输出全部违规明细）、`--check-docs`（默认开启，可显式写）、`--skip-doc-check`、`--json <path>`、`--md <path>`、`--max-list <n>`（默认 20）、`-h`。

## 5. 扫描与判定口径

| 对象 | 扫描内容 | 违规判定 |
|---|---|---|
| `*.html` | 每个 `<style>` 块内的声明；每个 `style=""` 属性内的声明 | 颜色值不在 token 集合；font-size 归一后不在 token 字号集合；border-radius px 不在 token 圆角集合；`style=""` 数量超过基线 |
| `*.css` | 仅声明值（不扫选择器/at-rule 条件） | 同上；百分比圆角（装饰形状）与相对字号（em/%/clamp）不判违规 |
| `*.js`（v1.1 起） | **运行时样式**：① 样式对象字面量/赋值（`fillStyle`/`strokeStyle`/`shadowColor`/`backgroundColor`/`background`/`color`/`gradient:`）；② `el.style.X = '#...'`；③ `el.style.cssText = '...'` | 颜色不在 token 集合 → 违规（`jsColors` 计数）；注释行跳过；不扫描 canvas 运行时计算色 |
| `--check-docs` | `docs/design/DESIGN-TOKENS.md` 中出现的 `--mc-*` | 文档缺 token / 文档多出 token → FAIL |

颜色归一化：hex3/4/6/8、`rgb()/rgba()`、`hsl()/hsla()`、`white/black/transparent` 统一为 `r,g,b,a`，alpha 允许 ±0.011（覆盖 `#00000040` ↔ `rgba(0,0,0,.25)` 的取整差）。

排除：`audit/`、`docs/`、`scripts/`、`node_modules/`、`.git/`、`.vercel/`、`.trae/`；token 文件本身；非运行时根脚本（`check_keys.js`、`sync_keys.js`）。

## 6. 基线机制

- 基线文件：`baseline-design-tokens.json`，记录**每个文件**的 `colors/fontSizes/radii/inlineStyleAttrs/jsColors` 计数 + 总量 + tokenHash + gitHead。
- 判定：当前 > 基线 = 漂移 FAIL；当前 < 基线 = 改进 INFO（提示复核后 `--update-baseline`）。
- 基线是**存量债务快照，不是目标值**：禁止为了让审计变绿而放宽/删除基线；更新基线必须人工复核下降数字并提交证据。
- token 集合变化（新增/改值）不直接 FAIL，但会引起计数变化：新增 token 通常让债务下降，复核后更新基线。
- **注意 v1.0 的 `jsColors: 0` 不是"JS 无裸值"**——v1.0 未扫描 JS；v1.1 首次扫描必须人工核对 JS 项（L-31）。

## 7. 退出码

| 退出码 | 含义 |
|---|---|
| `0` | PASS：无新增漂移、token/文档一致、布局门禁无 FAIL |
| `1` | FAIL：新增漂移 / 既有违规上涨 / 文档不一致 / token 未定义引用 / 布局门禁 A/B/D/E FAIL |
| `2` | 环境或用法错误（无 token 文件、基线缺失且未 `--update-baseline`、无 Chrome、参数错误） |

## 8. 已知限制

`run-token-audit.mjs`：

- 压缩 bundle 是单行文件 → 违规的 `file:line` 恒为 `:1`，需用 `--report-all` 的值/属性 + 源码搜索定位。
- 颜色只按字面量比对 token；不解析 `color-mix()`、CSS 自定义属性组合、`style.setProperty('color', …)` 的运行时注入（v1.1 的 JS 扫描只覆盖样式赋值/对象字面量/cssText）。
- `style=""` 用正则识别（不构建 HTML AST）；跨行属性、罕见自定义元素可能漏检。
- 不检查布局属性（display/grid/position）与间距值（间距为 4px 阶梯建议项，非门禁）。
- 不判百分比圆角与相对字号（em/%/clamp），它们可能来自装饰形状或流式排版。
- 文档一致性只校验 token **名称**，不校验值列是否同步；值以 `design-tokens.css` 为准。

`check-layout.mjs`：

- 只验证 4 个宽度（1440/390/360/320）；未覆盖真机 iOS Safari/Android 的 `position: fixed` 与 `overflow` 行为（Preview/真机仍需抽查）。
- 离线环境缺少外部字体/图标/广告，换行宽度与线上可能有 1–3% 差异。
- 触控目标默认 WARN（视觉尺寸可小于 44px，热区用 padding/伪元素扩大）；需要强约束时加 `--strict-touch`。
- A 项只测整页横向溢出，不测局部被裁切/`overflow: hidden` 掩盖。
- 不测首屏主操作 y 坐标（R1 工具优先需用 `audit/design-migration/` 截图/metrics 人工复核，见 L-33）。

## 9. 维护记录

- **2026-11-06（R2）**：新增 `check-performance.mjs` v1.0.0 + `performance-budget.json`（A 静态 gzip 体积 / B 390×844 渲染结构 / C 滚动 A/B 参考）；性能判据 = 超预算 FAIL、>90% WARN，**headless FPS 不作门槛**（L-37）；与 `scripts/functional-audit/run-mobile-touch.mjs` 一起构成 R2 门禁链（L-38/L-39）；文档 §1–§9 重新编号（check-performance 为 §3）。

- **2026-11-06（R0/R1 交互改造）**：新增 `check-layout.mjs` v1.0.0（溢出/壁纸/触控/alert/AI 预加载 5 项）；`run-token-audit.mjs` 增加 **JS 运行时裸色扫描**（v1.1：样式赋值/对象字面量/cssText，对应 L-31）与 `--check-docs` 显式参数；基线新增 `jsColors` 计数。脚本 `VERSION` 常量随后续同步。
- **v1.1.0（2026-11-06，R0 交互改造后）**：新增 JS 运行时样式扫描（`.style.X = '#...'` / `style.cssText`），当前 JS 裸色 **0**；基线刷新为 **103 文件** / token 273 / hash `3db11395ede1`。
- **v1.0.1（2026-11-06，G1 改造后）**：新增 `--check-docs` 兼容参数（默认即检查）；已 token 化的 `font-size: var(--mc-font-size-*)` 不再计入"相对字号"；基线刷新为 **103 文件**（新增 `components.css`）/ 颜色 338 / 字号 18 / 圆角 153 / 相对 363 / 内联样式 1,560 / `<style>` 95。
- **v1.0.0（2026-11-06）**：首版。颜色/font-size/border-radius/inline-style 基线比对 + 文档一致性 + 未定义引用检查；首次基线（95 页 + 3 CSS + 3 JS，颜色债务 338 / 字号 18 / 圆角 153 / 内联样式 1,560）。

修改脚本后：先跑 `--help` 与一次真实扫描，再更新本 README 与维护记录；行为变更（判定口径/基线字段）需在 ADR/教训中留痕。
