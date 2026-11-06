# L-20261106-40 导航角色混淆：全局 wayfinding 与工具切换不分层

| 字段 | 值 |
|---|---|
| ID | L-20261106-40 |
| 日期 | 2026-11-06 |
| 状态 | mitigated（Phase 1 角色分离已迁移 94 页 + F 门禁；Phase 2 / 40 页 footer 待做） |
| 严重度 | P1 |
| 证据层 | 代码层 + 本地渲染层 |
| 关联文件 | `scripts/design-system/nav-role-separation.mjs`（Phase 1）；`scripts/design-system/nav-global-cleanup.mjs`（Phase 2A）；`assets/css/components.css §21`（footer-tools + 桌面上下文 tab）；`scripts/design-audit/check-layout.mjs:199-245`（F 项，含 Phase 2A 全局导航规则）；`blog/index.html:401`（tool-nav 首项 i18n 键修正）；`i18n/*.json`（`nav.contact` 5 键）；`audit/design-migration/r2/nav-role-separation-apply.{md,json}`、`nav-global-apply.{md,json}`、`nav-final-layout.{json,md}`、`nav-phase1/*.png` |
| 发现来源 | R2 Phase 2A 导航角色分离（用户批准"先做第三步"）实现前普查 |
| 负责人 | 实施者（迁移脚本/CSS）；审计者（F 门禁）；维护者（批准/上线） |

## 症状（可观察到的事实）

1. **工具页的第二层导航承担全局职责**：20 个工具页的 `.tool-nav` 里含 Home（`data-i18n="nav.home"` / 文本 Home）；同一页面的全局 `.ghibli-nav` 也有 Home → Home 在页面上出现 2–3 次。
2. **内容页带工具导航**：about/contact（5 语言共 10 页）渲染 `.tool-nav`（让内容页看起来像工具页，局部导航没有对应操作对象）。
3. **首页工具入口重复**：首页同时有 `.tool-nav`（5 个工具 pill）与 `.home-tool-entry`（2 张工具卡）→ 同一工具入口出现两次。
4. **桌面第二层导航视觉权重过高**：`.tool-nav` 是 **84px** 玻璃工具栏（背景/边框/模糊/阴影），视觉上构成"第二条导航条"，与主内容/主操作竞争；R1 工具优先后移动端已横向滚动，但桌面仍未降级。
5. **内链/SEO 依赖顶部 nav**：工具入口只在顶部导航；footer 没有工具链接，导航一旦收敛会减少 54 页 × 5 个可爬工具链接（影响 Phase B/C/E 的 SEO 资产）。
6. **i18n 语义漂移**：`blog/index.html:401` tool-nav 首项显示 "Collage Maker"，但使用 `data-i18n="nav.home"`——运行时会被翻译成 "Home"（用户看到首项叫 Home）。
7. **门禁缺失**：`check-layout` 只有 A–E（溢出/壁纸/触控/alert/AI 预加载），**没有"导航角色"检查**；上述问题全部通过既有门禁。
8. **全局导航里仍放具体工具（Phase 2A 之前）**：54 个有 `.nav-left` 的页面把 `data-page="square"`（Square Image 工具链接）放在全局导航；全局导航承担工具入口，与"全局=wayfinding、工具=页面上下文"角色冲突，工具入口同时出现在全局 nav / 内容页 tool-nav / 首页工具卡。

迁移前普查与迁移后实测（见证据）：20 工具页 tool-nav 含 Home；10 内容页有 tool-nav；1 首页重复卡；54 页有 footer 但无 footer-tools；54 页全局导航含 Square Image 工具链接；40 页无 footer、40 页无全局导航（遗留）。

## 影响

- **对用户**：Home 重复 2–3 次、内容页出现无意义的工具切换、首页工具入口重复 → 导航"看起来乱"，用户要在重复/错位入口中做决定（违反「One obvious path」）；桌面第二条导航条抢主操作视觉层级。
- **对 SEO/内链**：工具入口单点依赖顶部 nav；一旦为收敛而删导航，会丢失工具页可爬入口；footer 无工具链接也不利于内链分布。
- **对维护**：无构建/95 手写页，导航结构散落在全局 nav + 每页 tool-nav + 首页工具卡三处；没有"导航角色"规范与门禁，改导航无法验证是否破坏角色。
- **影响面量化**：20 工具页 ×5 语言中的 tool-nav、10 内容页、1 首页、54 页 footer、54 页全局导航；迁移共 85 处（Phase 1）+ 54 处（Phase 2A）变更（94 页扫描，40 页无 footer / 40 页无全局导航跳过）。

## 根因

- **直接原因**：全局导航与工具导航在历史上叠加演进——`.tool-nav` 被当作"页面通用导航"复用，于是加入了 Home/全站入口；全局导航也被用来放具体工具（Square Image）作为"工具入口"；内容页也复用了工具页模板；首页额外加工具卡做营销；桌面没有把 `.tool-nav` 从"第二个导航容器"降级。
- **为什么会发生**：① 无构建/无模板，导航结构是每页手写复制，职责边界靠"最近抄的那页"；② 没有"全局 wayfinding vs 页面上下文"的规范/对照（Apple 的实际做法是两层，不是字面单层）；③ 没有 F 类静态门禁，导航角色问题不会 FAIL。
- **结构性**：只要导航角色没有可执行检查，角色混淆会随每次"微调导航"复发；必须把角色规则做成 `check-layout` F 项（静态、95 页、无需浏览器）。

## 规则（以后必须 / 禁止做什么）

必须：

1. **全局导航负责 wayfinding**：品牌 + 全站入口（**Home/Blog/About/Contact**），跨页一致；**不得放具体工具**（Phase 2A 收口：54 页 `.nav-left` 的 Square Image 链接替换为对应语言 Contact 真实 `<a href>`）。
2. **页面局部导航（`.tool-nav`）只出现在工具页、只列工具**；工具页 `.tool-nav` 必须 **4 个工具链接、无 Home**；内容页（about/contact 等）**不得**有 `.tool-nav`。
3. **首页不得有 `.home-tool-entry` 重复工具卡**（工具入口只出现一次：nav/工具区）。
4. **每页至少一个可爬工具入口**；有 `<footer>` 的页面必须有 `.footer-tools`（**恰好 5 个链接**、语言前缀与页面语言一致、链接 ≥44px 高）；有 `.nav-left` 的页面必须有 `data-page="contact"`（wayfinding 完整）。
5. 导航/IA 类改动必须跑：`node scripts/design-audit/check-layout.mjs`（F 项 PASS）、`node scripts/design-system/nav-role-separation.mjs` + `node scripts/design-system/nav-global-cleanup.mjs`（dry-run 幂等，0 pending change）、`run-tests`、`run-mobile-touch`、`run-seo-checks`。
6. `data-i18n` 键语义必须与静态文案一致（例：tool-nav 首项 "Collage Maker" 用 `tool.collage_maker`，不能借用 `nav.home`；全局 Contact 用 `nav.contact`）。

禁止：

1. 在 `.tool-nav` 放 Home 或其他全站入口（Home 只属于全局 nav）。
2. **在全局导航放具体工具链接**（工具入口只在 tool-nav / footer-tools；Phase 2A F 规则会 FAIL）。
3. 内容页使用工具页模板/渲染 `.tool-nav`。
4. 首页重复工具卡或同一工具入口出现两次以上。
5. 只改视觉（84→44px）而不做角色迁移（层级降了、职责仍混）。
6. 用 JS 动态渲染导航入口（首屏/无 JS 不可见，爬虫/降级风险）。
7. 迁移导航时改 URL/canonical/hreflang（H9）。

## 检测方法（命令 / 脚本）

```bash
cd /Users/keyi/mecollage

# 1) F 门禁（静态 95 页，无需浏览器）：
#    tool-nav 无 Home / 内容页无 tool-nav / 首页无 home-tool-entry /
#    有 footer 必有 footer-tools(5 links, 语言前缀) /
#    Phase 2A：有 .nav-left 必有 data-page="contact"、无 data-page="square"、无 /tools/ 链接
node scripts/design-audit/check-layout.mjs
# 期望 PASS 6/6（A–F）；出现 F FAIL 时 detail 给出 {file, rule}

# 2) 迁移脚本幂等复核（0 pending change；不写盘）
node scripts/design-system/nav-role-separation.mjs
node scripts/design-system/nav-global-cleanup.mjs
# 期望：变更 0 处；无 footer 跳过 40 页 / 无全局导航跳过 40 页（遗留，Phase 2B 补）

# 3) footer 链接可访问性（本机 54 页 × 5 = 270 链接）
#    本地 server 逐链接 fetch；期望 pages=54 / links=270 / badCount=0

# 4) 关键实测（390×844 / 1440）
node scripts/functional-audit/run-mobile-touch.mjs   # 6/0/0（导航结构/开合等）
node scripts/functional-audit/run-tests.mjs          # 53/0/2
node scripts/seo-audit/run-seo-checks.mjs            # 32/0/0
```

判定标准：

- **通过**：`check-layout` PASS 6/6（F 无 detail）；工具页 tool-nav 4 links 无 Home；about/contact `toolNav:false`；首页 `homeCards:0`；有 footer 页 footer-tools 5 links 且 270/270 链接 200；有 `.nav-left` 页面全局导航 = [Home, Blog, About, Contact]（含 `data-page="contact"`、无 `data-page="square"`/`/tools/` 链接）；移动 390 nav 60 / upload 109 / 0 溢出。
- **复发**：F 出现任一 rule（`tool-nav 仍包含 Home` / `about/contact 内容页不应有 tool-nav` / `首页仍有重复工具卡` / `有 footer 但缺少 footer-tools` / `链接数 != 5` / `前缀与页面语言不一致` / `全局导航缺少 Contact` / `全局导航仍包含具体工具链接`）→ FAIL。
- **注意**：F 判定 Home 用 `data-i18n="nav.home"` 或文本 Home，**不用 `fa-home` 图标**（Collage Maker 图标就是 home）；F 是静态检查，不替代 mobile-touch 的交互态断言（L-38）。

## 反例（本项目的真实反面样本）

- **迁移前工具页**：`/tools/square/` 的 `.tool-nav` 含 Home + 4 个工具（Home 与全局 nav 重复）；about/contact 也渲染 `.tool-nav`（内容页伪装工具页）；首页 `.tool-nav` + `.home-tool-entry` 双份工具入口。
  - 为什么错：局部导航承担全局职责，用户看到 Home 2–3 次、内容页出现无法操作的"工具切换"。
  - 当时正确做法（本 Phase 已实施）：20 页去 Home、10 页移除 tool-nav、1 页去重复卡；F 门禁固定规则。
- **`blog/index.html:401`**：tool-nav 首项文案 "Collage Maker" 却写 `data-i18n="nav.home"`——运行时被翻译成 "Home"，静态文案与运行时不一致。
  - 为什么错：i18n 键语义漂移，静态检查（只看文本）与运行时（i18n 覆盖）会给出不同结果。
  - 当时正确做法：改为 `tool.collage_maker`（已实施）。
- **F 首版误判**：F 最初用 `fa-home` 图标判断 Home，把 Collage Maker（图标就是 home）误判为 Home → 假 FAIL；改为 `data-i18n="nav.home"` / 文本 Home。
  - 为什么错：用视觉图标代替语义判定；正确做法是读语义属性/文本。
- **导航单点依赖**：迁移前 footer 无工具链接，若直接删顶部 nav 工具入口会损失 270 个内链；正确做法是 footer-tools（已实施）。
- **Phase 1 之后全局导航仍含工具**：54 个有 `.nav-left` 的页面全局导航里仍有 `data-page="square"`（Square Image）——Phase 1 只移除了 tool-nav 的 Home，没有动全局 nav 的工具入口；Phase 2A 用 `nav-global-cleanup.mjs` 替换为对应语言 Contact（54 处），F 门禁同时加"全局导航不得含具体工具"规则。
- **收口后的可爬性**：Phase 2A 把全局 nav 的 Square Image 换成 Contact 后，工具入口仍在 tool-nav（4）+ footer-tools（5），270 个 footer 链接全 200，没有减少可索引工具路径。

## 关联证据

- 迁移：
  - Phase 1：`audit/design-migration/r2/nav-role-separation-dryrun.{md,json}`、`nav-role-separation-apply.{md,json}`（94 页/85 变更/0 异常/40 跳过）。
  - Phase 2A：`audit/design-migration/r2/nav-global-dryrun.{md,json}`、`nav-global-apply.{md,json}`（94 页/54 变更/0 异常；`global-nav:square->contact`）。
- 门禁：`audit/design-migration/r2/nav-final-layout.{json,md}`（PASS 6/6、95 页、含 F）；Phase 2A 后复跑 `PASS 6/6`（本机 `/tmp/mc/nav2a-layout.out`；F 静态复算 94 文件 0 fails）。
- 视觉：`audit/design-migration/r2/nav-phase1/*.png`（home/tool/about 桌面、home/zh-tool 移动、about-footer 桌面/移动）。
- footer 链接：本机复跑 `pages=54 / links=270 / badCount=0`（`footer-link-check.mjs` 临时脚本，基于本地 Vercel 模拟 server 逐链接 200）。
- 实测：1440 首页全局 nav [Home, Blog, About, Contact]（href `/`、`/blog/`、`/about/`、`/contact/`）、tool-nav 5 links/44px、homeCards 0；工具页全局 nav 同上且无 Square/`/tools/`、tool-nav 4 links 无 Home；390×844 nav 60 / upload 109 / scrollWidth 390。
- 代码：`scripts/design-system/nav-role-separation.mjs`、`nav-global-cleanup.mjs`、`assets/css/components.css §21`、`scripts/design-audit/check-layout.mjs:199-245`、`blog/index.html:401`、`i18n/*.json`（`nav.contact`）。
- 决策：ADR-0009；原型 `docs/design/prototypes/r2/single-layer-nav.html`（Phase 2B 参考）。
- 测试数字（2026-11-06）：functional 53/0/2（55）；mobile 6/0/0；SEO 32/0/0；performance PASS（A 1 WARN 旧 bundle）；token PASS（273/hash `3db11395ede1`/104 文件/JS 0；基线 338/153/1560 → **334/151/1553**）。
- 设计文档（Lead 维护）：`DESIGN-TOKENS.md §4.9.1`、`COMPONENT-RECIPES.md §22`、`scripts/design-system/README.md`、`scripts/design-audit/README.md`。

## 后续动作与关闭条件

- [x] Phase 1 迁移（20/10/1/54；40 页无 footer 跳过）。
- [x] Phase 2A 全局导航收口（54 页 square→contact；i18n `nav.contact` 5 键；40 页无全局导航跳过）。
- [x] `check-layout` F 门禁（含全局导航规则）+ H11/C2/runbook 接线；token 基线复核刷新（下降）。
- [ ] **Phase 2B（待用户确认）**：40 个无 footer 页补 footer-tools（补完后 F 规则可扩为"所有页面必须有 footer-tools"）；评估全局 Tools 下拉（可选增强）/40 个无全局导航落地页是否纳入统一 nav；Contact 表单由用户稍后布置。
- [ ] Preview + 真机：桌面 84→44px 视觉复核、全局导航 Contact 入口与移动 footer-tools 抽查。
- [ ] blog 搜索与导航交叉页（blog/index）在 Preview 一起回归。
- [ ] 关闭条件：① F PASS 6/6（已达成）；② Phase 2B 完成后所有页面有 footer-tools 且 nav 角色一致；③ Preview/真机视觉与触控复核通过；④ 证据归档；⑤ 维护者确认。

## 变更记录

- 2026-11-06 open：R2 Phase 2A 普查发现导航角色混淆（20/10/1 + 54 页无 footer 工具入口 + 54 页全局导航含工具 + blog i18n 键漂移）。
- 2026-11-06 mitigated（Phase 1）：`nav-role-separation.mjs` 迁移 94 页（85 变更/0 异常）；`components.css §21` 降级桌面 tool-nav + footer-tools；F 门禁 PASS 6/6；token 基线下降刷新。
- 2026-11-06 mitigated（Phase 2A）：`nav-global-cleanup.mjs` 迁移 54 页（square→contact/0 异常）；i18n `nav.contact` 5 键；F 扩展"全局导航无工具/含 Contact"规则，复跑 PASS 6/6；Phase 2B/Contact/真机待做。
