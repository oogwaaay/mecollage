# MeCollage 交互 / 功能 / 布局审计（「只统一不重设计」之后的下一步）

> 版本：v1.0（2026-11-06）· 分支 `docs/design-tokens` · 关联：[DESIGN-TOKENS.md](DESIGN-TOKENS.md)、[PAGE-PATTERNS.md](PAGE-PATTERNS.md)、[ADR-0006](../decisions/ADR-0006-design-token-single-source.md)
> 证据层：**代码层 + 本地渲染层**（1440×900 / 390×844，CDP 实测）；未联网、未做真实设备/线上取证，相关项标注不确定。
> 审计对象：95 个页面、5 个主要用户旅程、编辑器全部控件、4 个工具页、语言切换、内容页、错误/空/加载状态、移动端布局。

---

## 0. TL;DR（如果只读一段）

MeCollage 的**功能是可靠的**（Phase F 浏览器回归 52 PASS / 0 FAIL / 1 WARN），设计 token 与视觉统一也已完成。但以「乔布斯/苹果」的产品标准看，当前站点更像**一个 SEO 内容站 + 后面接了一个工具**，而不是**一个工具**：

1. **主操作被埋在首屏以下**：移动端首页上传区在 y=**1148px**（1.36 屏），工具页在 y=**1193px**（1.4 屏）；因为页面顶部叠了 270px 的堆叠导航 + 181px 标题 + 374px 工具导航 + 218px 重复工具卡。桌面工具页上传区也在 y=485–607px（被标题/工具导航/意图提示占据）。
2. **导航重复且互相竞争**：全局导航（Home/Blog/About/Square Image）+ 工具导航（Home/Square Crop/Rounded/Square/Blurred）+ 首页重复的 2 张工具卡；"Home" 出现 2–3 次，工具名不统一（Square Image / Square Image Converter / Collage Maker）。
3. **反馈方式原始**：编辑器有 **15 处 `alert()`**（见 L-20261106-32 全行号）（多数是硬编码英文，本地化页也不翻译）；站点有 `.toast` 样式但 **没有任何 JS 使用**（死代码）；导出无进度/成功反馈，AI 模型下载只有按钮文字变化。
4. **关键操作不可见/不可用**：撤销/重做只有键盘快捷键（无按钮、无提示）；刷新会丢作品（无 beforeunload/草稿）；移动端**无法拖动排序照片**（只实现 HTML5 drag，无 touch/pointer）。
5. **移动端不是"移动优先"**：270px 的堆叠导航、无折叠菜单、工具栏图标依赖 Font Awesome CDN、部分触控目标 24–40px（低于 44pt）。

> 一句话：**不是不好用，是"不够像一个被设计过的产品"。** 修复顺序应该是：先让主操作出现在第一屏（P0-1/2/3），再把反馈与容错做成产品级（P1-4~8），最后做 Apple 式的"少而准"的打磨（P2）。

---

## 1. 方法与证据

| 证据 | 内容 |
|---|---|
| 本地渲染 | Chrome headless（离线、阻断外部 CDN），1440×900 与 390×844；CDP 测量元素位置/尺寸/状态；截图见 `audit/design-migration/{before,after,after-final}/` |
| 功能回归 | `scripts/functional-audit/run-tests.mjs`：**52 PASS / 0 FAIL / 1 WARN**（43 张状态截图：上传/比例/网格/滤镜/文字/贴纸/导出/AI 失败/工具页各流程） |
| 代码事实 | `assets/js/mecollage-main.js`（2135 行）、`assets/js/i18n.js`、95 个页面的 HTML/内联样式 |
| 设计事实 | [PAGE-PATTERNS.md](PAGE-PATTERNS.md)（27 个页面族、31 个内联块、3 套色板）、[DESIGN-TOKENS.md](DESIGN-TOKENS.md) |
| 未覆盖 | 真实网络（Google Fonts/Font Awesome/AdSense/模型下载）、真机手势、屏幕阅读器、真实用户数据；相关结论标注"需 Preview/真机" |

关键实测（本地，2026-11-06）：

| 指标 | 移动端 390×844 | 桌面 1440×900 |
|---|---|---|
| 全局导航高度 | **270px**（4 个全宽 pill + GitHub + 语言） | 72px |
| 首页页头（标题+副标题） | 181px | 176px |
| 工具导航容器高度 | **374px**（5 个全宽 pill） | 84px |
| 首页重复工具卡 | 218px | 88px |
| **首页上传区 top** | **1148px**（首屏 844 之外 304px） | 749px（可见，但在底部） |
| **工具页上传区 top** | **1193px** | 607（square）/ 485（rounded） |
| 上传后编辑器位置 | 侧栏 1115 / 画布 1638 / 工具栏 2245 | 侧栏/画布/工具栏同屏 |
| 上传后是否自动滚动/聚焦 | **否**（用户仍在页面顶部） | 无需（同屏） |
| 页面总高（上传后） | **5610px** | — |

---

## 2. 五个用户旅程 vs Apple 标准

### 2.1 首页 → 上传 → 编辑 → 导出（核心旅程）

| 步骤 | 现状 | 问题 |
|---|---|---|
| 进入首页 | 270px 导航 + 标题 + 374px 工具导航 + 218px 重复卡片 | **7 个导航项 + 2 层工具入口**，用户要先做"选哪个导航"的决定 |
| 找到上传 | 上传区在 1148px | **要滚 1.4 屏**；首屏没有任何主操作 |
| 上传 | 文件选择/拖拽；`accept=image/*`；错误用 `alert()` | 无进度、无成功提示；错误是阻塞弹窗且英文 |
| 看到编辑器 | upload-screen 隐藏，但**页面不滚动**，用户停在原位置 | 用户可能以为"没反应"；没有焦点/滚动/提示 |
| 编辑 | 左侧栏控件 + 画布 + 底部 6 个图标按钮 | 无可见撤销/重做；图标只靠 Font Awesome；placeholder 用了浅色（JS 硬编码） |
| 导出 | 点击底部工具栏导出图标 → html2canvas 同步合成 → 直接下载；失败 `alert` | 无进度、无成功反馈、按钮不禁用（可连点）；固定白底不可见预览 |
| 重来 | 刷新 | 无提示、无草稿，作品丢失 |

**Apple 会怎么做**：把"上传"变成首屏的绝对主角（拖拽区 + 粘贴 + 示例图），导航收成一条；上传后平滑滚到画布并给出"3 张照片已添加"的反馈；导出前给一个结果预览/尺寸/格式的小面板，导出时禁用按钮+进度，成功给一条可撤销（或"再导一次"）的提示。

### 2.2 工具页直达（搜索/外链）→ 上传 → 调整 → 下载

| 步骤 | 现状 | 问题 |
|---|---|---|
| 进入 | 长 H1（移动端 3 行）+ 副标题胶囊 + 5 个工具导航 pill + 意图切换条 + 模式引导 → 上传区 1193px | **"工具页没有工具"的首屏**；移动端尤其严重 |
| 调整 | 右侧 Tools / Settings 面板，模式按钮 + 滑块/预设 + 下载设置 | 面板在下（移动端）、信息密度高；部分预设按钮触控目标 36px |
| 下载 | `.download-btn` 绿色 CTA；图片尺寸/格式/质量可选 | 无预览、无文件大小预估、无导出成功反馈；默认参数多（1200/JPEG/85%）对小白不友好 |
| 意图切换 | square ↔ squarecrop 互链条（Phase D） | 好设计，但出现在上传区之前，干扰主任务 |

**Apple 会怎么做**：首屏就是一个"上传/拖入图片"的大按钮 + 3 个模式卡片（Blur/Color/Crop）；工具导航变成紧凑 segmented control 或下拉；SEO 说明、FAQ、意图切换全部放到工具下方（仍可爬取）。模式名用用户语言而不是工具名（"让整张照片变方形"而不是 "Square Image Converter"）。

### 2.3 语言切换

- 现状：`.lang-selector` 玻璃胶囊 + `role=menu` + 真实 `<a href>`（对 SEO 好），JS 只负责开合与 aria-expanded。
- 问题：**无 Escape 关闭、无方向键导航、无焦点返回**；菜单用 inline `display` 覆盖 CSS（两套状态机制）；点外部关闭有，但键盘用户离开后会"丢焦点"。
- Apple 会怎么做：标准 disclosure/menu 键盘模型（Enter/Space 开、Esc 关、方向键移动、关闭后焦点回按钮）；语言用母语名 + 当前语言勾选。

### 2.4 内容阅读（博客/政策/专题）

- 现状：统一玻璃标 + 72ch 行宽 + 1.8 行高；博客有返回/相关文章；政策页有锚点标题。
- 问题：没有阅读进度/目录（长政策、长博客）；专题页 CTA 与内容混排；移动端标题 3–4 行且相邻模块气泡多；页脚密排 pipe 链接。
- Apple 会怎么做：文章页做"阅读器"——单栏、70ch、清晰层级、目录（长文）、文末一个明确 CTA；去掉文章内部过多的玻璃边框。

### 2.5 错误 / 空 / 加载状态

| 状态 | 现状 | 问题 |
|---|---|---|
| 上传失败/格式错 | `alert()`（英文） | 阻塞、不可翻译、无重试入口 |
| 超过 20 张 | `alert()` | 同上；没有"删除/替换"的引导 |
| 自定义网格非法 | `alert('Please enter valid grid dimensions (1-10)')` | 同上 |
| AI 模型加载失败 | `alert('Failed to load AI models…')` | 没有重试/降级说明；模型下载无进度、无取消 |
| 导出失败 | `alert('Export failed…')` | 无重试、无错误码/建议 |
| 空编辑器 | 上传屏 + 一行 hint；placeholder 浅色 | 没有示例/引导；"能做什么"要靠猜 |
| 加载中 | AI 按钮文字变 Processing，禁用 | 导出无 loading；页面级无骨架 |

---

## 3. 问题清单（按 Apple 标准分级）

### P0 — 直接影响"第一次能不能用起来"（建议下一轮就修）

| # | 问题 | 证据 | 建议 | 风险/成本 |
|---|---|---|---|---|
| P0-1 | **首屏无主操作**：移动端上传区 1148–1193px；桌面工具页 485–607px | 本地 CDP 实测（§1 表） | 移动端：把 upload/preview 放到页头之前或折叠页头；桌面工具页：工具 UI 提前，SEO 文案下移 | 中；需 5 语言同步 + Preview 截图；不动 URL/SEO 文本内容 |
| P0-2 | **两层导航 + 重复工具入口**：全局 nav + tool nav + 首页 2 张工具卡；Home 出现 2–3 次 | 截图/HTML | 只保留 1 层全局导航；工具切换做成工具页内 segmented control；删除首页重复工具卡 | 中；涉及 95 页 head/body；建议先用 `components.css` 隐藏/重排，不改 HTML 结构 |
| P0-3 | **移动端导航 270px、无折叠**；GitHub 占主导航位 | 截图/实测 | ≤768 用汉堡菜单（Logo + 菜单按钮），GitHub 移入菜单/footer | 中；需要 JS/CSS；5 语言同步 |
| P0-4 | **上传后无过渡**：不滚动、不聚焦、不提示 | 实测（上传后仍停在顶部；编辑器 y=1115） | 上传完成后 scrollIntoView + 聚焦画布标题 + toast "N 张照片已添加" | 低；JS 改动需 functional-audit |

### P1 — 反馈、容错、触控（第二优先级）

| # | 问题 | 证据 | 建议 |
|---|---|---|---|
| P1-1 | 15 处阻塞 `alert()`，多数硬编码英文；`.toast` 是死代码 | `main.js` HEAD 15 处（行号见 L-20261106-32）；改造后 0 处；grep 无 toast 使用 | 实现统一的 `showToast(type,message)`（成功/信息/错误/可撤销），全部 i18n 化；移除 alert |
| P1-2 | 无可见撤销/重做；只有键盘 Ctrl/Cmd+Z、Shift+Cmd+Z | `main.js:729-732,759-788`；HTML 无 undo 按钮 | 底部工具栏加 Undo/Redo（禁用态 + 操作后短暂高亮/提示） |
| P1-3 | 无未保存保护：刷新/关闭即丢作品；无 beforeunload；无草稿 | 代码检索无 beforeunload/localStorage 草稿 | images.length>0 时 beforeunload 提示；可选 localStorage 草稿（含清空按钮） |
| P1-4 | 导出无进度/成功反馈，按钮可连点；无文件大小预估 | `main.js:1880-1912` | 导出时禁用按钮 + loading 文案；成功 toast（含尺寸/大小）+ 失败可重试 |
| P1-5 | AI 库（html2canvas/onnxruntime/face-api）首页就加载；模型下载无进度/取消 | `index.html:1376-1380` | 点击 AI 时才动态加载库；模型下载显示进度/可取消；失败给重试 |
| P1-6 | **移动端不能拖动排序照片**（仅 HTML5 drag） | `main.js:950-953,1114-1150`；functional 报告 WARN touch | 指针事件拖拽 + 长按手柄；补充"←/→"按钮作为无拖拽 fallback |
| P1-7 | 图标按钮无 aria-label，只靠 Font Awesome CDN；断网/CDN 失败按钮变空白 | `index.html` 底部工具栏 6 个按钮仅 `title` | 加 `aria-label`；关键图标内联 SVG 或文字 fallback；自托管图标 |
| P1-8 | 触控目标 <44px：删除按钮 24px、导航 pill 40px、预设 36px | 实测/截图 | 用 padding/伪元素扩大热区到 ≥44px（不改变视觉尺寸） |

### P2 — 精致度与一致性（Apple 式打磨）

| # | 问题 | 建议 |
|---|---|---|
| P2-1 | 文案缺陷：首页副标题重复 "up to 20 photos…Support up to 20 photos"；"Simple. Professional." 碎片；CTA 名称不统一（Try MeCollage Free / Start Creating for Free / Download Image） | 统一 voice & tone；每个工具一个名字；CTA 统一动词 |
| P2-2 | 编辑器空位用 JS 硬编码浅色（`#f1f5f9/#e2e8f0/#94a3b8`），深色画布里出现白色方块 | 把 JS 内联色改为 `var(--mc-*)`/class；空位与照片格同视觉语言 |
| P2-3 | Contact 页没有表单，只有 email/GitHub 卡片 | 要么加简单反馈表单（需后端/第三方），要么改名为 "Support" 并写清响应渠道 |
| P2-4 | 博客列表无搜索/筛选（CSS 里有 blog-search/category 死代码） | 实现客户端搜索/分类；或删除死样式 |
| P2-5 | 语言菜单无 Esc/方向键/焦点返回 | 标准 menu 键盘模型 |
| P2-6 | 无 skip link；部分页面无 `<main>` 地标 | 加 skip-to-content + 统一 `<main>` |
| P2-7 | 首次使用无示例/引导；空状态只有一行 hint | "试用示例照片"按钮；3 步说明（上传→排布→导出） |
| P2-8 | 页脚 pipe 链接密排，移动端换行难看 | 2 行分组/列布局 |
| P2-9 | 玻璃卡片数量多 + 18px 模糊，移动端滚动可能掉帧（未实测） | ≤768 把模糊降到 10–12px；限制同屏 backdrop-filter 数量；真机 profiling |
| P2-10 | 长 SEO 内容与工具 UI 抢注意力 | 工具优先，内容后置；保留全部可爬文本 |

---

## 4. 如果这是 Apple 的作品：7 条设计原则与对应动作

> 乔布斯的标准不是"加更多功能"，而是**删到只剩最关键的东西，并让它在第一秒就成立**。

| 原则 | 当前违反点 | 对应动作 |
|---|---|---|
| **1. The tool is the hero（工具即页面）** | 首屏是导航/营销/SEO，不是工具 | 首屏 = 上传/拖入 + 3 个模式；内容下移 |
| **2. One obvious path（一条明显路径）** | 两层导航、重复工具卡、Home 出现多次 | 一条导航；工具内一个 segmented control；删除重复入口 |
| **3. Direct manipulation（直接操作）** | 移动端不能拖动排序；无可见撤销 | 触控拖拽 + 可见 Undo/Redo + 即时反馈 |
| **4. It just works（不发生"技术性失败"）** | alert 英文、CDN 图标缺失、导出无反馈、AI 库提前加载 | 非阻塞反馈、fallback、懒加载、失败重试 |
| **5. Calm & confident（克制、自信）** | 玻璃卡片/边框/胶囊过多、标题过长 | 减少边界；一层玻璃；标题 ≤2 行；一个强调色 |
| **6. Delight in details（细节惊喜）** | 上传后无反馈、导出无成功态 | 上传完成轻提示、导出成功预览、空状态示例 |
| **7. Accessible by default（无障碍即默认）** | 触控目标小、菜单键盘弱、缺 skip link | 44px、键盘模型、aria-label、焦点管理 |

**Jobs 会"说不"的地方**：不做第二层导航、不做第二套工具入口、不把 GitHub 放在主导航、不用 alert 作为产品反馈、不让用户猜"工具在哪里"、不在首屏堆三个营销 pill。

**会保留的地方**：壁纸 + 玻璃 + 薄荷绿的 Ghibli 识别度；单用途工具（square vs squarecrop 的意图区隔）；客户端处理/隐私承诺；5 语言完整覆盖；SEO 长文（只是位置调整，不删内容）。

---

## 5. 建议路线图（按投入产出排序）

| 批次 | 内容 | 预估 | 门禁 |
|---|---|---|---|
| **R0（1–2 天）** | P0-4 上传后滚动/聚焦/提示；P1-1 alert→toast+i18n；P1-2 可见 Undo/Redo；P1-7 图标 aria-label；P1-8 触控热区；P2-1 文案修复；P2-2 空位浅色改 token；P2-5 语言菜单键盘 | 小步 CSS/JS，测试覆盖 52 项回归 | C2：分支 → Preview → functional + token audit → 批准 |
| **R1（1–2 周）** | P0-1/P0-2/P0-3 移动端工具优先布局（导航折叠、上传前置、SEO 下移）；P1-3 未保存保护；P1-4 导出进度/成功；P1-5 AI 懒加载；P1-6 触控拖拽 | 涉及 95 页 + JS；逐页 5 语言同步 | C2 + Preview 截图矩阵 + 真机抽查；必要时 ADR |
| **R2（战略）** | 工具页/首页 IA 重构（工具即页面）、单导航、组件库（`components.css` → 编辑器组件）、性能预算（移动端 blur/图片/字体）、Contact 表单/改名、博客搜索 | 大改，需产品决策 | ADR + 维护者批准 + 全量回归 + 灰度 |

> 优先级原则：**先修"用户第一次能不能用起来"，再修"用起来顺不顺"，最后才是"好不好看"。**

---

## 6. Apple 式记分卡（1–5，现状 vs 目标）

| 旅程 | 清晰 | 反馈 | 一致性 | 步骤效率 | 精致 | 目标 |
|---|---:|---:|---:|---:|---:|---|
| 首页 → 编辑器 | 3 | 2 | 3 | 2 | 3 | 5/4/5/4/5 |
| 工具页直达 | 2 | 2 | 3 | 2 | 3 | 5/4/5/5/4 |
| 语言切换 | 4 | 4 | 3 | 4 | 3 | 5/5/5/5/5 |
| 内容阅读 | 4 | 3 | 4 | 4 | 4 | 5/4/5/5/5 |
| 错误/空/加载 | 2 | 1 | 2 | 2 | 2 | 5/5/5/5/4 |

（现状分数来自本次实测与代码审查；目标分数按 R1–R2 完成后的合理预期。）

---

## 7. 不应该做什么（Apple 式克制）

- **不要**为了"高级"加更多渐变/发光/动画；当前的问题不是不够炫，是信息层级被埋。
- **不要**删除 SEO 长文来"显得干净"——只调整顺序；GSC/内容策略仍然重要。
- **不要**在 5 语言副本上分叉设计（L-02）；先做共享层（components.css）再逐页改。
- **不要**为了拖拽重排去引入大型库；优先 pointer events + fallback 按钮。
- **不要**动 AdSense/Publisher ID/GA4/URL 结构（H5/H9）；这些不是交互设计问题。
- **不要**一次性重写 95 页布局；R0 用 CSS/JS 覆盖层，R1 再逐页，R2 才谈 IA 重构。

---

## 8. 证据与复现

| 证据 | 路径/命令 |
|---|---|
| 首屏/编辑器位置测量 | 本地 CDP 脚本（本次一次性，`/tmp/mc/ux-measure.mjs`）；数值见 §1 |
| 移动端截图 | `audit/design-migration/interaction/`（首屏/工具页/编辑器实拍）与 `audit/design-migration/after-final/`（全页）；`audit/design-migration/interaction/editor-mobile-canvas.png` |
| 功能状态截图（43 张） | `audit/evidence/phase-f/browser/shots/`（上传/导出/AI/工具页各状态） |
| 代码位置 | `assets/js/mecollage-main.js` 行号见 §3；`index.html:1376-1380`（AI 库提前加载） |
| 功能回归 | `node scripts/functional-audit/run-tests.mjs` → 52 PASS / 0 FAIL / 1 WARN |
| 溢出/壁纸验收 | `audit/design-migration/MOBILE-OVERFLOW.md`、`WALLPAPER.md`、`verify-wallpaper.json`（280/280） |

> 本文是**审计与建议**，不是已实施改动。R0/R1 的执行需要按 GOVERNANCE C2 走 Preview + 批准；其中任何涉及 5 语言内容位置调整的改动必须在同一批内完成（L-02）。

---

## 9. 实施记录（2026-11-06，R0 / R1）

> 本节是审计的"落地状态"，详细证据见 `audit/design-migration/R1-RESULTS.md`；原型见 [prototypes/README.md](prototypes/README.md)。

**已完成（R0）**

- `alert()` → toast：15 处全部替换为 `window.mcUI.toast`（四态、aria-live、action）；`ui.js` 注入 94 页（排除 404）。
- 可见 Undo/Redo（5 首页工具栏）+ 未保存 `beforeunload` + 上传后 toast/滚动/焦点。
- 移动端导航：60px 单行（品牌 + 语言 + 菜单），≤64px 目标达成；语言菜单改为底部抽屉 + 完整键盘模型。
- 触控目标 ≥44px；图标按钮 aria-label；JS 裸色值清零（token 审计 v1.1 扫描）。
- 首页 hero 文案去重；工具名统一；空位白色方块 → 深色玻璃。

**已完成（R1）**

- 移动端工具优先布局（CSS order，DOM/SEO 文本不动、桌面不变）：首页上传区 top **1148 → 109px**；工具页 **1193 → 259–434px**；工具导航 374 → 62px（横向滚动）。
- 导出：禁用/进度/成功（尺寸+大小）/失败重试；修复滚动后导出空白（`scrollX/scrollY:0`）。
- AI 库懒加载（onnxruntime/face-api 静态脚本移除，失败可重试）。
- 触控拖拽排序（长按手柄 + pointer capture；鼠标 HTML5 drag 保留）。

**门禁结果**：functional **51 PASS / 0 FAIL / 2 WARN**；SEO **32/0/0**；token **PASS（273 tokens）**；移动端 320/360/390/1440 溢出 **0**（check-layout --full 证据）；ui.js 注入 94/94。

**未做 / R2**：单层导航与 IA 大改、博客搜索、Contact 表单、移动端 blur 性能预算、真机手势验证、生产部署（H1 待维护者批准）。
