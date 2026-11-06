# scripts/functional-audit/ — Phase F-3 真实浏览器功能测试

> 零依赖 CDP harness（Chrome headless + 原生 WebSocket）对 MeCollage 的首页编辑器和 4 个工具页做**真实浏览器功能自动化测试**。
> **不使用 Playwright / Puppeteer / npm 包**；Node 24 内置 `fetch`/`WebSocket`，Chrome 156 headless，Pillow 生成测试图。
> 关联任务：`task-13`（Phase F-3）；证据目录：`audit/evidence/phase-f/browser/`（本机 `.gitignore` 已忽略 `audit/evidence/`）。

## 1. 范围与约束

- 被测对象：当前工作区（分支 `fix/functional-integrity`）的站点文件，由**本地静态服务器模拟 Vercel 路由**后加载；
- 只读：不修改任何站点文件（`index.html` / `public/tools/*` / JS / CSS 均不改）；不提交 git、不部署；
- 不真正下载文件：拦截 `<a>.click()`，记录导出 canvas 尺寸/像素后即阻止下载；
- 不真实调用 AI 模型：通过 CDP 拦截 `cdn.jsdelivr.net`（face-api/onnxruntime）与 `esm.sh`（@imgly/background-removal），只验证失败路径与 UI 状态；
- 外部广告/统计（AdSense、GTM、DoubleClick、Google Fonts）同样被拦截，避免外部依赖干扰测试与产生外部请求。

## 2. 快速开始

环境要求：

| 依赖 | 版本/路径 | 说明 |
|---|---|---|
| Node.js | ≥ 20（验证于 v24.19.0） | 零依赖；使用内置 `fetch` / `WebSocket` / `AbortSignal.timeout` |
| Chrome | 156（验证于 Chrome/156.0.8078.80） | 默认路径：`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`；可用 `CHROME_PATH` 覆盖 |
| Python + Pillow | Python 3 / Pillow 12 | 仅用于生成测试图 `fixtures/` |

在仓库根目录执行：

```bash
# 1) 生成测试图（已存在则复用；--force 强制重建）
python3 scripts/functional-audit/make-fixtures.py

# 2) 运行全部测试（自动启动/关闭 headless Chrome、清理临时 profile、关闭本地服务器）
node scripts/functional-audit/run-tests.mjs

# 3) 查看结果
open audit/evidence/phase-f/browser/report.md
```

可选环境变量：`CHROME_PATH`（Chrome 路径）、`FA_NAV_TIMEOUT_MS`（页面导航超时，默认 30000）。
调试：`node scripts/functional-audit/run-tests.mjs --keep-open` 会保留 Chrome 进程与临时 profile（排查后需手动清理 `/tmp/mc-fa-chrome-*`）。

## 3. 文件结构

| 文件 | 作用 |
|---|---|
| `cdp.mjs` | 零依赖 CDP 客户端：启动 headless Chrome（独立 `--user-data-dir`、`--remote-debugging-port=0`，读取 `DevToolsActivePort`）→ 连接页面 WebSocket → 提供 `navigate` / `eval` / `waitFor` / `setFiles`（DOM.setFileInputFiles）/ 截图 / console·exception·dialog·failedRequest 收集 / 真实鼠标·键盘·滚轮事件 |
| `server.mjs` | 本地静态服务器，模拟 `vercel.json`：`cleanUrls`、`trailingSlash`、`/tools/* → /public/tools/*` rewrite、`/public/tools/* → 308 /tools/*`、缺失 → `404.html`（HTTP 404）、额外输出 COOP/COEP（避免 coi-serviceworker 二次 reload） |
| `instrument.mjs` | 注入到每个新 document 的 instrumentation：拦截 `canvas.toBlob/toDataURL`、`<a>.click()`、HTMLCanvasElement、`html2canvas`（记录导出容器尺寸/克隆 DOM 里的滤镜/文字/贴纸/输出 canvas 像素哈希）；提供 `__fa` DOM 测试工具（click/setRange/setSelect/drag/keydown…） |
| `make-fixtures.py` | Pillow 生成 27 张测试图：800×600 / 600×800 / 1920×1080 / 1024×1024 / 透明 PNG / JPG / 21 张多图上传用小图，并写 `fixtures/manifest.json` |
| `run-tests.mjs` | 测试编排 + 53 个用例 + 报告生成（`report.md`/`report.json`/`shots/`） |

## 4. 输出与退出码

| 路径 | 内容 |
|---|---|
| `audit/evidence/phase-f/browser/report.md` | 人类可读报告：环境、汇总、FAIL/WARN 明细、全部用例表、关键实测数据、复跑方式、限制 |
| `audit/evidence/phase-f/browser/report.json` | 机器可读：`meta`（git/Chrome/Node/服务端/拦截列表/各页面加载异常）+ `summary`（按分组）+ `limitations` + 每个用例的断言/实测值/截图路径 |
| `audit/evidence/phase-f/browser/shots/` | 43 张截图（关键步骤 + 关键断言） |
| `audit/evidence/phase-f/browser/fixtures/` | 测试图 + manifest（Pillow 生成） |

退出码：`0` = 无 FAIL（允许 WARN）；`1` = 存在 FAIL；`2` = 运行器/环境错误（定位不到 Chrome、fixtures 生成失败等）。

## 5. 测试矩阵（53 用例）

| 分组 | 用例 | 覆盖 |
|---|---|---|
| 首页编辑器（23） | IDX-01 ~ IDX-23 | 页面加载无异常；上传 1/3/5/20 张 + 第 21 张封顶与提示；删除；HTML5 拖拽排序；纵横比按钮清单（含 4:3 缺失记录）；1:1 / 16:9 / 3:4 预览比例；导出尺寸与预览一致性（3 比例）；gutter / radius 滑块（CSS 变量 + 导出像素变化）；6 种滤镜（DOM filter + 预览截图 hash + 6 个导出 hash 唯一）；文字添加/编辑/删除；贴纸；自定义网格 2×2 + 非法 1×1 校验；撤销/重做；AI 人脸居中失败路径；AI 本地抠图失败路径；导出合成（文字+贴纸+滤镜+拦截下载） |
| `/tools/square/`（7） | SQR-01 ~ SQR-07 | 加载/上传/state/canvas；四模式切换与控件；blur/solid 背景与参数是否生效（像素 hash 对比）；resize 白底 contain；crop 缩放/平移；导出 1200 四模式尺寸与内容差异；original/custom 尺寸 |
| `/tools/squarecrop/`（8） | CRP-01 ~ CRP-08 | 加载/fitScale；滑块缩放边界 10–300；滚轮方向/步长/上下边界；拖拽平移；**拖拽边界**（能否把图拖出画布）；导出 original=短边/1200；导出内容随 zoom/pan 变化；PNG 格式 + 下载拦截 |
| `/tools/roundedcorners/`（6） | RND-01 ~ RND-06 | 加载/滑块范围 0–50；radius 0/25/50 角与中心 alpha；导出 512/1024/custom 256/original；PNG 透明 + 圆角随输出尺寸等比缩放（归一化 alpha 采样）；自定义宽高 300×200；radius=50 圆形模式（横图）预览/导出 |
| `/tools/blurredframe/`（7） | BLR-01 ~ BLR-07 | 加载/默认参数；aspect ratio 是否改变 canvas/导出比例（含 4:3、16:9）；mainScale；bgScale；blurIntensity；导出 1200/custom 320；主图拖拽平移 |
| 环境/覆盖（2） | ENV-01、ENV-02 | 环境信息记录；8 项无法自动验证/需人工确认项 |

判定规则：用例内任一断言 FAIL → 用例 FAIL；仅 WARN → WARN；全 PASS → PASS。**FAIL = 自动证据证明功能不符预期；WARN = 无法自动判定/设计记录项**。

## 6. 最近一次运行结果（2026-11-05，分支 `fix/functional-integrity`）

修复前基线（HEAD `8a92d87`）：**PASS 42 / FAIL 7 / WARN 4**，退出码 1。
修复后回归（Phase F 功能修复完成）：**PASS 52 / FAIL 0 / WARN 1（共 53），退出码 0**；5 个页面加载均为 0 未捕获 JS 异常。
最终报告见 `audit/evidence/phase-f/verification/browser-regression-final.{md,json}`。

### 修复后仍为 WARN（1 个用例 / 7 项人工清单）

- AI 人脸居中、AI 本地抠图的**成功路径**（本次仅验证失败路径；模型 CDN 被拦截）；
- 真实操作系统下载产物（测试拦截 `<a>.click()`）；
- 触屏/移动端手势（仅鼠标/滚轮）；
- HTML5 拖拽真实指针体验（合成 DragEvent+DataTransfer）；
- 导出视觉观感/跨浏览器渲染（headless Chrome vs 真实浏览器）；
- HSTS/CSP 等安全头（属 `scripts/verify-site.mjs` 范围）。

### 修复后规格（测试预期已同步）

| 项 | 旧行为 | 新行为 |
|---|---|---|
| 首页比例 | 1:1/3:4/9:16 被 CSS max-height 截断 | 严格按比例；新增 4:3（6 个比例按钮） |
| 首页导出 | 裁 20px、比例错、单图空行 | 与网格同尺寸、比例正确、无空行 |
| squarecrop 缩放 | 10%–300%，100% 为 contain（露底） | **100%–300%**，100% 即 cover 1:1 裁剪；pan 有边界 |
| square resize | 白底 contain（与文案不符） | 真正拉伸铺满（与文案一致） |
| blurredframe | 输出恒正方形、比例无效、主图拉伸 | 输出保持所选比例；主图 contain；默认 mainScale=80（边框可见） |
| 导出格式 | square 选 WEBP 实为 JPEG | PNG/JPEG/WEBP 各自正确编码 |

## 7. 本地服务器如何模拟 Vercel

`server.mjs` 按仓库 `vercel.json` 的规则解析路径（只读仓库文件）：

1. `/public/tools/(.*)` → `308 /tools/$1`（重定向）；
2. `/tools/(.*)` → 映射到 `public/tools/(.*)`（rewrite，对外 URL 不变）；
3. `cleanUrls`：`*.html` 请求 → `308` 到无扩展 URL（`/about.html` → `/about/`）；`/about` → `308 /about/`；
4. `trailingSlash`：目录路由统一补尾斜杠；缺失路径 → 读 `404.html` 并返回 HTTP 404；
5. 响应附加 COOP/COEP（`same-origin` / `require-corp`）：使 `crossOriginIsolated=true`，避免 `coi-serviceworker.js` 注入后触发两次 `location.reload()` 干扰测试。

## 8. CDP harness 设计说明

- **启动**：`spawn Chrome --headless=new --remote-debugging-port=0 --user-data-dir=<临时目录>`，轮询 `<profile>/DevToolsActivePort` 取端口；`PUT /json/new?about:blank` 建页面 target；结束 `SIGTERM/SIGKILL` 并递归删除临时 profile。
- **连接**：原生 `WebSocket`，自增 id + pending Promise 匹配命令响应；事件（`Runtime.consoleAPICalled` / `Runtime.exceptionThrown` / `Log.entryAdded` / `Page.javascriptDialogOpening` / `Network.loadingFailed` / `Page.loadEventFired`）分发到收集器或等待器。
- **alert 处理**：`Page.javascriptDialogOpening` 事件里立即 `Page.handleJavaScriptDialog({accept:true})`，避免 `alert` 阻塞页面 JS 线程。
- **上传**：`DOM.getDocument` → `DOM.querySelector('#fileInput')` → `DOM.setFileInputFiles({files})`（自动触发 change）。
- **导出拦截**：`instrument.mjs` 在 document 创建前注入，包裹 `toBlob/toDataURL`（记录 canvas 尺寸、像素 FNV 哈希、归一化采样点、透明像素比例）、`<a>.click()`（阻止真实下载）、`html2canvas`（记录导出容器尺寸/克隆 DOM 内滤镜·文字·贴纸/输出 canvas 像素）；首页导出仍会执行真实的 html2canvas 渲染（cdnjs 可用），但结果 canvas 不落盘、不下载。
- **交互**：滑块/选择器用 `input/change` 事件；拖拽/滚轮用 `Input.dispatchMouseEvent` 或页面合成 MouseEvent（两者在报告中均有使用，见各用例实现）；撤销/重做用合成 KeyboardEvent（`ctrlKey+z/y`，与页面 `handleKeyDown` 判定一致）。
- **截图**：`Page.captureScreenshot`（整页视口 / 按元素 rect clip）；所有 FAIL 自动补一张 `*-FAIL.png`。

## 9. 已知限制 / 无法自动验证项（报告中 WARN + limitations）

1. AI 人脸居中的**真实检测效果**未测：仅验证模型加载失败路径（jsdelivr 被拦截），成功路径需真实网络人工验证；
2. AI 本地抠图的**真实效果/输出质量**未测：esm.sh 被拦截，仅验证失败路径与 UI 恢复；
3. 真实文件下载与产物可打开性未验证：为避免产生下载文件，只记录导出 canvas 尺寸/像素；
4. 触屏 / 移动端手势未覆盖（仅鼠标 + 滚轮）；
5. HTML5 拖拽排序用合成 `DragEvent + DataTransfer`，与真实指针拖拽可能有差异；
6. 导出视觉观感（字体/抗锯齿/跨浏览器）未验证：html2canvas 在 headless Chrome 的渲染与真实用户浏览器可能不同；
7. 安全响应头（HSTS/CSP 等）不属于本测试，由 `scripts/verify-site.mjs`（Phase A）覆盖。

## 10. 如何新增用例

在 `run-tests.mjs` 对应分组函数中追加：

```js
await runCase(page, {
  id: 'SQR-08',
  group: 'square',
  page: '/tools/square/',
  name: '用例名',
  async fn(ctx) {
    const measured = await page.eval(`({ /* 读取 state / DOM / 像素 */ })`);
    ctx.measure('measured', measured);              // 写入报告的实测值
    ctx.check('断言描述', condition, { actual: measured });       // FAIL 级
    ctx.check('需人工确认项', condition, { level: 'WARN' });      // WARN 级
    await ctx.screenshot('square-xxx');             // 保存截图到 shots/
  },
});
```

约定：`id` 用 `分组前缀-序号`；FAIL 断言必须带 `actual` 实测值；无法自动判定的用 `ctx.manual(label, note)`（同时进入报告的限制清单）；导出统一走 `toolExport(page, "<点击下载按钮的表达式>")` / `indexExport()`，不要真实触发下载。

## 13. 移动端触摸回归（`run-mobile-touch.mjs`，2026-11-06 新增）

> 目的：补「真机才能覆盖」的移动端交互自动化——触摸事件、滚动后导出、移动导航/语言抽屉、触控目标。
> 与 `run-tests.mjs` 分工：`run-tests.mjs` 是桌面 1440×1000 的功能与导出回归；本脚本是 390×844 + 触摸源的门禁。

### 13.1 快速开始

```bash
# 需 Node ≥ 20 + 本地 Chrome；fixtures 复用 make-fixtures.py 的输出
python3 scripts/functional-audit/make-fixtures.py          # 首次需要（默认输出 audit/evidence/phase-f/browser/fixtures）
node scripts/functional-audit/run-mobile-touch.mjs          # 全量 6 个用例，自动起/停本地服务器与 headless Chrome

# 对 Preview/线上地址跑（不启动本地服务器）
node scripts/functional-audit/run-mobile-touch.mjs --base https://<preview-url>/

# 报告与截图自定义位置 / 调试保留 Chrome
node scripts/functional-audit/run-mobile-touch.mjs --json /tmp/mt.json --md /tmp/mt.md --shots /tmp/mt-shots --keep-open
```

- 默认输出：`audit/design-migration/r2/mobile-touch/{report.json,report.md,screenshots/*.png}`（`audit/` 已 gitignore）；
- 退出码：`0` 无 FAIL（WARN 允许）／`1` 存在 FAIL／`2` 环境或用法错误（找不到 Chrome/fixtures 等）；
- **需要网络访问 cdnjs**（`html2canvas`，与生产一致，滚动导出用例依赖）；广告/统计/AI 大库/字体请求被拦截；
- fixtures 查找顺序：`--fixtures` 参数 → `scripts/functional-audit/fixtures` → `audit/evidence/phase-f/browser/fixtures`（含 `multi-01..04.png`）。

### 13.2 触摸模拟方式

- 视口：`Emulation.setDeviceMetricsOverride({width:390,height:844,mobile:true,deviceScaleFactor:1})`（meta viewport 生效、CSS 移动断点命中）；
- 触摸源：`Emulation.setTouchEmulationEnabled({enabled:true,maxTouchPoints:5})` + `Input.dispatchTouchEvent`（touchStart/touchMove/touchEnd）；Chrome 会把触摸合成为 `pointerdown/move/up`（pointerType=`touch`）与 `click`；
- 观测注入（`Page.addScriptToEvaluateOnNewDocument`）：patch `HTMLCanvasElement.prototype.toDataURL` 采样导出 canvas 像素（nonWhite 比例）、patch `HTMLAnchorElement.prototype.click` 记录下载动作（不产生文件）、收集页面异常与拖拽 pointer 事件序列。

### 13.3 用例矩阵（6）

| ID | 分组 | 断言口径 |
|---|---|---|
| `MT-01` | mobile-nav | 顶栏高度 ≤64px；`.mc-brand`／`.mc-menu-btn` 可见；菜单按钮 ≥44×44；默认 `.nav-left` 隐藏；`document.scrollWidth ≤ innerWidth+1`；`body.mc-collage-page` 标记 |
| `MT-02` | mobile-nav | 触摸点按菜单 → `body.mc-nav-open` + `aria-expanded=true` + 遮罩显示；展开面板链接 ≥44px 高；展开不溢出；Esc 关闭 + 焦点返回菜单按钮 |
| `MT-03` | language | 触摸打开语言抽屉；`.lang-menu` rect 完整落在视口内（top≥0 / bottom≤视口高+1 / 左右在视口内）；选项 ≥1 且每个高度 ≥44px；打开聚焦首项；Esc 关闭 + 焦点返回 |
| `MT-04` | touch | 上传 3 张 fixture → 在 `.drag-handle` 上 `touchStart` 长按 250ms（断言 `.touch-reorder-active` + opacity 0.6）→ 分步 `touchMove` 到第 3 格 → `touchEnd`；断言图片顺序变化且集合一致、pointerup 正常结束、拖拽期间页面不被滚动 |
| `MT-05` | export | 上传 2 张 → `window.scrollTo(0,600)`（断言 scrollY>0）→ 点 `#exportBtn` → 捕获 `toDataURL`：canvas ≥600×600、**nonWhite 采样比例 >1%**（防 L-36 全白回归）、按钮恢复、无异常/toast 错误 |
| `MT-06` | a11y | `#undoBtn/#redoBtn/#exportBtn/#layoutBtn/#filterBtn/#textBtn/#stickerBtn/#aiBtn` 与 `.mc-menu-btn`、`.lang-selector-toggle` 的 rect ≥44×44；编辑器态无横向溢出 |

### 13.4 判定与限制（别把合成事件当真实手势）

- `MT-04` 明确断言「pointerdown/move/up 被浏览器接受（非 pointercancel）」；若合成事件被滚动截获会在报告中以 WARN 记录原因，**不会伪装 PASS**；
- 合成触摸与真机差异：系统级滚动惯性、长按系统菜单（contextmenu）、iOS Safari 手势、误触阈值未覆盖；真机仍需人工抽查；
- `MT-05` 依赖真实 cdnjs `html2canvas`（与生产一致）；离线环境该用例 WARN 并写入 limitations；
- 报告里的断言分 PASS/FAIL/WARN 三档：FAIL → 退出码 1；WARN → 退出码 0 但需人工确认；对同一行为不要在「`run-tests.mjs` 已覆盖」的地方重复造断言（本脚本只测移动端差异项）。

### 13.5 本轮发现的产品问题与门禁盲区（L-38 正式编号）

> **核心教训（L-38）**：**交互后才出现 / 打开态才可见的控件，必须在交互后断言**。`check-layout.mjs` 是静态首屏扫描，测不到「上传后才显示的工具栏按钮」和「点按后才存在的导航面板」——这两个问题都是本脚本在交互后状态断言才发现。完整条目：`docs/lessons/L-20261106-38-interaction-state-gate-gap.md`。

1. **MT-06 触控目标（已修复）**：390×844 下底部工具栏 8 个按钮实测宽 **14–24px**（高 48px；undo/redo 19、text 14、其余 24）。根因：5 个首页内联 `.bottom-toolbar{max-width:300px;gap:1rem;padding:1rem}` + `.toolbar-btn{width:3rem}`，R0 新增 `#undoBtn/#redoBtn` 后 8 个按钮在 300px 内被 flex-shrink。修复（components.css 移动端覆盖）：`.bottom-toolbar{max-width:none;width:100%;overflow-x:auto;内部滚动}` + `.toolbar-btn{flex:0 0 auto;width/min-width/height:44px}`。修复后 MT-06 PASS（8×44×44、document.scrollWidth=390）。
   - 之前被 `check-layout.mjs` C 项（触控目标默认 WARN 级 + 只在未上传首屏量）双重掩盖；建议之后跑 `--strict-touch` 复核。
2. **MT-02 移动导航展开面板（已修复）**：点按 ☰ 后 `body.mc-nav-open=true`、`aria-expanded=true`、遮罩显示，但面板 `getBoundingClientRect()` = **y=4524 / 视口 844**（页面高 4753）——面板渲染在整页最底部，用户首屏完全看不到菜单。根因：bundle 的 `@media(max-width:768px){.ghibli-nav{position:static}}` 覆盖 sticky，展开面板 `.nav-left{position:absolute;top:100%}` 的 offsetParent 变成 `.app-container`（高度=整页）→ `top:100%` = 页面底部；桌面 sticky 所以未暴露。修复（components.css 移动端）：`body .ghibli-nav { position: relative; }` → 面板 y=60（顶栏下方）、链接在视口内。
   - 证据截图：`audit/design-migration/r2/mobile-touch/screenshots/07-nav-panel-offscreen-before-fix.png`（修复前：点开菜单看不到面板）、`08-nav-panel-fixed-probe.png`（页内注入候选修复后）。
3. 这两个问题说明 R2 的移动交互门禁应继续保留「打开态/上传后」断言，而不是只在首屏量 rect。

## 12. 维护记录

## 11. 与 Phase A 验收脚本的关系

- `scripts/verify-site.mjs`：部署验收（HTTP/响应头/重定向/404/资产等**网络层**检查），生产/Preview 通用；
- `scripts/functional-audit/`：真实浏览器**功能层**检查（交互、canvas、导出、状态），使用本地静态服务器，不依赖线上部署；
- 两者互补：Phase F 发现的 canvas/交互缺陷无法被 verify-site 发现；Phase A 的 404/安全头问题也不在本测试范围。

## 12. 维护记录

- **2026-11-05 v1.0.0**：首版。CDP harness + 本地 Vercel 模拟服务器 + Pillow fixtures + 53 用例矩阵 + report.md/json + shots；基线 PASS 42 / FAIL 7 / WARN 4。
- **2026-11-05 v1.1.0**：Phase F 修复后回归。新增/升级断言（resize=拉伸铺满与独立绘制一致、squarecrop 拖拽受边界约束、blurredframe 保持所选比例、首页 4:3 按钮）；规格同步（squarecrop 缩放下限 100%、blurredframe 默认 mainScale=80）；结果 PASS 52 / FAIL 0 / WARN 1。
- **2026-11-06 v1.2.0**：新增 `run-mobile-touch.mjs`（R2-A，390×844 CDP 触摸模拟；6 用例：移动导航结构/行为、语言抽屉、触控拖拽排序、滚动后导出、触控目标）。**首次实跑发现 2 个静态门禁漏测的产品缺陷**（MT-02 导航面板 off-screen、MT-06 底栏触控目标 14–24px，见 §13.5 / L-38）；Lead 修复 components.css 后连续两次复跑 **PASS 6 / FAIL 0 / WARN 0**。正式教训：L-38（交互态门禁缺口）；R2-B 博客搜索的 `[hidden]` 被 author CSS 覆盖问题记为 L-39。
