# MeCollage 交互原型（R0 / R1）

> 版本：v1.0（2026-11-06）· 分支 `docs/design-tokens` · 依据：[INTERACTION-AUDIT.md](../INTERACTION-AUDIT.md) v1.0
> 写范围：**只写 `docs/design/prototypes/`**；未修改任何站点 HTML/CSS/JS，未 commit / 未部署 / 未联网。
> 视觉基线：复用 [`assets/css/design-tokens.css`](../../../assets/css/design-tokens.css) + [`assets/css/components.css`](../../../assets/css/components.css)，不引入新视觉风格。

---

## 0. 30 秒版

| 原型 | 视口 | 一句话 | 审计条目 | 路线 |
|---|---|---|---|---|
| [`index.html`](index.html) | 1440 | 总览：4 个方案卡片 + 问题 + 决策 + R0/R1 对应 + 实现接口 | — | — |
| [`mobile-home.html`](mobile-home.html) | 390×844 | 移动首页：56px 单层顶栏 + 横向工具 segmented + **首屏上传卡**（含试用示例照片），guides/FAQ 后置 | P0-1 P0-2 P0-3 P2-7 P2-10 | R1 |
| [`mobile-tool.html`](mobile-tool.html) | 390×844 | 移动工具页：短标题 + segmented + **首屏上传 + 模式卡**，展示选中模式与上传后预览态；设置/下载下移 | P0-1 P0-2 P0-4 P1-4 P1-8 P2-1 P2-10 | R1 |
| [`editor-interactions.html`](editor-interactions.html) | 1440×900 | 编辑器：**Undo/Redo 按钮 + toast 四态 + 导出 loading/成功（含文件大小）+ 空状态示例 + 深色玻璃空位** | P0-4 P1-1 P1-2 P1-3 P1-4 P2-2 P2-7 | R0 + R1 |
| [`desktop-tool-first.html`](desktop-tool-first.html) | 1440×900 | 桌面工具页：紧凑页头 + segmented + 工具区进首屏、SEO 下移；工具名统一为 “Square Image” | P0-1 P0-2 P2-1 P2-10 | R1 |

**共同主张**：不是重做视觉，而是把「工具」顶到第一屏、把「导航」收成一条、把「反馈」做成产品级。壁纸 + 深色玻璃 + 薄荷绿 + 大圆角全部保留。

---

## 1. 文件清单

```
docs/design/prototypes/
├── index.html                  # 原型总览（4 个方案卡片 + 决策 + R0/R1 表 + 实现接口）
├── mobile-home.html            # 390×844 移动首页原型
├── mobile-tool.html            # 390×844 移动工具页原型（Square Image）
├── editor-interactions.html    # 1440×900 编辑器交互原型 + 下半部分状态规格
├── desktop-tool-first.html     # 1440×900 桌面工具页原型
├── README.md                   # 本文件
├── _capture.mjs                # 截图脚本（复用 scripts/functional-audit/cdp.mjs，只 import）
└── screenshots/
    ├── review/                 # 评审版：顶部注释条 + 红色标注 + 首屏折叠线
    │   ├── index-desktop-full.png
    │   ├── mobile-home-mobile-full.png · mobile-home-390x844.png
    │   ├── mobile-tool-mobile-full.png · mobile-tool-390x844.png
    │   ├── editor-interactions-desktop-full.png · editor-interactions-1440x900.png
    │   └── desktop-tool-first-desktop-full.png · desktop-tool-first-1440x900.png
    └── clean/                  # 干净版：隐藏 .proto-note/.pmark/.foldline/.state-tag，给用户看设计本体
        ├── index-desktop-full.png
        ├── mobile-home-mobile-full.png · mobile-home-390x844.png
        ├── mobile-tool-mobile-full.png · mobile-tool-390x844.png
        ├── editor-interactions-desktop-full.png · editor-interactions-1440x900.png
        └── desktop-tool-first-desktop-full.png · desktop-tool-first-1440x900.png
```

截图命名规则：`<原型名>-<mobile|desktop>-full.png` = 整页；`<原型名>-<宽>x<高>.png` = 目标视口的真实首屏。复现：

```bash
node docs/design/prototypes/_capture.mjs            # 全部
node docs/design/prototypes/_capture.mjs mobile     # 只跑文件名含 mobile 的
```

脚本会在仓库根目录起一个 **只读本地静态服务器（127.0.0.1，不联网）**，用本机 headless Chrome 截图，并在结束时检查所有原型 `scrollWidth === innerWidth`（当前 0 溢出）。清理版截图通过注入 `<style>` 隐藏评审 chrome，不改原型文件。

---

## 2. 每个原型解决什么

### 2.1 `mobile-home.html` — 首屏即上传

- **现状（审计证据）**：上传区在 y=1148px（1.36 屏）；全局导航 270px（4 个全宽 pill + GitHub + 语言）；工具导航 374px；首页重复工具卡 218px；Home 出现 2–3 次。
- **原型做法**：
  1. 56px 单层顶栏：Logo + 语言 + 汉堡；About/Blog/Guides/GitHub 收进汉堡菜单（GitHub 离开主导航）。
  2. 5 个工具全部收进**横向 segmented**（44px 触控，可横滑），删除 374px 工具导航与 218px 重复工具卡。
  3. 首屏 = 上传卡：主 CTA「Choose photos」+ 次级「Try sample photos」+ 隐私承诺（photos never leave your device）。
  4. 3 步说明（Add → Arrange → Export）替代重复工具卡，手机 844px 首屏内完成「上传 + 理解成本」。
  5. guides / FAQ 整体移到工具之后（保留全部可爬文本，只调顺序）。
  6. 底部保留一句简短信任文案 + 页脚链接。
- **红色标注**：① 顶栏 56px ② 工具 segmented ③ 首屏即上传 ④ 3 步说明 ⑤ SEO 后置 ⑥ 信任 footer。

### 2.2 `mobile-tool.html` — 工具页先给工具

- **现状**：工具页上传区 y=1193px；长 H1（移动端 3 行）+ 副标题胶囊 + 5 个工具 pill + 意图切换条都排在工具前面；工具名有 Square Image / Square Image Converter 等多种叫法；预设按钮触控 36px。
- **原型做法**：
  1. 短标题 `Square Image`（≤2 行）+ 一句话副标题，工具名在标题/segmented/下载卡中统一。
  2. 首屏结构：短标题 → 工具 segmented → **大上传卡**（Choose photo + Try sample photo）→ **4 个模式卡**（Blur / Color / Resize / Crop，选中态带 check + 44px 热区）→ 信任标签。
  3. **状态 B：上传后预览态**单独展示：1:1 预览（整张照片 + 模糊填充）、尺寸 chip、模式 chips（选中 Blur）、“Replace / Remove”；该区块是 P0-4「上传后 scrollIntoView + 聚焦」的目标位置（红色 ⑤ 标注）。
  4. Settings / Download 移到预览之后（不在首屏与工具抢位置），下载 CTA 使用绿色成功渐变 + 文件规格。
  5. 工具之后才是 How-to（3 步）、Square Image ↔ Square Crop 意图互链、FAQ（保留可爬文本）。

### 2.3 `editor-interactions.html` — 反馈与容错产品化

上半部分 = 1440×900 编辑器实况；下半部分 = 供 R0 直接实现的 4 张状态规格卡（A Toast 四态 / B 导出三态 / C 空状态 / D 照片格占位）。

- **Undo/Redo**：底部工具栏新增可见按钮（Undo 可用、Redo 禁用态可见），带文字标签（同时解决 P1-7 图标无 aria-label 的问题）。
- **Toast 四态**：成功（含文件名 + 2.4 MB）/ 信息 / 错误（带 Retry）/ 可撤销（带 Undo）；统一 `showToast(type, message, action?)`，替换 12 处 `alert()`。
- **导出状态机**：右栏展示 loading（按钮禁用 + spinner + 64% 进度条 + 步骤文案）；画布内展示成功 toast（**文件名 + 2.4 MB** + Download again）；规格 B 卡演示 默认 → loading → 成功 三态。
- **空状态**：规格 C 卡展示 “No photos yet” + 主 CTA「Choose photos」+ 次级 **「Try sample photos」**（P2-7）。
- **照片格占位**：画布 2×2 中留一个空位 = **深色玻璃 + 2px dashed 品牌绿 + 44px 热区**（替换 JS 硬编码的 `#f1f5f9` 白方块，P2-2）；规格 D 卡并排对比「旧白方块 vs 新深色玻璃」。
- **未保存保护**：右栏写明 “This collage lives in this tab only”；规格外还建议 `beforeunload`（P1-3，属 R0 JS）。

### 2.4 `desktop-tool-first.html` — 桌面工具页 IA

- **现状**：上传区在 y=485–607px；页头叠了长 H1 + 副标题胶囊 + 84px 工具导航（含重复 Home）+ 意图切换条；工具名三种叫法。
- **原型做法**：
  1. 紧凑单层页头（60px）：Logo + 一级导航 + on-device/EN；删除第二层「工具导航」容器。
  2. 工具 segmented 与短标题同一行（分段控件取代 84px 工具 nav），工具区（预览 + 模式 + 设置 + 下载）全部进入 900px 首屏（预览/模式约在 y=137–809）。
  3. 工具名统一：H1、segmented、下载卡、SEO 正文一律 “Square Image”。
  4. “How to make an image square” / 模式对比 / Square Crop 意图互链 / FAQ 全部下移到 900px 之后，文本完整保留、可爬（P2-10）。
  5. 首屏底部保留 48px 信任条（on-device / free / formats / How it works）。

---

## 3. 与 R0 / R1 的对应

| 批次 | 原型里的改动 | 落地方式 |
|---|---|---|
| **R0**（1–2 天，小步 CSS/JS） | toast 四态、导出 loading/成功、可见 Undo/Redo、空状态示例、空位深色玻璃、上传后滚动/聚焦、44px 热区、上传后 toast | `components.css` 追加标准类 + `mecollage-main.js` 小步替换；不动布局/URL；跑 functional 52 项回归 + token audit |
| **R1**（1–2 周，布局与 IA） | 移动端单层顶栏 + 汉堡、横向工具 segmented、工具区前置、SEO 下移、工具名/文案统一 | 5 语言同步（L-02）；建议先做共享 CSS 覆盖层（PAGE-PATTERNS 策略），再逐页调整 |
| **R2**（战略，不在本批） | 全站单导航、组件库、性能预算、Contact/博客搜索 | 需 ADR + 产品决策，本原型不覆盖 |

> 与审计 §5 的边界一致：**R0 只做覆盖层和小步 JS，R1 才动布局顺序**。本原型用来先对齐「长什么样、先做什么」，不是实现承诺。

---

## 4. 设计决策（为什么这样排）

1. **首屏只回答一个问题**：移动端把「上传/预览 + 模式」放在第一屏，标题压缩到 1–2 行，副标题一句话；营销与 SEO 内容不删除、只后置。依据：审计 §1 实测（上传区 1148/1193px）与原则 1（The tool is the hero）。
2. **导航从两层变一层**：全局 nav + 工具 nav + 重复工具卡三者只保留一个工具入口（横向 segmented）。移动端用 56px 顶栏 + 汉堡；桌面端用单层页头 + segmented。依据：P0-2（Home 出现 2–3 次）与原则 2（One obvious path）。
3. **反馈非阻塞、可撤销**：所有 `alert()` 场景改为 toast 四态；危险/可逆操作带 Undo；导出显示进度与成功（文件名 + 大小）。依据：P1-1 / P1-4 与原则 4（It just works）。
4. **直接操作可见**：Undo/Redo 从“只有快捷键”变成可见按钮（禁用态也显示，传达能力存在）；移动端触控目标 ≥44px（视觉尺寸不动，用 padding/伪元素扩热区）。依据：P1-2 / P1-8 与原则 3（Direct manipulation）。
5. **空状态就是第一次引导**：空画布给「Choose photos + Try sample photos」，空照片格与新视觉语言一致（深色玻璃 + dashed），不再出现白方块。依据：P2-7 / P2-2。
6. **视觉零新增**：只使用 `design-tokens.css` 的 `--mc-*` 与 `components.css` 既有类/配方（玻璃层级、薄荷绿标题、大圆角、按钮语义蓝=主操作/绿=成功）；没有新渐变、新字体、新图标库；图标全部内联 SVG（无 Font Awesome CDN，断网可用）。
7. **可评审与可实现分离**：页面顶部注释条 + 红色编号标注告诉评审查“改了什么、对应哪条审计”；同一个页面隐藏评审 chrome 后就是干净设计稿（`screenshots/clean/`）。规格卡（editor 下半部分）把状态固化成可实现的接口清单。

---

## 5. 视觉 / 技术合规说明

- **引入层**：每页只引入 `../../../assets/css/design-tokens.css` + `../../../assets/css/components.css`（任务描述里的 `../../` 少一层，实际从 `docs/design/prototypes/` 回仓库根是 `../../../`）。
- **壁纸**：`components.css` 的 `.ghibli-background` 用绝对路径 `/wallImage.webp`，原型在本目录内用 `body .ghibli-background { background-image: url(../../../wallImage.webp); }` 覆盖（同特异性 + 后加载），保证 `file://` 与本地服务器都能看到云海壁纸。
- **图片**：全部为内联 SVG（渐变 + 山/湖/人像/城市占位），不引用任何外部 CDN；壁纸是仓库内本地资产。SVG 插画里的颜色是“照片内容”，不是 UI 颜色，因此不映射为 `--mc-*`；UI 层的颜色全部走 token（例外只有原型评审 chrome 的红色标注）。
- **字体/图标**：系统字体栈（token 的 `--mc-font-sans`），图标为内联 SVG symbol；不依赖 Font Awesome。
- **尺寸**：`mobile-*` 按 390×844 设计，`editor-*` / `desktop-tool-first` 按 1440×900 设计；移动端可点元素 ≥44px；原型内无横向溢出（截图脚本断言）。
- **内联 `<style>`**：原型页面是评审产物，页面内联样式包含注释条/红色标注等**评审 chrome**（不属于站点设计）；站点本体样式全部来自 token 值。正式实现时应进 `components.css`，页面内联保持 ≤50 行（见 DESIGN-TOKENS §6）。

---

## 6. 截图说明

- `screenshots/review/`：带顶部注释条 + 红色标注 + 844/900px 首屏折叠线，用于逐条对照审计评审。
- `screenshots/clean/`：注入 `display:none` 隐藏评审 chrome，展示设计本体（适合给用户/客户看）。
- 每个原型 4 张：review 整页 + review 首屏 + clean 整页 + clean 首屏；`index` 只有整页。
- **固定壁纸的已知渲染限制**：Chrome 整页截图（`captureBeyondViewport`）只会在第一个视口内正确绘制 `position: fixed` 的壁纸，往下是 `html` 的实底深色兜底——这一点与 `audit/design-migration/after-final/` 的历史整页证据一致。**判断设计请以 `*-390x844.png` / *-1440x900.png` 视口截图为准**（用滚动后真实视口截取，壁纸/吸顶元素位置与真机一致）。

---

## 7. 下一步实现接口

### 7.1 CSS（追加到 `assets/css/components.css`，只用 token）

| 类 | 用途 | 原型出处 |
|---|---|---|
| `.mc-appbar` | 56px 单层移动顶栏（Logo/语言/汉堡），≤768px 时替代 270px 堆叠导航 | mobile-home / mobile-tool |
| `.mc-seg` | 横向工具 segmented（移动 44px、桌面 36–40px，可横滑 + 渐隐提示） | 四个原型 |
| `.mc-toast` + `.mc-toast--success/--info/--danger/--undo` | 四态 toast（`--mc-surface-toast` 底 + 状态色图标） | editor-interactions 规格 A |
| `.mc-photo-slot` | 空照片格：`--mc-surface-0` + 2px dashed `--mc-border-brand-solid` + 44px 热区 | editor-interactions 规格 D |
| `.mc-export-progress` | 8px 进度轨道 + 品牌绿进度条 | editor-interactions 右栏 / 规格 B |
| `.mc-empty-state` | 空状态：主 CTA + 「Try sample photos」 | editor-interactions 规格 C |

### 7.2 JS（`assets/js/mecollage-main.js`，小步替换）

| 改动 | 说明 |
|---|---|
| `showToast(type, message, action?)` | 替换 12 处 `alert()`（L117 附近行号见审计 §3），文案走 i18n 键（L-23） |
| 导出状态机 | 点击后按钮 disable → 进度（可先做 indeterminate 再逐步接真实进度）→ 成功 toast（文件名 + 大小）；失败给 Retry |
| 上传后过渡 | `scrollIntoView({behavior:'smooth', block:'center'})` + 聚焦画布标题 + “N 张照片已添加” toast |
| Undo/Redo 按钮 | 复用现有 undo/redo stack；`disabled` 跟随栈状态；`title` 显示快捷键 |
| 示例照片 | 内置 3–4 张本地图片（站内资产或 data URI），点击填充编辑器/工具页 |
| `beforeunload` | `images.length > 0` 时提示（P1-3）；可选 localStorage 草稿 |

### 7.3 页面矩阵与风险

- **移动布局改动** = 首页 + 4 个工具页 × 5 语言（root + es/ja/tw/zh，共 5 组模板），必须同批完成（L-02）。
- **桌面工具页改动** = 4 个工具页 × 5 语言；建议先以 `components.css` 覆盖层实现顺序/尺寸，再逐页改 HTML（审计 §5 R0/R1 策略）。
- **SEO 文本位置调整**：只调顺序不删文本；改完跑 `node scripts/seo-audit/run-seo-checks.mjs`（0 FAIL 才进 Preview）。
- **编辑器画布**：尺寸由 JS 计算，不要给 `.canvas-container` 加 CSS `max-height`（L-20）。
- **未在原型覆盖**：移动端拖拽排序（P1-6，指针事件方案）、AI 模型懒加载/进度（P1-5）、语言菜单键盘模型（P2-5）、模糊性能（P2-9）——均为 R1+ 项，需要真机/Preview 验证，本批原型不假装已解决。
- **验证边界**：原型只做本地静态渲染验证（390/1440、无横向溢出、壁纸/token 生效）；不改站点、不进 Preview、未做真机手感与真实云网络验证。

---

## 8. 关联文档

- 审计与路线图：[INTERACTION-AUDIT.md](../INTERACTION-AUDIT.md)
- Token 规范：[DESIGN-TOKENS.md](../DESIGN-TOKENS.md)（§3 总表 / §4 使用规则）
- 组件配方：[COMPONENT-RECIPES.md](../COMPONENT-RECIPES.md)
- 页面族与内联块盘点：[PAGE-PATTERNS.md](../PAGE-PATTERNS.md)
- 决策记录：[ADR-0006](../../decisions/ADR-0006-design-token-single-source.md)
