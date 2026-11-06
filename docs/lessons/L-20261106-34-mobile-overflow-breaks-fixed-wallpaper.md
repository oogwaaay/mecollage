# L-20261106-34 移动端横向溢出破坏固定壁纸层与布局

| 字段 | 值 |
|---|---|
| ID | L-20261106-34 |
| 日期 | 2026-11-06 |
| 状态 | mitigated（94 个内容页在 320/360/390/1440 四宽度均 0 溢出，check-layout --full PASS 5/0/0；Preview/真机待验） |
| 严重度 | P1 |
| 证据层 | 代码层 + 本地渲染层 |
| 关联文件 | `assets/css/components.css:1530-1580`（§12 移动端响应式收敛中的溢出修复）；`scripts/design-audit/check-layout.mjs:157-184`（A/B 项）；`audit/design-migration/MOBILE-OVERFLOW.md`；`audit/design-migration/WALLPAPER.md` §5.2 |
| 发现来源 | 交互审计 + 移动溢出专项（本地渲染层，CDP 离线） |
| 负责人 | 实施者（布局修复）；审计者（门禁/复验）；维护者（批准） |

## 症状（可观察到的事实）

**改造前**（`documentElement.scrollWidth > innerWidth`，本地渲染层）：

| 宽度 | 问题 |
|---|---|
| 390px | **7 页溢出**：`/`（英文首页）`scrollWidth=608`（**+218px**）；`/free-collage-maker/` +187px；`/es/free-collage-maker/` +168px；`/ja|tw|zh/free-collage-maker/` +106~109px；`/blog/mobile-collage-tips/` +71px |
| 320px | **30 个指南/专题页各溢出 11px**（`.features` 的 `repeat(auto-fit,minmax(250px,1fr))` 在容器 <250px 时列宽仍取 250） |
| 1440px | 0（桌面无溢出） |

直接原因（代码层，MOBILE-OVERFLOW.md §1）：① flex column 子项 `.collage-tool-container` / `.blog-article-container` 带 `margin: 0 auto`，按 min-content 撑开（首页 608）；② 5 列对比表 min-content 516px；③ 长文件名/西语长词不可断（`FamilyVacation2025_Collage` 撑到 461px）；④ `.features` minmax 下限大于容器。

**后果**：固定壁纸层 `.ghibli-background` 是 `position: fixed; inset: 0`，只覆盖**视口**；页面存在横向溢出时，用户横向拖动看到的是 `html` 的深色兜底而不是壁纸 → "壁纸层被打断"，同时内容被裁切/需要横向滚动（WALLPAPER.md §5.2）。

**修复后**（`components.css` §12，`@media (max-width: 768px)`）：容器 `width:100%; margin-left/right:0`；`table { width:100%; table-layout: fixed }` + 单元格 `overflow-wrap:anywhere`；正文/标题长词可断；`.features` 单列 `minmax(0,1fr)`。实测 **390/360/320/1440 × 94 页全部 0 溢出**（MOBILE-OVERFLOW.md §3），桌面不受影响。

## 影响

- **对用户**：移动端出现横向滚动条、内容被裁；横向拖动时固定壁纸中断，露出深色兜底，视觉上像"页面坏了"。
- **对可访问性/体验**：横向滚动是移动端最明显的布局缺陷之一（WCAG 1.4.10 Reflow 精神）；同时破坏 Ghibli 壁纸这一品牌识别元素。
- **对维护**：一旦新增固定宽/grid/minmax 下限，溢出会悄悄回归——需要一个可执行门禁而不是"看一眼没问题"。
- **影响面量化**：改造前 390 宽 7 页、320 宽 30 页；修复后 94 页 × 4 宽度 0 溢出。

## 根因

- **直接原因**：桌面优先的 flex/grid 写法在移动端被 min-content 撑宽（`margin:auto` + shrink-to-fit；表格 min-content；不可断长词；`minmax(250px)` 下限）。无 `overflow-x` 显式约束（即使有 `body{overflow-x:hidden}` 也只是裁剪，仍会裁内容/不影响 fixed 层穿透）。
- **为什么之前没发现**：验收只测桌面与功能；没有"多宽度 × 全页 scrollWidth"的自动检查，也没有"固定层是否覆盖整个可滚动范围"的验收标准。
- **结构性**：壁纸/固定装饰层是**全站视觉基础**，它的完整性依赖"页面无横向溢出"这一隐含契约；契约必须写进门禁（check-layout A+B 项），否则任何一页布局改动都可能打破全站背景。

## 规则（以后必须 / 禁止做什么）

必须：

1. **320 / 360 / 390 宽度下 `documentElement.scrollWidth === window.innerWidth`（允许 ≤1px 误差）**；404 页同样适用（其独立主题也不能横向溢出）。
2. 新增/修改移动端布局后跑 `node scripts/design-audit/check-layout.mjs`（A 项溢出 >1px 即 FAIL；`--full` 四宽度全量）。
3. 修复溢出必须**修根因**：容器 `width:100%` 取代 `margin:auto` shrink-to-fit；表格 `table-layout:fixed` + `overflow-wrap:anywhere`；grid 用 `minmax(0,1fr)` 而非固定下限；长词/URL 允许断行。
4. 固定壁纸层验收同时看**横向可滚动范围**：`position:fixed` 且 rect 覆盖视口（check-layout B 项），非 404 页必须有 `.ghibli-background` + `wallImage`。
5. 桌面（>768px）布局不得因移动修复而变化（媒体查询内）。

禁止：

1. 用 `overflow-x: hidden`（或 `clip`）掩盖溢出——只是裁剪，内容仍被切、fixed 层语义仍不可靠。
2. 只在 390 一个宽度验证就宣布"移动端没问题"（320 才是最容易暴露 `minmax(250px)` 的宽度）。
3. 新增固定宽度元素（`width: 6xx px`）或小于容器的 grid 下限而不做移动断点适配。
4. 为了修移动而顺手改桌面布局/全局 `body` 宽度。

## 检测方法（命令 / 脚本）

```bash
cd /Users/keyi/mecollage

# 1) 门禁：溢出（A）+ 固定壁纸（B）+ 触控（C）+ alert（D）+ AI 预加载（E）
node scripts/design-audit/check-layout.mjs
# 默认：390 全量 + 代表页 1440/360/320
# 期望：A PASS、B PASS、exit 0（C 为 WARN 不阻断，--strict-touch 可升级 FAIL）

# 2) 发布前全量四宽度矩阵（慢；95 页 × 4 宽度）
node scripts/design-audit/check-layout.mjs --full \
  --json audit/design-migration/verify/layout-full.json \
  --md  audit/design-migration/verify/layout-full.md

# 3) 静态复核：壁纸标记覆盖（94/95，缺 404）
git grep -l 'ghibli-background' -- '*.html' | wc -l   # 期望 94

# 4) 历史对照
# audit/design-migration/MOBILE-OVERFLOW.md（改造前/后数据）
# audit/design-migration/after-final/home-mobile.png（390 全页截图）
```

判定标准：

- **通过**：A 项 PASS（四宽度全部 overflow ≤1px）；B 项 PASS（非 404 页壁纸 fixed + 覆盖视口 + `wallImage`）；exit 0；`git grep ghibli-background` = 94。
- **复发**：check-layout A 出现任意 `overflow > 1`（FAIL，exit 1）→ 修复根因后重跑；B 出现 missing/非 fixed → 壁纸层被破坏。
- **注意**：`/404/` 与不存在的 URL 是有意例外（独立实底主题，不做壁纸要求）；验收必须四宽度全跑（320 最容易暴露 `minmax(250px)` 下限），只跑 390 不算完成。

## 反例（本项目的真实反面样本）

- **改造前 `/`（英文首页）390 宽**：`.collage-tool-container` 在 flex column 里带 `margin: 0 auto`，shrink-to-fit 成 608px；内部 `.home-tool-entry` 的 `minmax(260px,1fr)` 两列把它顶宽 → 溢出 218px。
  - 为什么错：横向拖动时固定壁纸中断、内容被裁；这正是"只看桌面看不出来"的典型。
  - 当时正确做法：`body .collage-tool-container { width:100%; margin-left:0; margin-right:0 }`（已落地）。
- **`/free-collage-maker/` 5 列对比表**：min-content 516px（es 版更长 168px）。为什么错：表格天然按内容撑宽；正确做法 `table-layout:fixed` + 单元格 `overflow-wrap:anywhere`（已落地）。
- **`REGRESSION.md` 轮次 #3 记录**：设计统一层落地后首页移动端仍是 `608px`（溢出 218px），直到独立的溢出修复才归零——证明**"视觉统一"不会自动修布局**，必须独立门禁（本次新增 check-layout）。
- **320 宽 30 个指南页 ×11px**：`.features` 的 `minmax(250px,1fr)` 下限大于容器 → 单列 `minmax(0,1fr)` 修复（已落地）。

## 关联证据

- `audit/design-migration/MOBILE-OVERFLOW.md`（改造前 7 页/30 页数据、修复后 390/360/320/1440 × 94 页 0 溢出、截图路径）。
- `audit/design-migration/WALLPAPER.md` §3（10 页 × 4 滚动位置固定性）、§4（对比度）、§5.2（横向溢出与壁纸关系）。
- `audit/design-migration/after-final/home-mobile.png`、`free-collage-maker-mobile.png`。
- 代码层：`assets/css/components.css:1530-1580`（§12）；`scripts/design-audit/check-layout.mjs:157-184`（A/B 判定）。
- **最终门禁结果（2026-11-06 03:2x）**：`check-layout.mjs --full`（95 页 × 1440/390/360/320）**PASS 5 / FAIL 0 / WARN 0** —— A 横向溢出 0、B 固定壁纸全过（404 豁免）、C 触控目标全过、D alert 0、E AI 预加载 0；证据 `audit/design-migration/r1/layout-check-full.{json,md}`；汇总 `audit/design-migration/R1-RESULTS.md`。

## 后续动作与关闭条件

- [ ] Preview / 真机（iOS Safari）复核 320–390 无横向滚动、壁纸完整（本地离线不能完全代表真机 iOS）。
- [ ] 每次移动布局改动后按 runbook §4.6 跑 check-layout；`--full` 在发布前跑一次并归档。
- [ ] 关闭条件：① check-layout A/B 四宽度 PASS（全量矩阵）；② 94/95 页壁纸标记静态检查通过；③ Preview 真机抽查无横向滚动/壁纸连续；④ 证据归档；⑤ 维护者确认。

## 变更记录

- 2026-11-06 open：移动溢出专项记录（390 下 7 页、320 下 30 页；固定壁纸被打断）。
- 2026-11-06 mitigated：`components.css` §12 修复根因；390/360/320/1440 × 94 页 0 溢出（MOBILE-OVERFLOW.md）；新增 `check-layout.mjs` A/B 门禁。
