# MeCollage R2 战略原型（单层导航 / Contact 表单 / 博客搜索）

> 版本：v1.0（2026-11-06）· 分支 `feat/r2-mobile-performance-blog-search`（从 main `94c4cb6` 起）
> 写范围：**只写 `docs/design/prototypes/r2/`**；未修改任何站点 HTML/CSS/JS，未 commit / push / 部署 / 联网。
> 依据：[INTERACTION-AUDIT.md](../../INTERACTION-AUDIT.md)（P0-2 / P2-3 / P2-4 / §2.2 / §5 R2）、[DESIGN-TOKENS.md](../../DESIGN-TOKENS.md)、[COMPONENT-RECIPES.md](../../COMPONENT-RECIPES.md)
> 视觉基线：复用 [`assets/css/design-tokens.css`](../../../../assets/css/design-tokens.css) + [`assets/css/components.css`](../../../../assets/css/components.css)；不引入新视觉语言。

---

## 0. 30 秒版

| 原型 | 视口 | 一句话 | 审计条目 | R2 批次 | 需要决策 |
|---|---|---|---|---|---|
| [`single-layer-nav.html`](single-layer-nav.html) | 1440×900 / 390×844 | 把「全局 nav + 工具 nav」两层收成一条：品牌 + 主导航 + **Tools 下拉**（5 个工具一处入口、当前工具高亮/动态触发器）；移动复用 R1 56px 顶栏 + 菜单工具分组 | P0-2 | R2（战略） | 是否保留页脚 Tools 内链；是否动 URL（**不动**）；5 语言同批；ADR |
| [`contact-form.html`](contact-form.html) | 1440×900 / 390×844 | Contact 页从「只有 GitHub Issues」变成可写表单：姓名/邮箱/主题/消息 + 隐私提示 + 成功/错误/空状态；**无后端策略对比 A mailto（推荐）/ B 第三方服务（备选）/ C 自建后端（不推荐）** | P2-3 | R2（战略） | 加表单 vs 改名 Support；收件邮箱；A/B 方案 |
| [`blog-search.html`](blog-search.html) | 1440×900 / 390×844 | 标题下即时搜索 + 四状态（默认/输入中/有结果/无结果）+ `aria-live` 结果数 + 空状态清除；与 **R2-B 已实现契约**（`.blog-search*`）一一对应 | P2-4 | R2（内容项，已实现主体） | 是否加 `?q=` URL 状态（推荐不加）；是否做命中高亮/分类 |
| [`index.html`](index.html) | 1440 / 390 | R2 总览：问题 → 方案 → 与当前实现差距 → 需拍板的 4 个点 → 实现接口/风险 | — | — | — |

**共同主张**：R2 不是重做视觉，而是**结构收敛**——一条导航、一个能写的入口、一个能找的搜索。所有页面继续用壁纸 + 深色玻璃 + 薄荷绿 + 大圆角，**不改 URL 结构**（H9）。

---

## 1. 文件清单

```
docs/design/prototypes/r2/
├── index.html                # R2 总览（问题/方案/差距/决策/实现接口）
├── single-layer-nav.html     # 单层导航原型（桌面 64px + 移动 56px，4 种状态规格）
├── contact-form.html         # Contact 表单原型（多状态 + 无后端三方案 + i18n 要求）
├── blog-search.html          # 博客搜索原型（四状态，复用 components.css §20 真实组件）
├── README.md                 # 本文件
├── _capture.mjs              # 截图脚本（复用 scripts/functional-audit/cdp.mjs，只 import）
└── screenshots/
    ├── review/               # 评审版：注释条 + 红色标注 + 首屏线
    │   ├── single-layer-nav-1440x900.png / -390x844.png
    │   ├── contact-form-1440x900.png / -390x844.png
    │   ├── blog-search-1440x900.png / -390x844.png
    │   └── index-1440x900.png / -390x844.png
    └── clean/                # 干净版：隐藏评审 chrome（给用户看设计本体）
        ├── 同名 8 张
        ├── <name>-desktop-full.png / <name>-mobile-full.png   # 整页（含下方状态规格）
        └── 状态变体：
            ├── single-layer-nav-1440x900-open.png            # 桌面 Tools 下拉打开
            ├── single-layer-nav-390x844-open.png             # 移动菜单打开
            ├── blog-search-1440x900-results.png / -empty.png # 有结果 / 无结果（真实输入触发）
            ├── blog-search-390x844-results.png / -empty.png
            ├── contact-form-1440x900-error.png / -success.png
            └── contact-form-390x844-success.png
```

复现截图（仓库根目录，需本机 Chrome）：

```bash
node docs/design/prototypes/r2/_capture.mjs                 # 全部
node docs/design/prototypes/r2/_capture.mjs single-layer    # 只跑文件名含 single-layer 的
```

脚本在仓库根目录起**只读本地静态服务器（127.0.0.1，不联网）**，复用既有 CDP harness；结束时断言 4 个页面在 1440/390 下 `scrollWidth === innerWidth`（当前全部 0 溢出）。

---

## 2. 每个原型解决什么

### 2.1 `single-layer-nav.html` — 一条明显路径（P0-2）

- **现状事实**：每个站点页 = 全局 `.ghibli-nav`（Home / Blog / About / Square Image + GitHub + 语言）+ `.tool-nav`（Collage Maker / Square Crop / Rounded Corners / Square Image / Blurred Frame 5 个 pill）。Home 在两层各出现一次（部分页第三次出现在内容区）；工具入口在 nav + tool-nav + 首页重复卡三处；GitHub（外部代码仓）占主导航位。R1 只把**移动端**收成 56px 顶栏（`components.css §15`），桌面 IA 未动。
- **原型做法**：
  1. 桌面一条 64px 导航：品牌 → Home / Blog / About / **Tools ▾** → 右侧 GitHub 图标 + 语言。没有第二排 pill。
  2. Tools 下拉 = 5 个工具的**唯一入口**：每项带图标、一行说明、44px 热区；当前页高亮 + “current” 徽标；工具页时触发器直接显示当前工具名（如 `Square Image ▾`），用户永远知道自己在哪。
  3. 移动端复用 R1 已落地的 **56px 顶栏**（`--mc-mobile-nav-height`）：品牌 + 语言 + ☰；菜单面板分 `Menu / Tools / More` 三组，工具项含当前页徽标，可点项 ≥44px。
  4. 所有入口仍是真实 `<a href>`（无 JS 也在 DOM），**不改 URL、不加重定向、不隐藏内链**；SEO 内链由导航 + 页脚 Tools 列共同保证。
  5. 下方规格区给出 4 种状态（桌面关闭 / Tools 打开 / 工具页语境 / 移动菜单）+ **现在 vs 本方案** 对比 + 键盘/ARIA 规则。
- **解决审计 §2.2 / §4 原则 2「One obvious path」**：导航层数 2 → 1；工具入口 3 → 1；Home 只出现一次；GitHub 离开主导航。

### 2.2 `contact-form.html` — 一个能写字的入口（P2-3）

- **现状事实**：`contact.html`（及 4 个语言副本）只有 GitHub Issues 卡片 + Quick Help + FAQ，页面自称 “we don't offer direct email support”；**没有表单**，也没有公开收件邮箱（审计 P2-3：「要么加简单反馈表单（需后端/第三方），要么改名为 Support 并写清响应渠道」）。
- **原型做法**：
  1. 保留 H1 `Contact & Support`（SEO 连续），改为「Talk to a human」式短副标题 + 真实表单（姓名 / 邮箱 / 主题 / 消息）。
  2. 左栏前置**响应预期**（2–3 个工作日）、**先看这里**（Bug/Feature → GitHub Issues 更快；Privacy → 用表单）、**隐私声明**（只用于回复、无列表、无追踪）。
  3. 表单状态：默认/空 → 校验错误（字段级红框 + 顶部 `role="alert"` 摘要 + focus 到摘要）→ mailto 成功（“Email draft ready” + 可复制地址 + 再发一条）→ 第三方服务版（发送中 spinner + 成功回执编号）。
  4. **无后端策略对比**（见 §4 D1）：A `mailto:` fallback（推荐）/ B 第三方表单服务（备选）/ C 自建后端（不推荐），每个给做法、优点、代价、改动面。
  5. i18n：列出 5 语言需要的键（`contact.form.*`、`contact.form.error.*`、`contact.form.success.*`、`contact.topic.*`），强调不能只做英文、语言切换仍用真实锚点。
- **设计取舍**：表单不做“无意义 disabled 按钮”；错误不用 alert()（H11 / L-32）；隐私提示放在提交按钮之前而不是藏进政策页。

### 2.3 `blog-search.html` — 8 篇文章也该能搜（P2-4 / R2-B）

- **现状事实（工作区，截至本原型时）**：R2-B 已实现主体但**未提交**——`blog/index.html` 增加 `.blog-search-panel`（label + `#blogSearchInput` + `#blogSearchResults` aria-live + `#blogSearchEmpty` + `#blogSearchClear`）、`assets/js/blog-search.js`（渐进增强、标题+描述 AND 分词、CJK 原样、Esc 清除、`window.mcBlogSearch`）、`components.css §20`（input/results/empty/clear 全 token）、5 语言 i18n 键（placeholder/results/result_one/empty/clear）。当前 8 篇文章。
- **原型做法**：
  1. 直接用**真实组件类**（`.blog-search*`）与 ID 契约渲染页面与状态规格，不另造类名。
  2. 四状态：默认（空查询，全部 8 篇；无 JS 也是这个状态）→ 输入中（即时计数）→ 有结果（命中标题/描述）→ 无结果（空状态 + 清除 + 建议话题）。
  3. 结果计数写 `#blogSearchResults`（`role="status" aria-live="polite"`）；1 条用 `blog.search.result_one`；空状态可聚焦、清除按钮 ≥44px 并聚焦回输入框。
  4. 规格区给组件契约 + **与当前实现的差距**：已落地项 vs 本原型补的设计缺口（无结果建议话题、命中高亮可选、默认态 result 文案）。
- **明确不做**：`?q=` URL 参数 / history 写入 / 后端 / 改文章链接或 canonical（见 §4 D3）。

### 2.4 `index.html` — 总览与决策入口

问题 → 三个方案 → 与当前实现的差距表 → 4 个需要维护者拍板的点 → CSS/JS/页面范围与风险，全部一页可评审。

---

## 3. 与 INTERACTION-AUDIT R2 / 当前实现的差距

| 主题 | 审计建议（原文要点） | 当前实现（工作区事实） | 本原型 |
|---|---|---|---|
| 单层导航 | R2「单导航」；P0-2「两层导航 + 重复工具入口」；原则 2「One obvious path」 | 桌面仍两层；移动 R1 只收顶栏，工具入口仍是 tool-nav；95 页 × 5 语言 nav DOM 重复 | 一条 64/56px 导航 + Tools 下拉 + 移动菜单分组；不改 URL |
| Contact | P2-3「加表单（需后端/第三方），或改名 Support 并写清响应渠道」 | `contact.html` 无表单、无收件邮箱、无响应承诺；`components.css` 只有 `body .contact-form input/textarea` 基础样式 | 真实表单 + 3 种无后端方案 + 状态规格 + 5 语言键 |
| 博客搜索 | P2-4「实现客户端搜索/分类；或删除死样式」 | **已实现主体（未提交）**：`blog/index.html` + `assets/js/blog-search.js` + `components.css §20` + 5 语言键；8 篇、渐进增强、无 URL 变化 | 状态 A–D 用真实组件；补空状态建议话题/高亮等设计缺口 |
| 移动端性能 | R2「性能预算（blur/图片/字体）」 | 不在本原型范围（需真机 profiling；`components.css` 已有 ≤768 收敛） | 未覆盖，标注为后续 |
| 移动端 touch 回归 | R2-A 任务 | 由并行会话 `scripts/functional-audit/run-mobile-touch.mjs` 负责 | 不重复 |

> 注：工作区中 R2-B 的 HTML/JS/CSS/i18n 改动来自并行会话，**未提交**；本 README 只把它们当“当前工作区事实”引用，不代表生产已上线。

---

## 4. 需要维护者/用户决策的点（R2 的核心产出）

### D1 · Contact 无后端策略（A / B / C 三选一）

| 方案 | 做法 | 优点 | 代价 | 需要谁做 |
|---|---|---|---|---|
| **A · mailto fallback（推荐）** | JS 校验后拼 `mailto:hello@mecollage.top?subject=…&body=…`，交给用户邮件客户端 | 零后端/零第三方/零费用；与“照片不出设备、无账号”的隐私叙事一致；无 secret 可泄露 | 依赖邮件客户端；无送达保证/回执；邮箱必须公开（垃圾邮件）；无法统计 | 维护者确认收件邮箱；开发改 contact 页 ×5 |
| **B · 第三方表单服务（备选）** | Formspree / Netlify Forms / Tally 等接收 POST 并转发 | 真正“发送成功”回执；服务端反垃圾；无需自建后端 | 外部请求 + 数据处理者 → 隐私政策需更新；需注册账户/配置 endpoint（**H8 账户级，AI 不能代办**）；免费额度/条款风险 | 维护者注册/授权 + 隐私政策更新 |
| **C · 自建后端（不推荐本轮）** | Vercel Function / Worker + 邮件 API | 完全可控、可做工单 | 服务端代码/密钥/运维/监控/滥用预算；与纯静态模型冲突 | R3+ 再议 |

> 若 D1 最终选「不加表单」：则按审计 P2-3 的第二选项把页面**改名 Support**，写清 GitHub Issues 主路径 + 响应预期，**不要保留空表单**。

### D2 · 单层 IA 是否动 URL / SEO？

- **本方案不动 URL**：所有导航项保持真实 `<a href>`；不改 `trailingSlash` / `cleanUrls` / 重定向链 / canonical / hreflang（H9）。只是把已有链接重新分组，**不新增/删除可索引 URL**。
- 需要确认：
  1. 是否在**页脚保留 Tools 列**（5 个工具链接）——用于补足导航收敛后仍要保住的内链/可爬路径（推荐保留）。
  2. 是否接受**导航徽标/当前工具名**这类运行时文案由 i18n 提供（5 语言，L-02）。
  3. 推行方式：先工具页灰度 → 再全站 95 页 × 5 语言；**需要 ADR（建议 ADR-0008）+ Preview + 维护者批准**（H1/H2）。

### D3 · 博客搜索是否要 URL 状态？

- 推荐**不做** `?q=`：会产生可索引重复页、污染 sitemap/analytics，且需要 canonical/hreflang 处理（与 L-05 同类的 URL 风险）。搜索是辅助查找，不是落地页。
- 可选后续：命中高亮（注意 CJK/性能）、分类筛选（需 `data-category` + 一组 i18n 键）。本轮保持“标题+描述 AND 匹配”的简单可靠实现。

### D4 · R2 发布顺序（建议）

1. **R2-B 博客搜索**（已实现主体）→ 走 Preview + 四道门禁，先上线最低风险项。
2. **R2-A 移动回归门禁**（并行任务）→ 补齐触摸/滚动导出/导航抽屉断言。
3. **Contact**：先定 D1（邮箱/方案），再实现；若选 B 需隐私政策更新 + 账户操作。
4. **单层导航**：ADR + 5 语言同批 + 灰度；高影响改动最后做。

---

## 5. 实现建议（CSS / JS / 页面范围）

### 5.1 CSS（`assets/css/components.css`，token only）

| 主题 | 建议类/位置 | 说明 |
|---|---|---|
| 单层导航 | `.mc-nav*`（或 `body .ghibli-nav` 覆盖层） | 桌面 64px、移动 `--mc-mobile-nav-height`；Tools 下拉；移动菜单分组；`aria-expanded/aria-current` 状态样式 |
| Contact | 复用 `body .contact-form input/textarea`；新增 `.contact-form__field/.has-error/.error-summary/.success` | 错误红 `--mc-color-danger`；成功用品牌绿；隐私提示用 `--mc-color-brand-wash` |
| 博客搜索 | `components.css §20`（**已存在**） | 原型直接复用；不要另造 `.blog-search*` 变体 |
| 共通 | 不新增渐变/字体/图标库；图标全部内联 SVG | 原型已按此实现（无 CDN/外链） |

### 5.2 JS / 页面范围

| 主题 | 改动 | 页面范围 |
|---|---|---|
| 单层导航 | 扩展 `assets/js/ui.js`（移动菜单注入）+ 桌面下拉 disclosure（Enter/Space 开、Esc 关、↑↓、焦点返回）；nav DOM 同批替换 | 95 页 × 5 语言（root + es/ja/tw/zh） |
| Contact | 新增表单 JS（校验 / mailto 拼装 / 复制地址 / 状态切换）；i18n 键 ×5 | `contact.html` ×5 |
| 博客搜索 | `assets/js/blog-search.js` 已实现；可选增量：建议话题、命中高亮（需 5 语言键） | `blog/index.html` ×5 |
| 验证 | `run-token-audit.mjs`、`check-layout.mjs`、`run-tests.mjs`、`run-seo-checks.mjs`；行为变化同批改断言（L-35） | 全站 |

### 5.3 原型与真实实现的边界

- 原型是**静态高保真 + 少量演示 JS**（导航开合、表单校验/mailto 面板、博客过滤）；不接任何后端、不写站点文件。
- 状态变体截图（导航打开、表单错误/成功、搜索有/无结果）由 `_capture.mjs` 注入最小脚本后截取，仅演示状态，不代表已实现。

---

## 6. 风险与未覆盖项

- **5 语言同步（L-02）**：导航/表单/搜索文案在 root + 4 语言手写副本中必须同批改；漏一套就是线上英文回退或结构不一致。
- **内链/SEO 回归**：单层导航删掉 `.tool-nav` 会减少页面内的工具链接密度；必须用**页脚 Tools 列 + 页头下拉真实 `<a>`** 补回，并跑 SEO harness（canonical/hreflang/内链数不回归）。
- **行为变更与断言**：Contact/搜索/导航都会改变用户可见行为；functional 断言需同批更新（L-35），不能旧断言读 alert/dialog 造成假 PASS。
- **第三方服务合规（H8）**：选 B 时账户注册、endpoint、隐私政策、数据处理地都需要维护者执行/确认；AI 不代办。
- **无障碍**：下拉/菜单键盘模型、表单错误 summary 的 focus、`aria-live` 计数、44px 触控是验收项，不是“可选项”。
- **未覆盖**：移动端 blur 性能预算（P2-9，需真机 profiling）；搜索分类筛选；Contact 反垃圾（若选 B 由服务商承担）；真实邮件投递验证（mailto 需人工点一次邮件客户端）。
- **不确定项**：收件邮箱是否存在、是否接受公开（需维护者确认）；R2-B 当前为未提交工作区改动，合入状态以维护者最终 PR 为准。

---

## 7. 截图说明与验证

- `screenshots/review/`：注释条 + 红色标注 + 844/900px 首屏线，用于逐条对照审计（`index` 的总览 review 首屏保留注释条、无红色标注）。
- `screenshots/clean/`：注入 `display:none` 隐藏评审 chrome，展示设计本体；`*-full.png` 展示 900px 之后的状态规格。
- 首屏截图是“滚动到 App 起点后截真实视口”（固定壁纸/吸顶 nav 与真机一致），不是从整页图裁切。
- **已做验证**：
  - `_capture.mjs` 断言 4 页 × 2 视口 `scrollWidth === innerWidth` → **0 横向溢出**（输出见脚本日志）。
  - 页面无 `http(s)://` 外链 / 无 CDN（只用仓库内 tokens + components + 本地壁纸 + 内联 SVG）。
  - HTML 标签结构自检通过（无未闭合标签）；所有颜色/字号/圆角/阴影来自 `--mc-*`（评审红标注/SVG 插画除外，见 §0 说明）。
  - 原型页面不写站点文件；`git status` 中本任务只新增 `docs/design/prototypes/r2/`。
- **未做**：真机手感、真实邮件投递、Preview 部署验证、5 语言翻译质量。

---

## 8. 关联文档与教训

- 审计与路线图：[INTERACTION-AUDIT.md](../../INTERACTION-AUDIT.md)（P0-2 / P2-3 / P2-4 / §5 R2）
- Token 规范：[DESIGN-TOKENS.md](../../DESIGN-TOKENS.md)（273 个 `--mc-*`）
- 组件配方：[COMPONENT-RECIPES.md](../../COMPONENT-RECIPES.md)
- R0/R1 原型（上一批）：[../README.md](../README.md)
- 相关教训/规则：L-02（5 语言手写副本）、L-35（行为变更同批改验收断言）、H8（账户级操作）、H9（URL 结构）、H11（UI 四道门禁 + L-31~L-36）
- R2-B 实现契约：`blog/index.html`、`assets/js/blog-search.js`、`components.css §20`、`i18n/*.json` 的 `blog.search.*` 键

---

## 变更记录

| 日期 | 变更 |
|---|---|
| 2026-11-06 | v1.0：R2 三个战略原型 + 总览 + review/clean 截图（1440×900 / 390×844）+ 决策点与实现接口 |
