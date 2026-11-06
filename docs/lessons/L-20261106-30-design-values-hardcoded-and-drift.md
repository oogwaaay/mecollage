# L-20261106-30 设计值长期硬编码、多语言复制导致全站样式漂移

| 字段 | 值 |
|---|---|
| ID | L-20261106-30 |
| 日期 | 2026-11-06 |
| 状态 | open（已提供 G0 缓解：token 层 + 审计 + 基线；迁移未完成） |
| 严重度 | P1 |
| 证据层 | 代码层 |
| 关联文件 | `assets/index-vAuRGWiM.css:1`（压缩单行）；`assets/css/i18n.css:7-44`；`index.html:87`（24,855B 内联 `<style>` 块起点）；`design-system.md`（重写前的旧版）；`docs/design/DESIGN-TOKENS.md` |
| 发现来源 | design token 全量盘点（`audit/design-tokens/css-inventory.md`、`ui-inventory.md`）+ G0 规范编写 |
| 负责人 | 实施者（G1–G4 迁移执行）；维护者（批准合并、复核基线下降、确认关闭） |

## 症状（可观察到的事实）

取证时间 2026-11-06（Asia/Shanghai），工具 Node v24.19.0 + 仓库内零依赖盘点脚本；证据 `audit/design-tokens/`（本机产物，未入库）。

1. **颜色几乎全是裸值**：颜色类属性声明 **5,083** 条，其中字面色值 **4,657 条（91.6%）**、纯 `var()` 仅 **28 条**；全量语料 4,832 处 / 239 种写法 / 225 个等价组（`audit/design-tokens/css-inventory.md` §2）。
2. **旧变量一半是死的**：两个 bundle 的 `:root` 共 **22 个旧变量**，全站仅 49 次 `var()` 引用 / 14 个名字；**11/22 从未被引用**，仅 `--ghibli-dark-green` 被用 2 次（`css-inventory.md` §7）。
3. **内联 `<style>` 复制成灾**：95 个块 / 664,467B / 14,366 条声明，归一化后只有 **31 个不同版本**（去重 166,852B）；`index.html` 的 24,855B 块复制 **5 份**，4 个工具页各 5 份，privacy/terms 组成 10×5,020B 共享块（`docs/design/DESIGN-TOKENS.md` §1.2/附录 A）。
4. **旧文档与代码相反**：重写前的根目录 `design-system.md` 声明 **47 个变量**，其中 **42 个在产物 CSS 中从未定义**，5 个同名不同值——它写 `--primary-color: #8fd68f`，产物 `:root` 实际是 `#4A90E2`（蓝）。
5. **组件两套样式并存**：`assets/css/i18n.css:7-44` 的 `.lang-selector-toggle/.lang-menu/.lang-option` 与主 bundle 同名不同值（旧：`#333` 底 / 4px 圆角 / z-index 1000；新：玻璃 pill / 999px / z-index 50），54 页在 bundle 之后加载 i18n.css（如 `index.html:84-86`），其中 10 页内联块又定义同名规则。

## 影响

- **对用户**：同一语义有 2–4 个值（标题绿 `#8fd68f`/`#66BB6A`；面板圆角 20/24/30px；按钮圆角 12/14/20px；正文白 0.85/0.88/0.9/0.95），页面之间观感不一致；语言选择器在部分页面是深灰 4px 旧样式、部分是玻璃胶囊。
- **对维护成本**：改一处样式要改 5 份语言副本、甚至 10 份（privacy/terms）；新页面作者只能"抄最近的页面"，复制继续产生漂移；压缩 bundle 无源码，不能重新生成。
- **对 SEO / 广告 / 安全 / 成本**：不直接改变 URL/广告/安全面（H5/H9 未受影响）；间接影响是复用错误样式后需返工、以及在无构建站点里引入"改一个值不知影响多少页"的不可控风险。
- **影响面量化**：95 个手写 HTML / 5 套语言副本 / 3 个外部 CSS 产物（2 个无源码）/ 664,467B 内联样式（31 个版本）/ 1,560 个 `style=""` 属性 / 4,657 条裸色值。

## 根因

- **直接原因**：设计值以**字面量**形式散落在 3 个 CSS 产物 + 95 个内联 `<style>` 块 + 1,560 个 `style` 属性 + JS 运行时默认值中，没有单一事实源；i18n.css 旧实现与主 bundle 并存且从未清理，造成同组件两套样式。
- **为什么会发生**：① 无构建/无模板（AGENTS §3），页面靠手写复制，5 语言副本把一处改动放大 5 倍（L-02）；② 长期没有 token 约束和审计门禁——漂移不会在 Preview 前暴露；③ 唯一一份"设计系统"文档（重写前 `design-system.md`）47 个变量 42 个未实现、主色与产物相反，**文档本身在制造错误事实**；④ 压缩 bundle 无源码，历史样式只能叠加不能重构，新样式只能继续写死。
- **结构性**：即使文档写对，只要"允许在页面里写裸值"，无构建站点就无法阻止下一次漂移——必须把规则变成**可执行的检测命令**（见检测方法）而不是"下次注意"。

## 规则（以后必须 / 禁止做什么）

必须：

1. **新 UI/新页面只准用 `--mc-*`**：颜色、字号、圆角、阴影、模糊、动效、层级全部走 token；断点因 CSS 变量不能用于 `@media`，按 `DESIGN-TOKENS.md` §4.6 写**已登记的字面值**（768/992 优先），新增断点需登记。
2. **新增设计值先提案**：在 `assets/css/design-tokens.css` 加 token（含用途注释）+ 在 `DESIGN-TOKENS.md` §3 加表格行 + 至少一个使用点，三处同一次变更内同步；不允许在页面里临时造值。
3. **页面不得复制其他页的内联 `<style>` 块**；跨页面复用样式放 `assets/css/components.css`（G1 起使用，初版已创建）并在页面引用。
4. **多语言 5 份同步**（`/`、`/zh/`、`/tw/`、`/ja/`、`/es/`）：改样式必须在同一变更内检查 5 份头部与内联块（L-02/L-25）。
5. **改样式必须跑 token 审计**：`node scripts/design-audit/run-token-audit.mjs` 必须 PASS（exit 0）才能进 Preview；涉及页面/多语言/SEO 再跑 `scripts/seo-audit/run-seo-checks.mjs`；功能类跑 `scripts/functional-audit/run-tests.mjs`；部署类跑 `scripts/verify-site.mjs`（AGENTS §4）。
6. **迁移必须精确等价替换**；语义合并（如 15px→16px）先做 Preview 截图对比，把差异写进证据，再提交。
7. **token 集合变化后**必须同步 `DESIGN-TOKENS.md` §3 表格；审计默认会校验"缺 token / 多 token"。

禁止：

1. 在页面/组件里新增裸 `#hex` / `rgba()` / 裸 `font-size` / 裸 `border-radius` / `rgba(0,0,0,x)` 背景（存量基线内的旧值除外；**新代码标准是 0 违规**）。
2. 用 `--primary-color` 等旧变量名作新 token 别名，或在 token 文件里重定义旧变量——旧 `--primary-color` 是蓝色 `#4A90E2`，与标题绿 `#8FD68F` 语义冲突，重定义会改变存量页面视觉。
3. 为了让审计变绿而 `--update-baseline` 放宽基线（必须人工复核"违规数确实下降"后才可固化）。
4. 手改压缩 bundle（`assets/index-*.css`、`assets/pages-*.css`）：无源码、不可重生成、不可 review；用覆盖层/components 替换。
5. 顺手改产品默认值（导出底色 `#ffffff`、html2canvas `scale 2`、文字层默认 `24px/#000000/bold`、工具页 canvas 默认等）——需单独立 ADR，不能用 token 迁移夹带。
6. 删除 `i18n.css` 重复的 `.lang-selector*` 块前，不做 5 语言 × 3 类页面（首页/工具页/内容页）的视觉核对。

## 检测方法（命令 / 脚本）

```bash
cd /Users/keyi/mecollage

# 1) 主门禁：漂移 + 基线比对 + DESIGN-TOKENS.md 与 token 文件一致性（默认全部执行）
node scripts/design-audit/run-token-audit.mjs
```

当前（2026-11-06 G0+G1）期望输出，exit **0**：

```
[design-token-audit] token 273 个（assets/css/design-tokens.css，hash 3db11395ede1）
[design-token-audit] 扫描 103 个文件：token 外颜色 338（JS 0）、font-size 18、圆角 153、内联 style 1560
[design-token-audit] PASS：无新增设计漂移
```

```bash
# 2) 证据归档（JSON 机器可读 + Markdown 人读，含全部违规明细与最接近 token 建议）
node scripts/design-audit/run-token-audit.mjs --report-all \
  --json audit/design-tokens/audit.json --md audit/design-tokens/audit.md

# 3) 复核 token 数量（当前 273，需与 DESIGN-TOKENS.md §2.3/§3 一致）
node scripts/design-audit/run-token-audit.mjs --list-tokens | wc -l

# 4) 人工确认存量债务下降后固化基线（禁止无复核直接跑）
node scripts/design-audit/run-token-audit.mjs --update-baseline

# 5) 查看真实参数（--check-docs 为兼容参数，默认即检查；--skip-doc-check 跳过）
node scripts/design-audit/run-token-audit.mjs --help
```

判定标准：

- **通过**：输出 `PASS：无新增设计漂移` 且 exit 0；token 数 = 273；无"文档不一致"提示；违规计数 ≤ 基线（颜色 338 / font-size 18 / 圆角 153 / inline style 1560），且这些是**存量债务**，不得上涨。
- **复发/漂移（必须修，不得进 Preview）**：exit 1；出现 `新文件漂移：<file>`、`漂移上涨：<file> <key> <from> → <to>`、`文档不一致：缺少 N 个 token、文档多出 M 个 token` 或 `FAIL：存在设计漂移或 token/文档不一致`。
- **下降（预期，需复核）**：出现 `违规下降 N 处；复核后可跑 --update-baseline 固化` → 人工核对 diff 后固化基线，不允许直接放宽。
- **注意**：`--check-docs` 已作为兼容参数接受（默认行为即检查；`--skip-doc-check` 可跳过）。`audit/` 是本机产物（`.gitignore`/`.vercelignore` 排除），不入库、不部署。
- **G1 采用度量（2026-11-06）**：`var(--mc-*)` 引用 0 → 6,955；HTML 内联颜色字面量 5,064 → 245；94 页接入 tokens/components；29 页 head 内游离 CSS 修复。等价值 token 化不改变"token 外"计数，存量债务下降要等 G3 语义合并。

## 反例（本项目的真实反面样本）

1. **`index.html:87` 起的 24,855B 内联 `<style>` 块复制 5 份**（5 个语言首页；全站 95 块 → 31 个不同版本，664,467B → 去重 166,852B）。
   - 为什么错：任何全局样式改动要改 5 份，且 5 份已经出现微差；审计基线里这些文件持续带 token 外裸值，新页面"抄最近的页面"就又复制一遍。
   - 当时正确做法：G1 建 `assets/css/components.css`，G2 把公共块抽到共享 CSS 并在 5 份页面引用，内联 `<style>` 只保留该页独有布局（≤50 行、只用 token）。
2. **`assets/css/i18n.css:7-44` 的旧语言选择器**：`.lang-selector-toggle { background:#333; border-radius:4px; font-size:14px }` 在 54 页加载，且都在 bundle 之后（`index.html:84-86`），与 bundle 的玻璃 pill（`#00000047` / 999px / 0.85rem）同名冲突；其中 10 页内联块又定义同名规则。
   - 为什么错：同一组件两套样式、无事实源，最终生效取决于每个页面的加载顺序（代码层推断：`.lang-selector` 在 i18n.css 与内联块之间谁后加载谁赢；未做像素级渲染取证）。
   - 当时正确做法：G2 删除 i18n.css 中重复块（保留必要的 `.lang-menu-backdrop` 等结构样式），统一到 bundle/token，并做 5 语言 × 3 类页面视觉核对。
3. **重写前的根目录 `design-system.md`**：47 个变量 42 个在产物 CSS 中从未定义；`--primary-color: #8fd68f` 与 `assets/index-vAuRGWiM.css:1` 的真实 `--primary-color:#4A90E2` **相反**；断点写的 576/1200 也不存在（实际主断点 768/992）。
   - 为什么错：文档看起来最权威，却与代码相反；新会话按它写"绿色主按钮"，会得到与线上不一致的新漂移，且无法解释"为什么线上是蓝的"。
   - 当时正确做法：把该文件重写为**入口指针**，声明 `assets/css/design-tokens.css` 为唯一事实源；旧值→token 映射表放 `DESIGN-TOKENS.md` §8，由审计的文档一致性检查兜住"文档与 token 不一致"。

## 关联证据

- `audit/design-tokens/css-inventory.md`（本机、未入库）：§2 颜色 4,657/5,083（91.6%）；§6 断点 768/992；§7 22 个旧变量 / 11 未用；§9 重复与冲突。
- `audit/design-tokens/ui-inventory.md`（本机、未入库）：95 个内联块 / 31 个唯一版本 / 1,560 个 `style=""` / JS 运行时默认值。
- `scripts/design-audit/baseline-design-tokens.json`（R0 交互改造后刷新）：103 文件 / colors 338 / fontSizes 18 / radii 153 / relative 363 / inlineStyleAttrs 1560 / styleBlocks 95；token 273 / hash `3db11395ede1`。
- `docs/design/DESIGN-TOKENS.md`：规范 v1.0（token 总表、G0–G4 迁移、检测与门禁）。
- `docs/decisions/ADR-0006-design-token-single-source.md`：本教训对应的决策记录（Proposed）。
- 代码层取证 2026-11-06，基线 commit `fedc3ee`；**未做**线上渲染层取证（i18n.css 最终生效值需 Preview/浏览器渲染对比），相关结论已标注"代码层推断"。

## 后续动作与关闭条件

- [ ] **G1**：`assets/css/components.css` 投入页面引用（token 化按钮/卡片/面板/导航/toast/footer；初版已创建、尚未被页面引用），新页面引用 token+components（实施者；验证：新页面审计 0 漂移 + Preview）。
- [ ] **G2**：收敛重复内联块（31 版本→去重 166,852B）、清理 i18n.css 重复 `.lang-selector*` 块、评估 66 页 pages bundle 冗余引用（约 25 页；验证：5 语言 × 3 类页面视觉对比 + `verify-site` + 功能/SEO harness）。
- [ ] **G3**：41 个纯内联页面接入 token/components，分批 ≤10 页（验证：每批人工复核后基线逐步下降）。
- [ ] **G4（可选）**：覆盖层/源 CSS 重建、删除 i18n.css、审计基线趋近 0（C3 + ADR + 全量回归）。
- [ ] **流程缺口（Lead 处理）**：`docs/lessons/README.md` §3 索引需补本条目一行（GOVERNANCE §6.2 要求；本任务写范围只有 4 个文件，未改索引）。
- [ ] **关闭条件**：① 全站页面接入 token/components，token 外裸值只剩基线中明确登记的装饰/专题主题例外；② `node scripts/design-audit/run-token-audit.mjs` 无 FAIL，且基线经人工复核降到 0（或例外已登记并维护者接受）；③ 证据归档到 `audit/`；④ 维护者确认后状态转 `closed`。G1 完成且有证据后可先转 `mitigated`。

## 变更记录

- 2026-11-06 mitigated：G0 token 单一事实源 + 统一层 + 审计基线；G1 94 页接入 + 6,955 处等价值 token 化 + 29 页 head 游离 CSS 修复（功能 52/0/1、SEO 32/0/0；证据 `audit/design-migration/`）。

- 2026-11-06 open：由 design token 全量盘点 + G0 规范编写发现并记录（证据：`audit/design-tokens/*`、`scripts/design-audit/`）；缓解（token 层 + 审计 + 基线）已提供，迁移未开始，故保持 open。
