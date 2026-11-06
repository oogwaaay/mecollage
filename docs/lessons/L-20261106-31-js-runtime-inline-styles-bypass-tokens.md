# L-20261106-31 JS 运行时内联样式绕过设计 token 系统

| 字段 | 值 |
|---|---|
| ID | L-20261106-31 |
| 日期 | 2026-11-06 |
| 状态 | mitigated（R0 已 class 化 + 审计已覆盖 JS；残余裸值与最终审计待清理） |
| 严重度 | P1 |
| 证据层 | 代码层 + 本地渲染层 |
| 关联文件 | `assets/js/mecollage-main.js`（HEAD `fedc3ee`：`createAddImageButton()` :1031/:1045/:1057/:1070-1076；`removeBtn` :910/:919/:920/:931；当前：`createAddImageButton()` :1378 已无内联色，残余 `createImageContainer()` :1223）；`assets/css/components.css:1987-2010`（§18 空位占位）；`scripts/design-audit/run-token-audit.mjs:534-560`（JS 运行时扫描） |
| 发现来源 | 交互审计 P2-2（`docs/design/INTERACTION-AUDIT.md` §3）+ R0 实现 |
| 负责人 | 实施者（清理残余裸值）；维护者/Lead（批准基线复核） |

## 症状（可观察到的事实）

1. **R0 前 JS 直接写死设计色**（HEAD `fedc3ee`，`git show HEAD:assets/js/mecollage-main.js`）：
   - `createAddImageButton()`（HEAD :1031）：`innerContainer.style.backgroundColor = '#f1f5f9'`（:1045）；`btn.style.color = '#94a3b8'`（:1057）；hover 里 `'#64748b'` / `'#e2e8f0'`（:1070-1071）与 `'#94a3b8'` / `'#f1f5f9'`（:1075-1076）。
   - `removeBtn`（HEAD :910）：`style.background = 'rgba(255, 255, 255, 0.95)'`（:919）、`style.color = '#ef4444'`（:920）、`style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)'`（:931）。
   - 后果（本地渲染层）：深色玻璃画布上的空位/删除按钮出现**白色方块**，与统一层视觉不一致（INTERACTION-AUDIT §3 P2-2）。
2. **审计盲区**：`run-token-audit.mjs` v1.0 只扫 `*.html` 的 `<style>`/`style=""` 与 `*.css` 声明，**不扫 JS**；基线 `baseline-design-tokens.json` 里 `jsColors: 0` 是"未扫描"，不是"无违规"。
3. **R0 后（当前工作区，最终态）**：`createAddImageButton()`（:1378）只保留布局样式，颜色由 `components.css` §18（:1987 起，深色玻璃 + dashed 品牌绿）接管；`removeBtn` 只保留定位/尺寸/透明度，颜色/边框/阴影由 `.remove-btn` 样式接管；`createImageContainer()` 的底色改为 `var(--mc-surface-1)`（不再写 `#f1f5f9`）。空位/照片格在深色画布下渲染为深色玻璃（截图见 `audit/design-migration/r0/`）。
4. **v1.1 审计结果（最终）**：`node scripts/design-audit/run-token-audit.mjs` **PASS** —— token 273 / hash `3db11395ede1` / 扫描 103 文件 / token 外颜色 338（**JS 运行时裸色 0**）/ font-size 18 / 圆角 153 / 内联 style 1560；`--check-docs` PASS；基线已 `--update-baseline` 刷新（103 文件、tokenHash `3db11395ede1`）。

## 影响

- **对用户**：画布空位/删除按钮与深色玻璃主体不一致（白方块），破坏"统一、克制"的视觉承诺。
- **对维护**：设计值同时存在于 CSS 与 JS 两处；换 token/主题/专题色时 JS 不会跟随，且 code review 与 token 审计都容易漏掉。
- **对门禁**：token 审计写出"JS 违规 0"会制造**假安全感**——最危险的一类治理漏洞（看起来有门禁，实际只覆盖一半代码）。
- **影响面量化**：JS 侧直接样式赋值集中在 `mecollage-main.js`（2,300+ 行，编辑器全部运行时 UI）；本次扫描覆盖 `assets/js/*.js` 全部文件。

## 根因

- **直接原因**：无构建/无模板，JS 运行时用 `element.style.X = '#...'` 直接构造 UI（早期快速实现），没有 CSS class 契约。
- **为何会漏检**：token 审计 v1.0 的设计假设是"设计值在 CSS 里"，因此只扫 HTML/CSS；而运行时 DOM 的颜色/圆角/阴影由 JS 注入，天然不在扫描面内（`scripts/design-audit/README.md` §6 已知限制只提了"不解析 JS 注入"，没有把它当门禁缺口处理）。
- **结构性**：只要 JS 能直接写设计值，"CSS 单一事实源"就是一句口号——必须让审计同时覆盖 JS，并给 JS 规定"只写布局/行为、视觉交给 class/token"。

## 规则（以后必须 / 禁止做什么）

必须：

1. **JS 只写布局/行为样式**（位置、尺寸、透明度、`display`、`transform` 等），颜色/背景/边框/阴影/圆角/字号一律用 **class** 或 `var(--mc-*)`；组件视觉放 `assets/css/components.css`。
2. 新增/修改 JS 中的样式赋值后，必须跑 `node scripts/design-audit/run-token-audit.mjs`，**JS 运行时颜色不得高于基线**（新文件 0 违规）；发现新增即修，不得靠改基线通过。
3. 迁移期用 `!important` 覆盖 JS 内联色只能作为**临时兼容**（如 `components.css` §18 的注释），JS 清理后必须删除覆盖，避免长期双写。
4. 新运行时组件（toast/空位/删除按钮/toolbar）先定义 class + token，再在 JS 里只 `className` 化。

禁止：

1. 在 `assets/js/*.js` 写 `#hex`/`rgba()` 设计色（`fillStyle`、`backgroundColor`、`color`、`border`、`boxShadow`、`gradient` 等均算）。
2. 以"基线 jsColors=0"作为"JS 无裸值"的证据——v1.0 基线是未扫描产物。
3. 用内联 `style.cssText` 整段复制设计值来"图快"（v1.1 审计已覆盖 `.style.cssText`，同样会 FAIL）。
4. 只修视觉不清理 JS（例如再加一层 `!important` 覆盖），导致根因保留、下一处组件继续复制。

## 检测方法（命令 / 脚本）

```bash
cd /Users/keyi/mecollage

# 1) 主门禁：v1.1 起包含 JS 运行时裸色扫描（style 赋值 / 对象字面量 / cssText）
node scripts/design-audit/run-token-audit.mjs
# 输出形如：[design-token-audit] 扫描 N 个文件：token 外颜色 X（JS Y）、font-size …、圆角 …、内联 style …
# 判定：JS 违规数高于基线或新文件 >0 → FAIL（exit 1）；无新增漂移 → PASS（exit 0）

# 2) 人工抽查 JS 内联样式赋值（不依赖审计实现）
git grep -nE "\.style\.(background|backgroundColor|color|border[A-Za-z]*|boxShadow)\s*=" -- 'assets/js/*.js'

# 3) 确认 R0 前后差异（对照 HEAD）
git show HEAD:assets/js/mecollage-main.js | grep -nE "style\.(background|backgroundColor|color|boxShadow)" | head

# 4) 证据归档（写入 audit/，已被 .gitignore/.vercelignore 排除）
node scripts/design-audit/run-token-audit.mjs --report-all \
  --json audit/design-tokens/audit-r0-js.json --md audit/design-tokens/audit-r0-js.md
```

判定标准：

- **通过**：审计 PASS 且输出 `（JS 0）`（或 JS 违规不高于基线，且下降部分经人工复核）；`git grep` 无设计色赋值。
- **复发/漂移**：出现 `漂移上涨：assets/js/*.js colors …`、`新文件漂移`、或 `（JS >0）` 高于基线 → exit 1，不得进 Preview。
- **不判错**：canvas 产品默认色（导出白底、文字层默认色、滤镜预设等）属产品数据，不在本规则范围（见 DESIGN-TOKENS §10.9）；但**运行时 UI 结构色**（空位、删除按钮、toast、toolbar）必须 token 化。
- **v1.1 检测边界（已知限制）**：只扫样式赋值/对象字面量/`.style.cssText`；`innerHTML` 模板字符串里的内联 CSS、`style.setProperty('color', …)`、canvas 运行时计算色不在扫描面（文字层编辑弹窗等模板内联色仍可能藏裸值，v1.2 可扩大扫描面）。本条目以 v1.1 口径 JS 裸色 0 为验收值。

## 反例（本项目的真实反面样本）

- **`git show HEAD:assets/js/mecollage-main.js:1031-1076`（`createAddImageButton`）**：内联 `#f1f5f9` / `#e2e8f0` / `#94a3b8` / `#64748b` 四种设计色，深色画布上渲染成白方块。
  - 为什么错：这些值既不在 token 集合内，也不在 HTML/CSS 扫描面内；唯一的"正确值"只存在于这几十行 JS 里。
  - 当时正确做法：只给 `.add-image-btn` 设布局属性，颜色/边框/hover 写在 `components.css`（`--mc-surface-2`/`--mc-border-input`/`--mc-text-muted`/`--mc-border-brand`）。
- **HEAD :910-931（`removeBtn`）**：`rgba(255,255,255,.95)` 底、`#ef4444` 图标、`0 2px 8px rgba(0,0,0,.15)` 阴影全部内联。
  - 为什么错：与 DESIGN-TOKENS 里已有的 `--mc-overlay-control-bg` / `--mc-overlay-control-danger` / `--mc-shadow-overlay-1` 完全重复却各自维护。
  - 当时正确做法：`.remove-btn` class + 上述 token（现已落地）。
- **R0 前的 `createImageContainer()` 同样写死 `style.backgroundColor = '#f1f5f9'`**（HEAD :876/:1223 附近）：照片覆盖时通常不可见，但它证明"JS 裸值"是成片存在的；R0 已改为 `var(--mc-surface-1)`，审计 JS 裸色归 0。

## 关联证据

- 代码层：`git show HEAD:assets/js/mecollage-main.js`（上述行号）；当前 `assets/js/mecollage-main.js:1378`（clean）与 `:1221-1223`（`var(--mc-surface-1)`）；`assets/css/components.css:1987-2010`；`scripts/design-audit/run-token-audit.mjs:534-560`（JS 扫描实现）。
- 本机渲染层：`audit/design-migration/before/`（改造前基线截图）、`audit/design-migration/r0/`（R0 后画布空位/删除按钮截图）。
- `docs/design/INTERACTION-AUDIT.md` §3 P2-2；`docs/design/DESIGN-TOKENS.md` §10.9（产品默认值 vs 设计 token 的边界）。
- **最终审计结果（2026-11-06 03:2x）**：`run-token-audit.mjs` PASS —— token 273 / hash `3db11395ede1` / 103 文件 / token 外颜色 338（**JS 0**）；`--check-docs` PASS；基线已刷新（103 文件、tokenHash `3db11395ede1`）。

## 后续动作与关闭条件

- [x] 清理 `mecollage-main.js` 运行时内联色（`createAddImageButton`/`removeBtn`/`createImageContainer` 等）；`createImageContainer` 现为 `var(--mc-surface-1)`；审计 JS 裸色 **0**。
- [x] 人工复核 `--update-baseline`：基线已刷新为 103 文件 / tokenHash `3db11395ede1`（颜色 338 / 字号 18 / 圆角 153 / JS 0）。
- [x] `scripts/design-audit/README.md` 写明 JS 扫描范围与限制（v1.1 章节）。
- [ ] 可选增强（v1.2）：把 `innerHTML` 模板字符串内联 CSS / `style.setProperty` 纳入 JS 扫描（文字层编辑弹窗仍有模板内联色，属已知边界，不在本轮验收范围）。
- [ ] 关闭条件：① 审计 JS 运行时违规 **0**（已达成）；② `git grep` 设计色赋值（运行时 UI）为 0 或全部为产品默认值且已登记；③ 画布空位/删除按钮在深色主题下渲染一致（截图 `audit/design-migration/r0/`）；④ 证据归档 `audit/`；⑤ 维护者确认。

## 变更记录

- 2026-11-06 open：交互审计 P2-2 + R0 实现发现（证据：HEAD 行号、审计漏扫）。
- 2026-11-06 mitigated：`createAddImageButton`/`removeBtn`/`createImageContainer` 改 class/token 化；`run-token-audit.mjs` v1.1 增加 JS 运行时裸色扫描；最终审计 **PASS（273 token / hash `3db11395ede1` / 103 文件 / JS 0）**，基线已刷新。
