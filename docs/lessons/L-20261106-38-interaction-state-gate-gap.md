# L-20261106-38 交互后才出现的状态会漏过静态首屏门禁

| 字段 | 值 |
|---|---|
| ID | L-20261106-38 |
| 日期 | 2026-11-06 |
| 状态 | mitigated（两个产品缺陷已修 + 新增移动触控门禁；真机手势待 Preview） |
| 严重度 | P1 |
| 证据层 | 代码层 + 本地渲染层（390×844 CDP 触摸） |
| 关联文件 | `scripts/functional-audit/run-mobile-touch.mjs`（MT-01~06）；`assets/css/components.css:1780`（§15 `position: relative` 修复）、`:1987-2012`（§17 底栏修复）；`scripts/design-audit/check-layout.mjs:190-194`（C 项默认 WARN）、`:176`（仅在 390 首屏量触控）；`audit/design-migration/r2/mobile-touch/report.{md,json}` |
| 发现来源 | R2-A 移动触控回归首跑（2026-11-06，390×844 触摸模拟） |
| 负责人 | 实施者（CSS/门禁）；Lead（修复合并）；维护者（真机确认） |

## 症状（可观察到的事实）

用 `run-mobile-touch.mjs` 在 390×844 真实触摸事件下跑首版回归，发现**两个静态首屏门禁测不到**的产品缺陷：

1. **MT-02 移动导航展开面板跑到页面底部**：点按 ☰ 后 `body.mc-nav-open=true`、`aria-expanded=true`、遮罩显示，但 `.nav-left` 的 `getBoundingClientRect()` = **y=4524**（视口 844、页面高 4753）——面板渲染在整页最底部，用户首屏完全看不到菜单。
   - 根因：bundle 在 `@media (max-width:768px)` 把 `.ghibli-nav` 设为 `position: static`；展开面板 `.nav-left{position:absolute;top:100%}` 的包含块变成整页 `.app-container`（高度=整页），`top:100%` = 页面底部；桌面是 sticky，所以从未暴露。
2. **MT-06 底栏触控目标 14–24px**：上传后底栏 8 个按钮实测宽 **undo/redo 19px、text 14px、其余 24px**（高 48px）。根因：5 个首页内联 `.bottom-toolbar{max-width:300px;gap:1rem;padding:1rem}` + `.toolbar-btn{width:3rem}`，R0 新增 undo/redo 后 8 个按钮在 300px 内被 flex-shrink。
   - 被掩盖：`check-layout` C 项（触控目标）**默认 WARN**、且只在「未上传首屏」量（底栏 `display:none`），两个条件叠加导致静态扫描一直 PASS。

修复（`assets/css/components.css`，仅移动端媒体查询内）：

- §15：`body .ghibli-nav { position: relative; }` → 面板 y=**60**（顶栏下方），链接在视口内；
- §17：`body.mc-collage-page .bottom-toolbar { max-width:none; width:100%; overflow-x:auto; ... }` + `.toolbar-btn { flex:0 0 auto; width/min-width/height: var(--mc-tap-target-min) }` → 8×**44×44**，页面 `scrollWidth` 保持 390。

修复后：`run-mobile-touch.mjs` **PASS 6 / FAIL 0 / WARN 0**；check-layout 95 页 **PASS 5/0/0**（静态门禁仍 PASS，但真正的证据来自交互后断言）。

## 影响

- **对用户（若未修）**：移动端菜单点开后看不到任何导航项（面板在页面最底部），等于**移动导航不可用**；底栏按钮 14–24px 远低于 44px，误触/点不中，移动端核心操作（撤销/文字/贴纸/AI/导出）难以使用。
- **对门禁**：`check-layout` PASS 给出**假安全感**——静态首屏只覆盖"页面第一次渲染时可见"的控件；上传后才出现的工具栏、点按后才注入的面板都不在扫描面内。
- **对维护**：R0/R1 新增的交互控件（undo/redo、移动菜单）改变了元素数量/定位上下文，但没有"交互后"回归，布局回归无人发现。
- **影响面量化**：5 个首页（编辑器的移动端底栏）+ 94 个页面的移动导航（菜单开合）；移动端用户 100% 命中。

## 根因

- **直接原因**：① 移动端导航 `position:static` 与面板 `absolute;top:100%` 的包含块语义错误；② 底栏固定 `max-width:300px` + 8 个按钮后被 flex-shrink 压扁。
- **为什么静态门禁没发现**：`check-layout.mjs` 是**静态首屏**扫描——底栏在未上传时 `display:none`（不在可见集合），导航面板在未点按时**不存在于 DOM**（由 ui.js 点按后展开/CSS 控制），两者都不在"首屏可见元素"范围内；触控目标默认 WARN 而非 FAIL。
- **为什么本轮才发现**：R1 之后第一次真正在 390×844 用触摸事件跑打开态/上传后状态（`run-mobile-touch.mjs`）；此前 functional 是桌面 1440×1000，不覆盖移动交互态。
- **结构性**：静态门禁与交互态门禁是**互补关系**，缺一就会出现"PASS 但用户用不了"的盲区。

## 规则（以后必须 / 禁止做什么）

必须：

1. **交互后才出现/打开态才可见的状态必须在交互后断言**：上传后的工具栏、菜单/抽屉打开态、toast、modal、搜索结果/空状态等；新增交互控件同批加 `run-mobile-touch.mjs` 或 `run-tests.mjs` 断言。
2. 移动端/布局改动发布前跑 `node scripts/functional-audit/run-mobile-touch.mjs`（390×844 触摸，6 用例），0 FAIL 才进 Preview；用 `--json/--md` 归档。
3. 触控目标发布前用 `node scripts/design-audit/check-layout.mjs --strict-touch` 复核（默认 WARN 不足以阻断）；新增按钮/控件按 `--mc-tap-target-min`（44px）设计。
4. 打开态断言必须验证 **rect 在视口内**（top≥0、bottom≤视口高+1、左右在视口内），不能只查 `display ≠ none`/`aria-expanded`。
5. 布局修复同时验证：修好后控件 ≥44×44、面板在视口内、页面 `scrollWidth ≤ innerWidth+1`（不产生新横向溢出）。

禁止：

1. 只用 `check-layout` 首屏 PASS 就宣布"移动端没问题"（它看不到交互后状态）。
2. 把 `display:none`/未注入的控件当作"已测"（它们不在静态扫描的可见集合）。
3. 只改 CSS/JS 不加交互态断言（下次同类回归仍无人发现）。
4. 用 `position:static` 的容器承载 `absolute;top:100%` 面板而不检查 offsetParent（尤其在移动媒体查询覆盖 sticky/fixed 时）。

## 检测方法（命令 / 脚本）

```bash
cd /Users/keyi/mecollage

# 1) 交互态门禁（390×844 触摸模拟；需本机 Chrome + fixtures）
python3 scripts/functional-audit/make-fixtures.py   # 首次需要（输出 audit/evidence/phase-f/browser/fixtures）
node scripts/functional-audit/run-mobile-touch.mjs
# 期望 PASS 6 / FAIL 0 / WARN 0；关注 MT-02（面板 rect 在视口内）与 MT-06（8 按钮 ≥44×44）

# 2) 静态门禁 + 严格触控复核（互补，不替代）
node scripts/design-audit/check-layout.mjs --strict-touch
# 期望 exit 0；--strict-touch 下触控目标不足会 FAIL

# 3) 证据归档
node scripts/functional-audit/run-mobile-touch.mjs \
  --json audit/design-migration/r2/mobile-touch/report.json \
  --md  audit/design-migration/r2/mobile-touch/report.md
```

判定标准：

- **通过**：run-mobile-touch 6/0/0；MT-02 面板 rect（top≥0 且 bottom≤844）；MT-06 控件 ≥44×44；`--strict-touch` PASS；无新增横向溢出。
- **复发**：面板 y 远离视口（如数千 px）、按钮宽 <44px、或 run-mobile-touch 出现 FAIL → 先查移动媒体查询的 `position`/包含块与固定宽度/flex-shrink。
- **注意**：合成触摸 ≠ 真机（系统滚动惯性、长按菜单、iOS 手势未覆盖）；报告里的 WARN 需人工确认，不能当 PASS。

## 反例（本项目的真实反面样本）

- **MT-02 修复前后**：修复前点开 ☰ 后 `aria-expanded=true`、遮罩显示、断言"面板 display≠none"都能过，但面板 y=4524；修复后 y=60。
  - 为什么错：断言只查了"存在/显示"，没查"在视口内"；静态 check-layout 也看不到未打开面板。
  - 当时正确做法：在**点按后**断言面板 `getBoundingClientRect()` 落在视口内，并同时检查链接 ≥44px（本次已实施）。
- **MT-06 修复前后**：修复前 8 个按钮宽 14–24px（高 48px）；视觉上"有按钮"，但触控不可用。
  - 为什么错：check-layout C 项默认 WARN + 只量首屏（未上传时底栏 `display:none`）→ 双重掩盖。
  - 当时正确做法：上传后测量工具栏按钮 rect（本次已实施），并在发布前用 `--strict-touch`。
- **假象**：`check-layout` 首跑 **PASS 5/0/0**（静态）而移动端实际有两个缺陷——说明"PASS"只在本门禁口径内成立。

## 关联证据

- `audit/design-migration/r2/mobile-touch/report.{md,json}`（6/0/0；MT-02/MT-06 实测；截图 `screenshots/07-nav-panel-offscreen-before-fix.png`、`08-nav-panel-fixed-probe.png` 等）。
- `scripts/functional-audit/README.md` §13（移动端触摸回归说明/限制/§13.5 发现记录）。
- 代码：`assets/css/components.css:1780`（§15 nav relative）、`:1987-2012`（§17 底栏）、`assets/js/ui.js`（菜单展开）、`index.html` 内联 `.bottom-toolbar` 样式（R0 后 8 按钮）。
- `scripts/design-audit/check-layout.mjs:176,190-194`（静态/首屏/WARN 口径）。
- ADR-0008 D1/D5；H11 六道门禁。

## 后续动作与关闭条件

- [x] 两个缺陷修复（components.css §15/§17）；mobile-touch 6/0/0。
- [x] 门禁扩展：H11 加入 run-mobile-touch；runbook §4.6 发布链加入该命令与 `--strict-touch`。
- [ ] Preview + 真机（iOS Safari / Android Chrome）复核菜单打开态与底栏触控（合成触摸与真机差异见报告限制）。
- [ ] 后续新增交互控件默认补 MT/functional 断言（写入 AGENTS §8 第 18 条）。
- [ ] 关闭条件：① mobile-touch 6/0/0（已达成）；② `--strict-touch` PASS；③ 真机打开态/触控抽查通过；④ 证据归档；⑤ 维护者确认。

## 变更记录

- 2026-11-06 open：R2-A 首跑发现 MT-02 面板 y=4524、MT-06 按钮 14–24px（静态 check-layout 未测出）。
- 2026-11-06 mitigated：components.css §15/§17 修复；新增 run-mobile-touch.mjs 交互态门禁；复跑 **6 PASS / 0 FAIL / 0 WARN**，check-layout 95 页仍 PASS 5/0/0；规则进入 H11/runbook。
