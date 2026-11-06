# ADR-0006: Design Token 单一事实源与存量设计统一（G0）

- 状态：**Proposed（G0 + G1 已在分支执行，待维护者批准合并 / Preview / 生产；未部署）**
- 日期：2026-11-06
- 分支：`docs/design-tokens`（基线 commit `fedc3ee`）
- 关联：`docs/design/DESIGN-TOKENS.md`（规范 v1.0）、`docs/design/COMPONENT-RECIPES.md`（组件配方）、`assets/css/design-tokens.css`（唯一事实源）、`scripts/design-audit/run-token-audit.mjs`（门禁）、`scripts/design-audit/baseline-design-tokens.json`（存量基线）、[L-20261106-30](../lessons/L-20261106-30-design-values-hardcoded-and-drift.md)、L-02（手写静态页漂移）

## 背景

MeCollage 是**无构建、无模板、无 CI** 的静态站，设计样式没有单一事实源，已经系统性漂移：

1. **页面形态**：`git ls-files '*.html' | wc -l` = **95** 个手写页面（root 15 + blog 9 + tools 4 + 本地化 67），5 套语言副本（`/`、`/zh/`、`/tw/`、`/ja/`、`/es/`）各抄一份；任何样式改动都要人工同步 5 份（L-02）。
2. **外部 CSS 产物 3 个**：`assets/index-vAuRGWiM.css`（59,487B，单行压缩）、`assets/pages-C2UaL6ML.css`（16,733B）、`assets/css/i18n.css`（1,415B）。其中 2 个压缩 bundle 是构建产物、无源码（`git log --oneline -- assets/index-vAuRGWiM.css` 只有 deploy 提交），无法重新生成；pages bundle 的 121/121 条规则是 index 的子集，但仍有 66 页额外加载（重复下载）；i18n.css 是手写旧实现，10/10 条规则不在 index bundle 中。
3. **设计值 91.6% 硬编码**：颜色类属性声明 **5,083** 条中 **4,657 条（91.6%）**是字面色值，纯 `var()` 仅 28 条；全量语料 4,832 处 / 239 种写法。两个 bundle 的 `:root` 共 **22 个旧变量**，全站仅 34 处 `var()` 引用，其中 **11/22 从未被引用**（50% 是死定义）。
4. **旧文档与代码相反**：根目录 `design-system.md` 声明 **47 个变量**，其中 **42 个在产物 CSS 中从未定义**（`--radius-*`、`--spacing-*`、`--breakpoint-*` 等）；5 个同名不同值，最典型是它写 `--primary-color: #8fd68f`，产物 `:root` 实际是 `#4A90E2`（蓝）。该文件已被 `.vercelignore` 排除、未部署，但会误导后续会话按错误值写代码。
5. **内联样式是最大样式面**：95 个 `<style>` 块 / 664,467B / 14,366 条声明，归一化后只有 **31 个不同版本**（去重 166,852B）；`index.html` 的 24,855B 块（归一化口径）复制 5 份，4 个工具页各复制 5 份，privacy/terms 共享 10×5,020B 块；另有 1,560 个 `style=""` 属性。
6. **组件冲突无裁决**：`assets/css/i18n.css` 的 `.lang-selector-toggle/.lang-menu/.lang-option` 与主 bundle 同名但值不同（旧：`#333` 深灰 / 4px 圆角 / z-index 1000；新：玻璃 pill / 999px 胶囊 / z-index 50）。54 页加载 i18n.css，均在两个 bundle 之后（如 `index.html:84-86`），其中 10 页内联块又定义同名规则 → 同一组件存在两套样式，**最终生效取决于加载顺序（代码层推断，未做像素级渲染取证）**。

结论：问题不是"不够好看"，而是"会继续漂"——同一语义有 2–4 个值（标题绿 `#8fd68f`/`#66BB6A`；面板圆角 20/24/30px；按钮圆角 12/14/20px；正文白 0.85/0.88/0.9/0.95），新页面作者只能"抄最近的页面"，复制继续产生漂移。必须建立**单一事实源 + 可执行门禁**，并给存量债务一条可验证的下降路径。

## 决策

### D1 以 `assets/css/design-tokens.css` 的 `--mc-*` 为唯一事实源（三层结构）

- token 文件定义 **273 个 `--mc-*`**，分三层：**Tier 1 原始值**（`--mc-green-*` 等色板，仅装饰/渐变）→ **Tier 2 语义值**（`--mc-surface-*`/`--mc-text-*`/`--mc-border-*`/`--mc-shadow-*`/`--mc-font-size-*` 等，新代码默认使用）→ **Tier 3 组件值**（`--mc-card-*`/`--mc-panel-*`/`--mc-button-*`/`--mc-input-*`/`--mc-focus-ring-*`）。
- token 文件**只声明变量、不写选择器**；页面按约定顺序引用（bundle → i18n.css → token 文件 → 页面内联 `<style>`）。
- **不在 token 文件重定义旧变量**（`--primary-color` 等）。旧 `--primary-color` 是蓝色 `#4A90E2`，而页面标题/链接实际用薄荷绿 `#8FD68F`，同名不同义；重定义会改变存量页面视觉。迁移按 `DESIGN-TOKENS.md` §8 的旧值→token 映射表**逐值替换**，不做兼容别名。
- `--mc-green-300`（`#8fd68f`）是品牌锚点，修改它等于改全站识别度，需要新 ADR + 维护者批准。

### D2 存量迁移：统一层 + 页面链接注入 + 精确等价 token 化，分 G0–G4 渐进替换

不手改压缩 bundle、不一次性重写 95 页；按 `DESIGN-TOKENS.md` §7 分阶段，每阶段单独一个 C2 变更：

| 阶段 | 内容 | 范围 | 门禁 |
|---|---|---|---|
| **G0（本次 ADR）** | token 文件 + 规范 + 组件配方 + 预览页 + 审计脚本 + 基线；旧 `design-system.md` 改为入口指针 | 新增文件 + 文档 | C1：分支 + 人工审阅 + 维护者合并批准；不部署/不影响页面 |
| **G1（本次已执行）** | 交付 `assets/css/components.css`；`scripts/design-system/migrate.mjs` 给 94 页注入 tokens/components 并做精确等价 token 化（6,955 处）；修复 29 页 head 内游离 CSS 文本；404.html 排除 | 94 个 HTML + 2 个新 CSS | 本地审计 PASS + 功能 52/0/1 + SEO 32/0/0 + before/after 截图；**Preview 与生产待批准** |
| **G2** | 收敛重复内联块（31 版本→去重 166,852B；index 5×24.8KB 等）；删除 i18n.css 重复的 `.lang-selector*` 块；评估 66 页的 pages bundle 冗余引用 | 约 25 页 | C2：Preview + `verify-site` + 功能/SEO harness + 逐页视觉对比 |
| **G3** | 41 个纯内联页面接入 token/components；bundle 退化为历史 class 兜底 | 95 页 | 同 G2，分批（每次 ≤10 页），基线逐步下降 |
| **G4（可选）** | 用覆盖层替代旧 bundle 关键组件或重建可维护源 CSS；删除 i18n.css；审计基线趋近 0 | 全站 | C3（样式重构 + 全量回归 + ADR） |

- 迁移原则：**先精确等价替换（零视觉变化），再做语义合并**；语义合并（如 15px→16px）必须 Preview 截图对比并写进证据。
- 压缩 bundle **禁止手改**（无源码、不可重生成、不可 review）；用 components/覆盖层替换。
- 新页面/新组件从 G1 起只准用 `--mc-*`；存量页面在 G2/G3 迁移完成前按基线计入债务，不判错。

### D3 门禁：审计脚本 + 基线机制

- 命令：`node scripts/design-audit/run-token-audit.mjs`。**默认运行即包含** DESIGN-TOKENS.md 与 token 文件的一致性检查（缺 token/多 token 均 FAIL）；`--skip-doc-check` 可显式跳过。脚本没有 `--check-docs` 参数（文档中出现的该写法是错的，见"未做/后续"）。
- 判定：颜色 / `font-size` / `border-radius` / `style=""` 的值不在 token 集合内 → 记违规；**新文件有违规**、或**既有文件计数比基线上涨**、或文档与 token 不一致 → FAIL（exit 1）；无漂移 → PASS（exit 0）；环境/用法错误 → exit 2。
- 基线 `scripts/design-audit/baseline-design-tokens.json` 是**存量债务快照，不是配额**：基线快照覆盖 101 个文件 / token 外颜色 338（不同值 144）/ font-size 18 / 圆角 153 / 相对字号 210 / `style=""` 1,560 / `<style>` 块 95（生成于 `assets/css/components.css` 创建前；当前扫描 102 个文件，新增文件 token 外违规 0，不触发 FAIL）。违规数下降需人工复核后 `--update-baseline` 固化；**禁止为了让审计变绿而放宽基线**。
- 新代码标准是 **0 违规**；门禁只管"不再新增漂移"，下降靠 G2/G3。

### D4 视觉统一原则：「只统一、不重设计」

- **不改**信息架构、文案、URL 结构（H9）、广告/Publisher ID/GA4（H5）、账户级设置（H8）。
- **只做**：① 同一语义的设计值统一（同义颜色/圆角/阴影/字号收敛到 token）；② 修组件冲突（i18n.css vs bundle）；③ 补交互与可访问性细节（统一 `--mc-focus-ring-*` 键盘焦点、`prefers-reduced-motion`、hover 反馈一致）。
- 专题页主题色（生日/婚礼/圣诞等）走 `--mc-color-theme-accent` 页面级覆盖，**不再复制 5 份内联色**；具体色值作为"专题主题色"组走 token 提案，不散写。
- **不顺手改产品默认值**：导出默认底色 `#ffffff`、html2canvas `scale 2`、文字层默认 `24px/#000000/bold`、工具页 canvas 默认（blur 20 / JPG 85 / size 1200 等）属产品设计决策，要纳入 token 需单独立 ADR；本轮迁移不得改变导出结果。

## 备选方案与拒绝理由

| 方案 | 拒绝理由 |
|---|---|
| 直接改两个压缩 bundle | 无源码、不可重新生成（构建 provenance 已丢失）；minified 单行产物无法 review/diff；bundle 承载全部存量样式，手改回归风险不可控 |
| 一次性全站重写 95 页 | 无模板兜底，95 页 + 5 语言是最大漂移来源（L-02）；一次性大 diff 无法逐页 Preview 验收，违反最小改动与 G3/G4 分级门禁 |
| 引入构建系统（Vite/PostCSS/Tailwind 等） | 项目刻意保持零构建/零依赖静态站（AGENTS §3），会改变部署链路、验证方式与维护成本；需单独立 ADR + 维护者决策，不应作为 design token 的前置条件。G0 用纯 `:root` CSS 变量即可满足需求 |
| 保留双事实源（旧 design-system.md + 新 tokens） | 旧文档已与产物矛盾（47 变量 42 未实现、`--primary-color` 相反），双源正是漂移根因；改为入口指针，单一事实源 |

## 影响到哪些地方

- **代码**：新增 `assets/css/design-tokens.css`（273 token）、`assets/css/components.css`（统一层 + 精修，已被 94 页引用）、`scripts/design-audit/`（脚本 + 基线）、`scripts/design-system/`（迁移脚本）、`docs/design/`（规范 + 配方 + 预览页 + 页面规律报告）；**不改任何压缩 bundle**。94 页各 +2 行 `<link>` + 等价值 token 化（6,955 处，零视觉变化）；29 页 head 内游离 CSS 文本删除（历史 HTML bug 修复）。
- **流程**：新 UI/样式改动增加一条审计命令（C1/C2 门禁）；后续 G1–G3 每个阶段走 C2（分支→Preview→证据→批准）。
- **部署面**：`docs/`、`scripts/`、`AGENTS.md`、`design-system.md` 已在 `.vercelignore`；`assets/css/design-tokens.css` 与 `assets/css/components.css` 会随站点部署；G1 后 94 页引用（404 除外），样式在浏览器端生效，属本次 C2 变更的实际影响面。
- **文档**：旧根目录 `design-system.md` 重写为入口指针；`AGENTS.md` 增加 3 处入口（开工必读/文档索引/高频错误）。

## 验证

- 本地门禁（2026-11-06，Node v24.19.0）：
  ```bash
  node scripts/design-audit/run-token-audit.mjs
  # [design-token-audit] token 273 个（assets/css/design-tokens.css，hash 3db11395ede1）
  # [design-token-audit] 扫描 102 个文件：token 外颜色 338（JS 0）、font-size 18、圆角 153、内联 style 1560
  # [design-token-audit] PASS：无新增设计漂移   → exit 0
  ```
- 文档一致性：默认运行检查 `DESIGN-TOKENS.md` 覆盖全部 273 个 token、无未知 token（本次 PASS；缺/多 token 会打印"文档不一致"并 exit 1）。
- 基线（G1 后刷新）：**103** 文件 / colors 338 / fontSizes 18 / radii 153 / relative 363 / inlineStyleAttrs 1,560 / styleBlocks 95；token 273 / hash `3db11395ede1`（`baseline-design-tokens.json`）。
- G1 改造结果（2026-11-06，本分支本地）：94 页接入；`var(--mc-*)` 引用 0 → **6,955**；内联颜色字面量 5,064 → **245**（−95.2%）；29 页游离 CSS 修复；结构检查仅 +2 `<link>/页`、无未定义变量。
- 回归：`functional-audit` **52 PASS / 0 FAIL / 1 WARN**；`seo-audit` **32 PASS / 0 FAIL / 0 WARN**；视觉回归复核 #2 **无新增回归**（R1 移动溢出清零、R2 旧版 `.container` 宽度/列数恢复、R3 CTA 居中、R4 表格对齐原值、R5 移动 h2 24px；R6 对比度 6.83:1 通过 AA 接受；404 控制组 0.000%），详见 `audit/design-migration/REGRESSION.md`。
- G0/G1 均为本地分支改造，未部署；进入 Preview/生产必须由维护者批准（H1/H2）。

## G1 执行记录（2026-11-06，本分支）

- 统一层 `assets/css/components.css` 完成：背景层兜底（修复长页白底玻璃/41 页缺壁纸）、组件统一（标题/面板/卡片/按钮/表单/上传/FAQ/footer/lang）、交互与可访问性精修（focus-visible、reduced-motion、hover 一致性、选区/滚动条、等宽数字、`text-wrap: balance`）、标准类 `.mc-*`。
- `scripts/design-system/migrate.mjs`：`--inject`（94 页）+ `--tokenize`（精确等价替换 6,955 处：颜色 4,248 / font-size 1,006 / 圆角 731 / 模糊 439 / 整段阴影 531）+ 修复 29 页 head 内游离 CSS 文本；幂等、dry-run/apply 分离、`git checkout -- '*.html'` 可回滚。
- 不手改压缩 bundle；i18n.css 冲突由 `components.css` 用 `body` 前缀覆盖（删除旧块留 G2）。
- 修复移动端横向溢出（改造前既有 bug）：首页 218px、5 个 free-collage-maker 106–187px、博客文章 71px、320px 下 30 页 ×11px；修复后 390/360/320 三宽度 94 页全 0 溢出，壁纸层在可滚动范围完整（`audit/design-migration/MOBILE-OVERFLOW.md`）。
- 文档：`docs/design/PAGE-PATTERNS.md`（页面规律 + 改造报告）、`docs/design/DESIGN-TOKENS.md` §1.3/§7/§11、`docs/lessons/README.md` 已补 L-20261106-30 索引；审计脚本新增 `--check-docs` 兼容参数并修正"已 token 化的 font-size 被计入相对字号"口径。

## 合并前仍需 Lead/维护者处理

- 走 C2 流程：push 分支 → Vercel Preview → `node scripts/verify-site.mjs --base <preview>` + 功能/SEO harness + `audit/design-migration/` 截图复核 → 维护者明确批准 → 生产部署（AI 不自主部署，H1）。
- G2（收敛 31 个重复内联块、删除 i18n.css 重复 `.lang-selector*`、评估移除 66 页冗余 pages bundle）与 G3（语义合并 15px→16px、#333→surface、专题主题色→`--mc-color-theme-accent`）尚未开始，需独立 C2 变更。
- 视觉回归报告 `audit/design-migration/REGRESSION.md` 由视觉基线任务产出；如有 layout 回归需在本分支修复后再进 Preview。

## 回滚

- G0：`git revert` 本分支提交（或删除新增文件 + 恢复旧 `design-system.md`）。页面未引用 token，回滚**零视觉影响**。
- 若 G1 之后回滚：移除页面中的 `design-tokens.css` / `components.css` `<link>` 即恢复原样式（token 变量本身不改变任何既有选择器）；再 `git revert` 对应提交。
- G2/G3 涉及内联块收敛与删除，必须逐阶段独立提交，回滚粒度 = 单阶段提交；视觉回归时按 `audit/design-migration/` 的 before 截图对比。
