# L-20261106-33 SEO 内容优先后置主操作，移动端首屏看不到工具

| 字段 | 值 |
|---|---|
| ID | L-20261106-33 |
| 日期 | 2026-11-06 |
| 状态 | mitigated（R1 工具优先已落地并实测：上传区 1148→109px / 1193→259–434px；桌面不变；待 Preview/真机确认） |
| 严重度 | P1 |
| 证据层 | 代码层 + 本地渲染层 |
| 关联文件 | `docs/design/INTERACTION-AUDIT.md` §1（CDP 实测）；`assets/css/components.css:1886-1985`（§17 工具优先）；`assets/js/ui.js:350-364`（`mc-collage-page`/`mc-tool-page` 打标）；`index.html:1030-1073`（全局 nav + 工具 nav + 首页工具卡）；`public/tools/square/index.html` 等 4 个工具页（×5 语言） |
| 发现来源 | 交互审计 P0-1/P0-2/P0-3/P2-10（本地 CDP 实测 2026-11-06） |
| 负责人 | 实施者（R1 落地）；Lead（CSS/注入）；维护者（批准） |

## 症状（可观察到的事实）

本地渲染层（Chrome headless 1440×900 / 390×844，离线阻断外部 CDN，CDP 测量；INTERACTION-AUDIT §1）：

| 指标 | 移动端 390×844 | 桌面 1440×900 |
|---|---|---|
| 全局导航高度 | **270px**（4 个全宽 pill + GitHub + 语言） | 72px |
| 首页页头（标题+副标题） | 181px | 176px |
| 工具导航容器高度 | **374px**（5 个全宽 pill） | 84px |
| 首页重复工具卡 | 218px | 88px |
| **首页上传区 top** | **1148px**（1.36 屏，首屏 844 之外 304px） | 749px |
| **工具页上传区 top** | **1193px**（1.4 屏） | 607（square）/ 485（rounded） |

结构原因（代码层）：页面 DOM 顺序是 `nav.ghibli-nav → header.page-header → nav.tool-nav → div.home-tool-entry（首页 2 张重复工具卡）→ main-content（上传/编辑器）→ SEO section → footer`；移动端没有重排，导致主操作被 270+181+374+218px 的"导航/标题/工具入口/重复卡"层层推到首屏之外。同时全局导航 + 工具导航是**两层工具入口**（Home 出现 2–3 次），工具名还有 Square Image / Square Image Converter / Collage Maker 等多种叫法（P0-2）。

**R1 落地后实测（2026-11-06，390×844 本地 CDP；`ui.js` 已注入 94/94 页）**：首页上传区 top **1148 → 109px**；工具页上传区 **1193 → 259–434px**（square 434 / roundedcorners 358 / es blurredframe 259）；移动顶栏 **270 → 60px**；工具导航 **374 → 62px** 横向滚动；首页 390 横向溢出 **+218 → 0**；桌面 >768 布局不变（来源 `audit/design-migration/R1-RESULTS.md` §2；截图 `audit/design-migration/r1/*-mobile.png`）。

## 影响

- **对用户**：首次访问者（尤其移动端）要滚 1.4 屏才看到"上传"；很多人会以为这是内容站/没有工具 → 直接离开。这是"SEO 站 + 后面接一个工具"观感的直接来源，也是本轮最重要的可用性问题。
- **对 SEO**：本身没有技术性扣分（文本全在 DOM 里、可爬），但**跳出率/转化**受损；如果为了"工具优先"删内容或改 DOM 顺序，反而会伤既有的 62 页可索引资产（Phase B/C/E 成果）。
- **影响面量化**：94 个内容页（首页 + 4 工具页 ×5 语言）的移动端布局；桌面工具页上传区也在 485–607px。
- **对维护**：无构建 + 5 语言副本，任何"把工具提前"的实现都必须同时解决"DOM/SEO 不变 + 桌面不变 + 可回滚"，否则一次改动牵动 5 语言与全部断言。

## 根因

- **直接原因**：DOM 按"SEO 内容优先"排序（Phase B/C/E 的 SEO 资产全部排在工具之前），且移动端没有独立的视觉顺序策略；全局 nav 与工具 nav 两层入口重复，进一步放大前置高度。
- **为何会发生**：① 站点的历史演进是"内容页 → 加工具"，DOM 顺序反映内容优先；② 没有移动优先/首屏主操作的验收门禁（审计基线只检查功能与 SEO，不测 y 坐标）；③ 内容与工具共用同一套 HTML，没有模板分层。
- **为什么不直接改 DOM**：95 个手写页 ×5 语言；改 DOM 顺序会同时改变可爬文本顺序、functional/US SEO 断言与既有内链结构，风险与成本远大于 CSS 覆盖层（ADR-0007 备选对比）。

## 规则（以后必须 / 禁止做什么）

必须：

1. **移动端（≤768px）首屏必须出现主操作**：首页/工具页在 390×844 视口内应看到上传区或主 CTA（目标：上传区 top < 844px，且不被两层导航覆盖）；编辑器页上传后画布/工具栏可见。
2. 布局顺序调整**只能用 CSS 覆盖层**（`body.mc-collage-page` / `body.mc-tool-page` + `order`，或等价方案），**DOM 结构与可爬文本顺序不改**；桌面 >768px 布局零变化。
3. 每次移动布局改动：跑 `node scripts/seo-audit/run-seo-checks.mjs`（0 FAIL，证明 head/文本/内链未变）+ `node scripts/functional-audit/run-tests.mjs`（0 FAIL）+ `node scripts/design-audit/check-layout.mjs`（溢出/壁纸/触控）。
4. 5 语言同步（首页 + 4 工具页 ×5 语言），并用 390×844 截图逐页核对首屏。
5. 导航收敛：移动端只保留一层全局导航（顶栏 ≤ `--mc-mobile-nav-height` 56px + 折叠菜单），工具入口收为一个 segmented/横向 pill 行；工具名统一。

禁止：

1. 为了"显得干净"删减/隐藏 SEO 长文（只调视觉顺序，不删可爬文本；INTERACTION-AUDIT §7）。
2. 用 JS 在运行时重排 DOM 来实现工具优先（首屏前仍是旧顺序、爬虫看到 DOM 顺序、与断言冲突）。
3. 一次性重写 95 页 HTML（应先用共享 CSS 覆盖层，再按 R1/R2 逐页）。
4. 只改桌面或只改首页就宣布完成（工具页 ×5 语言是同类问题）。
5. 改完不测首屏位置就报"已修复"（必须截图/测量证据）。

## 检测方法（命令 / 脚本）

```bash
cd /Users/keyi/mecollage

# 1) 兜底门禁（溢出/壁纸/触控/alert/AI 预加载；不直接测 y，但能抓住布局回归）
node scripts/design-audit/check-layout.mjs

# 2) SEO/可爬性不回归（R1 只做视觉重排时也必须跑）
node scripts/seo-audit/run-seo-checks.mjs     # 期望 32 项 0 FAIL

# 3) 功能回归（移动端上传→编辑→导出旅程）
node scripts/functional-audit/run-tests.mjs   # 期望 0 FAIL

# 4) 首屏位置测量（本地 Chrome/CDP；一次性脚本示例，可参考 functional-audit/cdp.mjs）
#    在 390×844 打开 / 与 /tools/square/，取 #uploadScreen / .main-content 的 getBoundingClientRect().top
#    判定：top < 844（首屏内）+ 元素可见；截图存 audit/design-migration/
```

判定标准：

- **通过**：390×844 首页与工具页上传区/主 CTA 在首屏内（top < 844）；截图与 metrics 归档；SEO/functional/check-layout 均 0 FAIL；桌面 1440 布局与改造前截图一致。
- **复发**：上传区 top ≥ 844（需滚动一屏以上才见主操作），或桌面布局变化，或 SEO harness FAIL（说明动了 DOM/文本顺序）。
- **不判错**：工具页桌面端上传区在 485–607px（改造前既有，桌面首屏高度 900px 内可见）；R1 只要求移动端。

## 反例（本项目的真实反面样本）

- **改造前首页移动端**（INTERACTION-AUDIT §1 实测）：`nav 270px + header 181px + tool-nav 374px + home-tool-entry 218px` 之后才到 `main-content`，上传区 y=1148px。
  - 为什么错：首屏（844px）里全是导航/标题/工具入口，唯一的主操作在 1.36 屏之外；用户必须"先做选择再找工具"。
  - 当时正确做法：CSS order 把 `main-content` 提到 `page-header`/`tool-nav` 之前（R1 已实现于 `components.css` §17），DOM 不动、SEO 文本保留。
- **改造前工具页移动端**：长 H1（3 行）+ 副标题胶囊 + 5 个工具 pill + 意图切换条 → 上传区 1193px。
  - 为什么错：搜索落地页的"工具"不在首屏，落地即跳出。
  - 当时正确做法：紧凑页头 + segmented + 工具区前置，SEO/FAQ 下移（视觉）。
- **两层导航 + 首页重复工具卡**：Home 出现 2–3 次、工具名三种叫法。
  - 为什么错：用户要在重复入口中做决定；工具名不统一削弱识别。
  - 当时正确做法：移动端单层顶栏 + 一个工具 segmented + 统一工具名（原型 `docs/design/prototypes/mobile-home.html`/`mobile-tool.html`）。

## 关联证据

- `docs/design/INTERACTION-AUDIT.md` §1（实测表）、§2.1/§2.2（旅程）、§3 P0-1/P0-2/P0-3、§5 R1 路线。
- EVIDENCE：`audit/design-migration/before/home-mobile.png`、`before/tool-square-mobile.png`（改造前全页截图）；`audit/design-migration/after-final/`（改造后）；`docs/design/prototypes/screenshots/`（R1 原型目标态）。
- 代码层：`assets/css/components.css:1886-1985`（§17）；`assets/js/ui.js:350-364`（body 类型标记）；`index.html:1030-1073`（导航结构）。
- R1 实测（2026-11-06）：`audit/design-migration/R1-RESULTS.md` §2（首页 1148→109px、工具页 1193→259–434px、顶栏 270→60px、工具导航 374→62px、390 溢出 0）；截图 `audit/design-migration/r1/*-mobile.png`；`check-layout --full` **PASS 5 / FAIL 0 / WARN 0**（`audit/design-migration/r1/layout-check-full.{json,md}`）；SEO **32 PASS / 0 FAIL / 0 WARN**（`audit/evidence/phase-b/seo-report.md`，证明只视觉重排、DOM/文本未变）。

## 后续动作与关闭条件

- [x] `ui.js` 注入 **94/94** 页（404 排除，`inject-ui.mjs --apply`），`mc-collage-page`/`mc-tool-page` 生效；390×844 实测首页上传区 **1148→109px**、工具页 **1193→259–434px**，截图归档（R1-RESULTS §2）。
- [x] 桌面 1440×900 回归：`check-layout --full` 1440 全量 0 溢出；R1 CSS 仅在 `@media (max-width:768px)` 内。
- [x] SEO 可爬性未变：**32 PASS / 0 FAIL / 0 WARN**（DOM/文本顺序未改）。
- [ ] Preview + 真机（iOS Safari / Android）抽查首屏与横向滚动（本地离线不能完全代表真机）。
- [ ] 工具名/文案统一（P2-1）剩余项与 5 语言同步（本轮已修首页 hero 副标题重复与工具名，其余见 R2）。
- [ ] 关闭条件：① 移动端首屏主操作可见（测量 + 截图，已达成本地）② SEO harness 0 FAIL（已达成）③ functional/check-layout 0 FAIL（已达成）④ 桌面截图无差异（已达成）⑤ Preview/真机确认 ⑥ 维护者确认。

## 变更记录

- 2026-11-06 open：交互审计 P0-1/P0-2/P0-3 记录（CDP 实测 1148/1193px、270+374+218 堆叠）。
- 2026-11-06（同日）：R1 CSS 覆盖层实现（components.css §17）、`ui.js` 页面类型标记完成。
- 2026-11-06 mitigated：`ui.js` 注入 94/94 页后实测首页上传区 **1148→109px**、工具页 **1193→259–434px**、工具导航 374→62px、390 溢出 0、桌面不变；check-layout --full PASS 5/0/0、SEO 32/0/0。
