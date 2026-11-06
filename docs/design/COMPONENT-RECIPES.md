# MeCollage 组件配方（v1.0）

> 配套：[DESIGN-TOKENS.md](DESIGN-TOKENS.md)（token 规范与总表）· [`assets/css/design-tokens.css`](../../assets/css/design-tokens.css)（唯一事实源）
> 用途：新页面/新功能**直接复用**下列配方，不要再从旧页面复制内联样式。
> 状态：v1.1（2026-11-06）。token/统一层已接入 94 页；R0（toast/撤销/导出反馈/AI 懒加载/触控拖拽）与 R1（移动端工具优先布局/紧凑导航）配方已加入 §16–§19。

## 使用方式

1. 复制配方里的 HTML 结构 + CSS（放页面内联 `<style>` 或未来的 `assets/css/components.css`）。
2. **不要改类名语义**（`.btn`、`.page-container` 等已在 bundle 里存在，改名会脱离既有样式）。
3. 所有值必须来自 `var(--mc-*)`；配方里出现的数字只允许出现在 `calc()`/断点/百分比中。
4. 移动端沿用"桌面值 + `@media (max-width: 768px)` 覆盖"，不要重写成 mobile-first。
5. 新增配方前先跑 `node scripts/design-audit/run-token-audit.mjs`，确认没有 token 外值。

---

## 0. 壁纸层（每页必须有，固定背景）

```html
<body>
  <div class="ghibli-background" aria-hidden="true"></div>
  <!-- 页面内容 -->
</body>
```

```css
/* 由 assets/css/components.css 统一提供；这里只是规则说明 */
html { background-color: var(--mc-solid-bg); }          /* 壁纸加载前/首屏以下的兜底 */
body .ghibli-background {
  position: fixed;
  inset: 0;
  z-index: var(--mc-z-background);
  overflow: hidden;
  background-image: url(/wallImage.webp);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
body .ghibli-background::after {                        /* 压暗层：保证亮云上的文字可读 */
  content: "";
  position: absolute;
  inset: 0;
  background: var(--mc-surface-scrim);
  pointer-events: none;
}
```

要点：壁纸必须固定在视口（不是 `background-attachment` 的普通背景），滚动时不能移动/消失；内容放在玻璃层上，不要给 body/html 设不透明背景；`404.html` 是唯一例外（独立实底主题）。

---

## 1. 内容页骨架（about/blog/政策页/专题页通用）

```html
<div class="page-content">
  <section class="page-container">
    <header class="page-header">
      <h1 class="page-title">页面标题</h1>
      <p class="page-subtitle">一句话副标题</p>
    </header>
    <!-- 内容区块 -->
  </section>
</div>
```

```css
.page-content {
  max-width: var(--mc-container-content);
  margin: 0 auto;
  padding: var(--mc-space-page-x);
  min-height: calc(100vh - 200px);
}

.page-container {
  background: var(--mc-panel-bg);
  backdrop-filter: blur(var(--mc-glass-backdrop));
  border: var(--mc-panel-border);
  border-radius: var(--mc-panel-radius);
  box-shadow: var(--mc-panel-shadow);
  padding: var(--mc-panel-padding);
  color: var(--mc-text-body);
}

.page-header { text-align: center; margin-bottom: var(--mc-space-section); }

.page-title {
  font-size: var(--mc-font-size-h1);
  font-weight: var(--mc-font-weight-bold);
  line-height: var(--mc-leading-tight);
  color: var(--mc-text-heading);
  text-shadow: var(--mc-text-shadow-display);
  margin-bottom: var(--mc-space-stack);
}

.page-subtitle {
  display: inline-block;
  font-size: var(--mc-font-size-h4);
  color: var(--mc-text-heading);
  background: var(--mc-surface-1);
  border-radius: var(--mc-radius-xl);
  padding: 0.6rem 1.8rem;          /* 存量值：0.6/1.8rem 非 4px 网格，迁移时取 space-3/space-8 */
  backdrop-filter: blur(var(--mc-blur-md));
  text-shadow: var(--mc-text-shadow-heading);
  margin-bottom: var(--mc-space-section);
}

@media (max-width: 768px) {
  .page-content { padding: var(--mc-space-page-x-compact); }
  .page-container { padding: var(--mc-space-panel-compact); }
  .page-title { font-size: var(--mc-font-size-h1-compact); }
  .page-subtitle { font-size: var(--mc-font-size-body); }
}
```

要点：`.page-title` 是 h1，`.page-subtitle` 是 p（历史语义，见 DESIGN-TOKENS §10 命名不一致）；不要新增第二个 h1。

---

## 2. 玻璃卡片（feature / blog / FAQ 容器通用）

```css
.mc-card {
  background: var(--mc-card-bg);
  border: var(--mc-card-border);
  border-radius: var(--mc-card-radius);
  box-shadow: var(--mc-card-shadow);
  padding: var(--mc-card-padding);
  color: var(--mc-text-body);
  backdrop-filter: blur(var(--mc-blur-lg));
  transition: transform var(--mc-duration-slow) var(--mc-ease),
              box-shadow var(--mc-duration-slow) var(--mc-ease),
              background-color var(--mc-duration-slow) var(--mc-ease);
}

.mc-card:hover {
  transform: translateY(var(--mc-lift-5));
  box-shadow: var(--mc-card-shadow-hover);
}

.mc-card__title {
  font-size: var(--mc-font-size-card-title);
  font-weight: var(--mc-font-weight-semibold);
  color: var(--mc-text-heading);
  text-shadow: var(--mc-text-shadow-heading);
  margin-bottom: var(--mc-space-stack);
}

.mc-card__desc {
  font-size: var(--mc-font-size-body-sm);
  line-height: var(--mc-leading-normal);
  color: var(--mc-text-tertiary);
}
```

图标底/圆形图标：

```css
.mc-card__icon {
  display: grid;
  place-items: center;
  width: 3.5rem; height: 3.5rem;
  border-radius: var(--mc-radius-circle);
  background: var(--mc-color-brand-tint);
  color: var(--mc-color-brand);
  font-size: var(--mc-font-size-h3-lg);
  margin: 0 auto var(--mc-space-stack);
}
```

hover 上浮幅度：列表卡 `--mc-lift-2`，大卡 `--mc-lift-5`；不要用 `translateX`（会导致横向滚动）。

---

## 3. 顶部导航（全站统一）

```html
<nav class="ghibli-nav">
  <div class="nav-left">
    <a class="nav-link" href="/">Home</a>
    <a class="nav-link active" href="/blog/" aria-current="page">Blog</a>
    <a class="nav-link" href="/about/">About</a>
  </div>
  <div class="nav-right">
    <a class="nav-link github-link" href="https://github.com/oogwaaay/mecollage"><i class="fab fa-github"></i> GitHub</a>
    <!-- 语言选择器结构见 §15 -->
  </div>
</nav>
```

```css
.ghibli-nav {
  position: sticky;
  top: 0;
  z-index: var(--mc-z-nav);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--mc-space-4) var(--mc-space-8);
  background: transparent;
}

.nav-left { display: flex; gap: var(--mc-space-8); }
.nav-right { display: flex; align-items: center; gap: var(--mc-space-4); margin-left: auto; }

.nav-link {
  color: var(--mc-text-primary);
  font-size: var(--mc-font-size-body-sm);
  font-weight: var(--mc-font-weight-semibold);
  text-decoration: none;
  padding: var(--mc-space-2) var(--mc-space-5);
  border-radius: var(--mc-radius-pill);
  background: var(--mc-surface-2);
  backdrop-filter: blur(var(--mc-blur-xs));
  text-shadow: var(--mc-text-shadow-heading);
  transition: background-color var(--mc-duration-base) var(--mc-ease),
              transform var(--mc-duration-base) var(--mc-ease);
}

.nav-link:hover { background: var(--mc-surface-4); transform: translateY(var(--mc-lift-1)); }
.nav-link.active { background: var(--mc-color-brand-tint-strong); }
```

要点：导航**没有**滚动变色逻辑（已核实），不要自行加 JS；移动端沿用现有语言菜单按钮 + 汉堡按钮结构。

---

## 4. 工具页导航（4 个工具 × 5 语言）

```html
<nav class="tool-nav">
  <div class="tool-nav-container">
    <a class="tool-nav-link" href="/tools/square/"><i class="fas fa-square"></i> Square Image</a>
    <a class="tool-nav-link active" href="/tools/squarecrop/"><i class="fas fa-crop-square"></i> Square Crop</a>
    <a class="tool-nav-link" href="/tools/roundedcorners/"><i class="fas fa-border-radius"></i> Rounded Corners</a>
    <a class="tool-nav-link" href="/tools/blurredframe/"><i class="fas fa-image"></i> Blurred Frame</a>
  </div>
</nav>
```

```css
.tool-nav {
  background: var(--mc-surface-2);
  backdrop-filter: blur(var(--mc-glass-backdrop));
  border: var(--mc-border-width) solid var(--mc-border);
  border-radius: var(--mc-radius-panel);
  box-shadow: var(--mc-shadow-e4);
  padding: var(--mc-space-4);
  margin-bottom: var(--mc-space-section);
}

.tool-nav-container { display: flex; justify-content: center; gap: var(--mc-space-4); flex-wrap: wrap; }

.tool-nav-link {
  padding: var(--mc-space-3) var(--mc-space-6);
  border: 1px solid var(--mc-border-subtle);
  border-radius: var(--mc-radius-xl);
  background: var(--mc-surface-0);
  color: var(--mc-text-body);
  font-weight: var(--mc-font-weight-medium);
  text-decoration: none;
  transition: background-color var(--mc-duration-slow) var(--mc-ease),
              color var(--mc-duration-slow) var(--mc-ease),
              transform var(--mc-duration-slow) var(--mc-ease);
}

.tool-nav-link:hover { background: var(--mc-color-brand-tint); border-color: var(--mc-border-brand); color: var(--mc-text-heading); transform: translateY(var(--mc-lift-2)); }
.tool-nav-link.active { background: var(--mc-color-brand-tint-strong); border-color: var(--mc-border-brand-strong); color: var(--mc-text-heading); }

@media (max-width: 992px) {  /* 工具页实际主断点 992px，见 DESIGN-TOKENS §4.6 */
  .tool-nav-container { flex-direction: column; align-items: center; }
  .tool-nav-link { width: 100%; max-width: 200px; text-align: center; }
}
```

5 个工具容器类名不一致（`square-tool-container`/`squarecrop-tool-container`/…）——新工具页统一用 `mc-tool-container`，并同步在 5 语言副本。

---

## 5. 按钮体系

| 类型 | 类名 | 用途 | 视觉 |
|---|---|---|---|
| 主操作 | `.btn.btn-primary` | 生成/导出/提交 | 蓝色渐变 |
| 成功 | `.btn.btn-success` | 下载/确认 | 绿色渐变 |
| 次要 | `.btn-secondary` | 取消/重置 | 深色玻璃 + 描边 |
| 图标按钮 | `.canvas-expand-btn` 等 | 画布工具条 | 胶囊玻璃 |
| 上传 CTA | `.upload-cta` | 上传区主按钮 | 半透明绿渐变 |
| 文本链接按钮 | `.blog-read-more` 等 | 卡片内跳转 | 品牌绿 + 箭头动效 |

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--mc-space-2);
  padding: var(--mc-space-3) var(--mc-space-6);
  border: none;
  border-radius: var(--mc-button-radius);
  font-size: var(--mc-font-size-body);
  font-weight: var(--mc-button-font-weight);
  color: var(--mc-text-primary);
  text-shadow: var(--mc-text-shadow-body);
  box-shadow: var(--mc-button-shadow);
  cursor: pointer;
  transition: transform var(--mc-duration-base) var(--mc-ease),
              box-shadow var(--mc-duration-base) var(--mc-ease),
              opacity var(--mc-duration-base) var(--mc-ease);
}

.btn-primary { background: var(--mc-button-primary-bg); }
.btn-primary:hover { background: var(--mc-button-primary-bg-hover); transform: translateY(var(--mc-lift-2)); box-shadow: var(--mc-shadow-e5); }
.btn-success { background: var(--mc-button-success-bg); }
.btn-success:hover { background: var(--mc-button-success-bg-hover); transform: translateY(var(--mc-lift-2)); box-shadow: var(--mc-shadow-e5); }
.btn-secondary {
  background: var(--mc-button-secondary-bg);
  border: var(--mc-button-secondary-border);
  color: var(--mc-text-body);
}
.btn-secondary:hover { background: var(--mc-surface-hover); transform: translateY(var(--mc-lift-2)); }
.btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }

/* 上传 CTA：绿色半透明渐变 + 深色文字 */
.upload-cta {
  padding: var(--mc-space-3) var(--mc-space-5);
  border-radius: var(--mc-radius-lg);
  border: 1px solid var(--mc-border-brand-strong);
  background: var(--mc-gradient-brand);
  color: var(--mc-text-on-brand-strong);
  font-weight: var(--mc-font-weight-semibold);
  box-shadow: var(--mc-shadow-brand);
  transition: transform var(--mc-duration-medium) var(--mc-ease), box-shadow var(--mc-duration-medium) var(--mc-ease);
}
.upload-cta:hover { transform: translateY(var(--mc-lift-1)); box-shadow: var(--mc-shadow-brand-strong); }
```

要点：蓝色=主操作、绿色=品牌/成功是**历史既定语义**（旧 `--primary-color` 是蓝色，标题绿是品牌色），不要互换；按钮不要用 `transition: all`。

---

## 6. 表单控件（搜索框 / 下拉 / 滑块 / 色板）

```css
.mc-input {
  width: 100%;
  padding: var(--mc-space-3) var(--mc-space-4);
  border: var(--mc-input-border);
  border-radius: var(--mc-input-radius);
  background: var(--mc-input-bg);
  box-shadow: var(--mc-input-shadow);
  color: var(--mc-text-primary);
  font-size: var(--mc-font-size-body);
  backdrop-filter: blur(var(--mc-blur-lg));
  transition: border-color var(--mc-duration-slow) var(--mc-ease),
              box-shadow var(--mc-duration-slow) var(--mc-ease);
}
.mc-input::placeholder { color: var(--mc-text-faint); }
.mc-input:focus-visible {
  outline: none;
  border-color: var(--mc-input-focus-border);
  box-shadow: var(--mc-input-focus-shadow);
}

.mc-select {
  appearance: none;
  padding: var(--mc-space-3) var(--mc-space-4);
  border: var(--mc-input-border);
  border-radius: var(--mc-input-radius);
  background: var(--mc-input-bg);
  color: var(--mc-text-primary);
  font-size: var(--mc-font-size-body-sm);
}
.mc-select option { background: var(--mc-ink-950); color: var(--mc-text-primary); }

.mc-range { width: 100%; accent-color: var(--mc-color-brand); }  /* 自定义 thumb 用 --mc-color-brand + --mc-shadow-e1 */

.mc-swatch {
  width: 1.5rem; height: 1.5rem;
  border-radius: var(--mc-radius-circle);
  border: 2px solid var(--mc-border-input);
  cursor: pointer;
}
.mc-swatch[aria-pressed="true"] { border-color: var(--mc-border-brand-strong); box-shadow: 0 0 0 3px var(--mc-color-brand-wash); }
```

要点：聚焦态必须可见（`focus-visible` + 品牌色 ring）；禁止 `outline: none` 而不给替代样式；tool 页旧控件用 px（12/14/20），迁移时按 `--mc-space-*` 取最近值。

---

## 7. 上传 dropzone（编辑器 / 工具页）

```html
<button type="button" class="upload-area" aria-label="Upload photos">
  <div class="upload-icon"><i class="fas fa-cloud-upload-alt"></i></div>
  <p class="upload-text">点击或拖拽照片到这里</p>
  <p class="upload-hint">JPG / PNG / WEBP，最多 20 张</p>
</button>
```

```css
.upload-area {
  width: 100%;
  padding: var(--mc-space-10) var(--mc-space-5);
  border: var(--mc-border-width-strong) dashed var(--mc-border-brand-solid);
  border-radius: var(--mc-radius-xl);
  background: var(--mc-surface-0);
  box-shadow: var(--mc-shadow-e2);
  backdrop-filter: blur(var(--mc-blur-md));
  text-align: center;
  cursor: pointer;
  transition: background-color var(--mc-duration-slow) var(--mc-ease),
              border-color var(--mc-duration-slow) var(--mc-ease),
              transform var(--mc-duration-slow) var(--mc-ease);
}
.upload-area:hover { border-color: var(--mc-border-brand-strong); background: var(--mc-color-brand-wash); transform: translateY(var(--mc-lift-2)); }
.upload-area.drag-over { border-color: var(--mc-border-success-strong); background: var(--mc-color-brand-haze); transform: scale(var(--mc-press-scale)); box-shadow: var(--mc-shadow-brand-strong); }

.upload-icon {
  width: 4rem; height: 4rem; margin: 0 auto var(--mc-space-4);
  display: grid; place-items: center;
  border-radius: var(--mc-radius-circle);
  background: var(--mc-color-brand);
  color: var(--mc-text-on-brand-soft);
  font-size: var(--mc-font-size-h3-lg);
}
.upload-text { font-size: var(--mc-font-size-lg); font-weight: var(--mc-font-weight-medium); margin-bottom: var(--mc-space-2); }
.upload-hint { font-size: var(--mc-font-size-label-sm); color: var(--mc-text-muted); }
```

要点：dropzone 必须可用键盘操作（原生 `<button>` 或 `role="button"` + Enter/Space）；拖拽后要移除 `drag-over` 类（现有实现用 dragover/dragleave 计数，见 `mecollage-main.js`）。

---

## 8. 编辑器三栏 + 画布浅色叠加控件

```css
.main-content {
  display: grid;
  grid-template-columns: var(--mc-sidebar-width) minmax(0, 1fr) 280px;
  grid-template-areas: "sidebar canvas image";
  gap: var(--mc-editor-grid-gap);
  max-width: var(--mc-container-app);
  margin: 0 auto;
  width: 100%;
  padding: var(--mc-space-6) var(--mc-space-4);
}

.sidebar {
  background: var(--mc-card-bg);
  border: var(--mc-border-width) solid var(--mc-border);
  border-radius: var(--mc-radius-sidebar);
  box-shadow: var(--mc-shadow-e3);
  backdrop-filter: blur(var(--mc-glass-backdrop));
  padding: var(--mc-space-6);
  max-height: calc(100vh - 280px);
  overflow-y: auto;
}

.canvas-area {
  grid-area: canvas;
  display: flex; align-items: center; justify-content: center;
  background: var(--mc-surface-3);
  backdrop-filter: blur(var(--mc-glass-backdrop));
  border: var(--mc-border-width) solid var(--mc-border);
  border-radius: var(--mc-radius-panel);
  box-shadow: var(--mc-shadow-e4);
  padding: var(--mc-space-6);
}

/* 叠加在照片上的浅色控件（不要用玻璃 token） */
.mc-photo-btn {
  position: absolute; top: var(--mc-space-1); right: var(--mc-space-1);
  width: 1.5rem; height: 1.5rem;
  display: grid; place-items: center;
  border: none; border-radius: var(--mc-radius-circle);
  background: var(--mc-overlay-control-bg);
  color: var(--mc-overlay-control-danger);
  box-shadow: var(--mc-shadow-overlay-1);
  cursor: pointer;
}
.mc-photo-btn:hover { box-shadow: var(--mc-shadow-overlay-2); transform: scale(var(--mc-hover-scale)); }
```

要点：三栏在 1280px 断点变两栏、1024px 再收敛——新代码沿用现有断点（见 DESIGN-TOKENS §4.6）；画布尺寸由 JS 计算（`innerWidth/innerHeight`），CSS 的 max-height 会静默覆盖 JS 尺寸（L-20），不要给 `.canvas-container` 加限制。

---

## 9. 全局 Toast

```css
.toast {
  position: fixed;
  bottom: var(--mc-space-5);
  left: 50%;
  transform: translate(-50%) translateY(var(--mc-space-5));
  z-index: var(--mc-z-toast);
  padding: 10px 14px;                 /* 存量值：迁移时取 space-3/4 */
  border-radius: var(--mc-radius-sm);
  background: var(--mc-surface-toast);
  color: var(--mc-text-primary);
  font-size: var(--mc-font-size-label-sm);
  line-height: var(--mc-leading-tight);
  box-shadow: var(--mc-shadow-toast);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--mc-duration-fast) var(--mc-ease), transform var(--mc-duration-fast) var(--mc-ease);
}
.toast.is-visible { opacity: 1; transform: translate(-50%) translateY(0); }
```

要点：toast 只有一种深色样式；**没有** error/成功变体（见 DESIGN-TOKENS §10）。需要时先提案新 token，不要临时改背景色。

---

## 10. Footer（无 class，历史实现）

```css
footer {
  text-align: center;
  padding: var(--mc-space-8);
  margin-top: var(--mc-space-10);
  background: var(--mc-surface-2);
  border-top: 1px solid var(--mc-border);
  color: var(--mc-text-muted);
  font-size: var(--mc-font-size-label);
}
footer a { color: var(--mc-text-link); text-decoration: none; transition: color var(--mc-duration-slow) var(--mc-ease); }
footer a:hover { color: var(--mc-text-link-hover); }
```

要点：现有 54 页 footer 内联写 `color:#8fd68f`（387 次 `color:#8fd68f` 的主要来源）；迁移时去掉内联、用上面的规则。Footer 在 5 语言里文案由 i18n 运行时填充，结构保持一致。

---

## 11. FAQ 手风琴

```html
<section class="faq-section">
  <h2 class="faq-title">Frequently Asked Questions</h2>
  <div class="faq-list">
    <div class="faq-item">
      <button type="button" class="faq-question" aria-expanded="false">
        <span>问题文本</span><i class="fas fa-chevron-down faq-icon" aria-hidden="true"></i>
      </button>
      <div class="faq-answer" hidden>答案文本</div>
    </div>
  </div>
</section>
```

```css
.faq-section {
  background: var(--mc-card-bg);
  border: var(--mc-border-width) solid var(--mc-border);
  border-radius: var(--mc-card-radius);
  box-shadow: var(--mc-card-shadow);
  backdrop-filter: blur(var(--mc-blur-lg));
  padding: var(--mc-space-8);
}
.faq-title { font-size: var(--mc-font-size-h2); font-weight: var(--mc-font-weight-semibold); color: var(--mc-text-heading); text-shadow: var(--mc-text-shadow-heading); text-align: center; margin-bottom: var(--mc-space-8); }
.faq-list { display: flex; flex-direction: column; gap: var(--mc-space-6); }
.faq-item { background: var(--mc-surface-2); border: var(--mc-border-width) solid var(--mc-border); border-radius: var(--mc-radius-item); padding: var(--mc-space-6); transition: border-color var(--mc-duration-slow) var(--mc-ease), box-shadow var(--mc-duration-slow) var(--mc-ease); }
.faq-item:hover { border-color: var(--mc-border-brand-strong); box-shadow: var(--mc-shadow-e5); }
.faq-question { display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 0; border: none; background: transparent; color: var(--mc-text-emphasis); font-size: var(--mc-font-size-lead); font-weight: var(--mc-font-weight-semibold); text-align: left; cursor: pointer; }
.faq-answer { margin-top: var(--mc-space-3); color: var(--mc-text-secondary); line-height: var(--mc-leading-relaxed); }
```

要点：FAQ 必须真实问答（内容侧 L-21/L-27），`aria-expanded` 与 `hidden` 同步；移动端字号降一档（`--mc-font-size-body`）。

---

## 12. 博客正文排版

```css
.blog-post-body {
  font-size: var(--mc-font-size-lead);
  line-height: var(--mc-leading-relaxed);
  color: var(--mc-text-body);
}
.blog-post-body h2 { font-size: var(--mc-font-size-h2); font-weight: var(--mc-font-weight-semibold); color: var(--mc-text-heading); margin: var(--mc-space-8) 0 var(--mc-space-4); }
.blog-post-body h3 { font-size: var(--mc-font-size-h3); font-weight: var(--mc-font-weight-semibold); color: var(--mc-text-emphasis); margin: var(--mc-space-6) 0 var(--mc-space-3); }
.blog-post-body p { margin-bottom: var(--mc-space-4); }
.blog-post-body a { color: var(--mc-text-link); text-decoration: none; }
.blog-post-body a:hover { color: var(--mc-text-link-hover); text-decoration: underline; }
.blog-post-body ul, .blog-post-body ol { margin-bottom: var(--mc-space-4); padding-left: var(--mc-space-8); }
.blog-post-body li { margin-bottom: var(--mc-space-2); }
```

要点：博客正文行高 1.8 是全站唯一长文场景；`blog-post-body h2/h3` 不要复用 `.page-title`。

---

## 13. 404 实底深色页（独立主题）

```css
body.mc-solid {
  background: var(--mc-solid-bg);
  color: var(--mc-solid-text);
  font-family: var(--mc-font-sans);
  line-height: var(--mc-leading-normal);
}
.mc-solid .brand { color: var(--mc-text-link); font-weight: var(--mc-font-weight-bold); letter-spacing: var(--mc-tracking-wide); }
.mc-solid .code { color: var(--mc-text-link); font-size: 4.5rem; font-weight: 800; letter-spacing: -0.04em; }  /* 4.5rem 未 token 化，见 §10 */
.mc-solid .links a {
  padding: 10px 16px;                 /* 迁移取 space-3/4 */
  border: 1px solid var(--mc-border-brand);
  border-radius: var(--mc-radius-tag);
  background: var(--mc-color-brand-wash);
  color: var(--mc-solid-text);
  text-decoration: none;
}
.mc-solid .links a.primary { background: var(--mc-color-brand); border-color: var(--mc-border-brand-solid); color: var(--mc-text-on-brand-strong); font-weight: var(--mc-font-weight-semibold); }
.mc-solid .hint { color: var(--mc-solid-text-faint); font-size: var(--mc-font-size-label); }
```

要点：404 页不加载壁纸/玻璃，不要引用 `.ghibli-background`；它有自己的 `:root{color-scheme:dark}`，迁移时合并到 token。

---

## 14. 专题页 hero + 主题色覆盖

生日/婚礼/圣诞等专题页现在各自硬编码强调色；后续统一为页面级覆盖：

```css
/* 页面级覆盖（放在该页 <style> 第一段） */
:root { --mc-color-theme-accent: #e91e63; }   /* 婚礼粉；具体值进 token 提案后再引用 */

.mc-topic-hero {
  text-align: center;
  background: var(--mc-panel-bg);
  border: var(--mc-border-width) solid var(--mc-border);
  border-radius: var(--mc-radius-panel);
  box-shadow: var(--mc-panel-shadow);
  backdrop-filter: blur(var(--mc-glass-backdrop));
  padding: var(--mc-space-16) var(--mc-space-8);
  margin-bottom: var(--mc-space-section);
}
.mc-topic-hero h1 {
  font-size: var(--mc-font-size-display);
  font-weight: var(--mc-font-weight-bold);
  color: var(--mc-color-theme-accent);
  text-shadow: var(--mc-text-shadow-display);
  margin-bottom: var(--mc-space-stack);
}
.mc-topic-hero .feature i { color: var(--mc-color-theme-accent); font-size: var(--mc-font-size-icon); }
```

要点：**不要**在专题页里直接写 `#d81b60` 之类的主题色；先在 token 提案里加"专题主题色"组，再通过 `--mc-color-theme-accent` 覆盖。5 语言副本必须同步（L-02）。

---

## 15. 语言选择器（含 i18n.css 冲突警告）

```html
<div class="lang-selector">
  <button type="button" class="lang-selector-toggle" aria-haspopup="true" aria-expanded="false">
    <i class="fas fa-globe" aria-hidden="true"></i> English
  </button>
  <div class="lang-menu" role="menu">
    <a class="lang-option" href="/zh/" hreflang="zh-CN" role="menuitem">简体中文</a>
    <a class="lang-option" href="/tw/" hreflang="zh-TW" role="menuitem">繁體中文</a>
    <a class="lang-option" href="/ja/" hreflang="ja" role="menuitem">日本語</a>
    <a class="lang-option" href="/es/" hreflang="es" role="menuitem">Español</a>
  </div>
</div>
```

```css
.lang-selector { position: relative; display: inline-flex; }
.lang-selector-toggle {
  display: inline-flex; align-items: center; gap: var(--mc-space-1);
  padding: var(--mc-space-2) var(--mc-space-3);
  border: 1px solid var(--mc-border);
  border-radius: var(--mc-radius-pill);
  background: var(--mc-surface-3);
  color: var(--mc-text-primary);
  font-size: var(--mc-font-size-caption);
  letter-spacing: var(--mc-tracking-wider);
  cursor: pointer;
  transition: background-color var(--mc-duration-base) var(--mc-ease);
}
.lang-selector-toggle:hover, .lang-selector-toggle:focus-visible,
.lang-selector.is-open .lang-selector-toggle {
  background: var(--mc-color-brand-tint);
  border-color: var(--mc-border-brand-strong);
  color: var(--mc-text-on-brand);
  outline: none;
}
.lang-menu {
  position: absolute; top: 110%; right: 0;
  z-index: var(--mc-z-dropdown);
  display: none; flex-direction: column; gap: var(--mc-space-1);
  min-width: 160px;
  padding: var(--mc-space-1);
  border: 1px solid var(--mc-border-input);
  border-radius: var(--mc-radius-lg);
  background: var(--mc-surface-toast);
  backdrop-filter: blur(var(--mc-blur-lg));
  box-shadow: var(--mc-shadow-e5);
}
.lang-selector.is-open .lang-menu { display: flex; }
.lang-option { padding: var(--mc-space-2) var(--mc-space-3); border-radius: var(--mc-radius-tag); color: var(--mc-text-body); font-size: var(--mc-font-size-caption); text-align: left; text-decoration: none; }
.lang-option:hover { background: var(--mc-color-brand-tint); color: var(--mc-text-on-brand); }
.lang-option.is-active { background: var(--mc-color-brand-tint-strong); color: var(--mc-text-on-brand); font-weight: var(--mc-font-weight-semibold); }
```

> ⚠️ 已知冲突（DESIGN-TOKENS §8.4）：`assets/css/i18n.css` 有同名 `.lang-selector*` 旧样式（#333/4px/14px，最后加载，疑似覆盖上面这套 pill），且 5 语言菜单的 aria/键盘行为由 `assets/js/i18n.js` 控制。**迁移前先做浏览器渲染对比**；新页面不要再引用 i18n.css。语言切换必须使用真实 `<a href>`（L-09/L-24），不能用 JS 改 URL。

---

## 16. Toast（全局反馈，R0）

```js
window.mcUI.toast('已添加 3 张照片', { type: 'success' });
window.mcUI.toast('导出失败，请重试', { type: 'error', actionLabel: '重试', onAction: retry });
window.mcUI.toast('已删除 1 张照片', { type: 'undo', actionLabel: '撤销', onAction: undo });
```

```css
#mc-toast-stack {
  position: fixed; left: 50%;
  bottom: calc(var(--mc-space-6) + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  z-index: var(--mc-z-toast);
  display: flex; flex-direction: column; align-items: center; gap: var(--mc-space-2);
  width: var(--mc-toast-max-width);
  pointer-events: none;
}
.mc-toast {
  pointer-events: auto; display: flex; align-items: center; gap: var(--mc-space-3);
  width: 100%; padding: var(--mc-space-3) var(--mc-space-4);
  border: var(--mc-border-width) solid var(--mc-border);
  border-left: 3px solid var(--mc-border-strong);
  border-radius: var(--mc-toast-radius);
  background: var(--mc-surface-toast);
  color: var(--mc-text-primary);
  box-shadow: var(--mc-shadow-e5);
  backdrop-filter: blur(var(--mc-blur-lg));
  font-size: var(--mc-font-size-label);
  animation: mc-toast-in var(--mc-duration-base) var(--mc-ease);
}
.mc-toast--success { border-left-color: var(--mc-color-success); }
.mc-toast--error { border-left-color: var(--mc-color-danger); }
.mc-toast--info { border-left-color: var(--mc-color-info); }
.mc-toast--undo { border-left-color: var(--mc-color-brand); }
```

规则：禁止 `alert()`；同屏最多 3 条；`role="status" aria-live="polite"`；操作/关闭按钮 ≥44px；文案全部走 i18n。

---

## 17. 移动端顶栏（R0，≤768px）

结构由 `assets/js/ui.js` 注入：`.mc-brand`（品牌）+ `.nav-right`（语言）+ `.mc-menu-btn`（汉堡）+ `.mc-mobile-backdrop`；打开态 `body.mc-nav-open`。

```css
@media (max-width: 768px) {
  /* 关键：bundle 在 ≤768 把 nav 设为 static，绝对定位的展开面板会以整页 .app-container
     为包含块、渲染到页面底部（R2 实测修复，L-38） */
  body .ghibli-nav { position: relative; min-height: var(--mc-mobile-nav-height); padding: var(--mc-space-2) var(--mc-space-4); }
  body .ghibli-nav .mc-brand { display: inline-flex; margin-right: auto; color: var(--mc-text-heading); font-weight: var(--mc-font-weight-bold); }
  body .ghibli-nav .mc-menu-btn { display: grid; width: var(--mc-tap-target-min); height: var(--mc-tap-target-min); border-radius: var(--mc-radius-pill); background: var(--mc-surface-3); }
  body .ghibli-nav .nav-left { display: none; }
  body.mc-nav-open .ghibli-nav .nav-left { display: flex; flex-direction: column; position: absolute; top: 100%; left: 0; right: 0; padding: var(--mc-space-3) var(--mc-space-4); background: var(--mc-surface-menu); border-radius: 0 0 var(--mc-radius-2xl) var(--mc-radius-2xl); }
}
```

要点：桌面导航完全不变；移动菜单的每个链接 ≥44px；Esc/遮罩/点击链接关闭；焦点返回按钮。

---

## 18. 移动端工具优先布局（R1，≤768px）

`ui.js` 自动给 body 打标：首页 `mc-collage-page`、工具页 `mc-tool-page`。**只改视觉顺序，DOM/SEO 文本不动。**

```css
@media (max-width: 768px) {
  /* 首页：上传区优先 */
  body.mc-collage-page .collage-tool-container { display: flex; flex-direction: column; }
  body.mc-collage-page .collage-tool-container > .main-content { order: 1; }
  body.mc-collage-page .collage-tool-container > .page-header { order: 2; }
  body.mc-collage-page .collage-tool-container > .tool-nav { order: 3; }
  body.mc-collage-page .main-content { display: flex; flex-direction: column; }
  body.mc-collage-page .main-content > .canvas-container { order: 1; }
  body.mc-collage-page .main-content > .sidebar { order: 2; }

  /* 工具页：页头 → 工具区 → 工具导航 → SEO */
  body.mc-tool-page [class$="-tool-container"] { display: flex; flex-direction: column; }
  body.mc-tool-page [class$="-tool-container"] > .main-content { order: 2; }
  body.mc-tool-page .main-content { display: flex; flex-direction: column; }
  body.mc-tool-page .main-content > #uploadContainer { order: 1; }
  body.mc-tool-page .main-content > #editorContainer { order: 2; }
  body.mc-tool-page .main-content > .mode-guide { order: 3; }

  /* 工具导航：横向滚动 pill 行 */
  body .tool-nav-container { flex-wrap: nowrap; overflow-x: auto; justify-content: flex-start; }
  body .tool-nav-link { flex: 0 0 auto; white-space: nowrap; }
}
```

验收：320/360/390 无横向溢出；桌面 >768 布局不变；SEO 长文保留在 DOM。

---

## 19. 撤销/重做与导出状态（R0）

```html
<button class="toolbar-btn" id="undoBtn" aria-label="Undo" data-i18n-aria-label="toolbar.undo" disabled><span>↶</span></button>
<button class="toolbar-btn" id="redoBtn" aria-label="Redo" data-i18n-aria-label="toolbar.redo" disabled><span>↷</span></button>
```

- 绑定 `window.mecollage.undo()` / `.redo()`；每步操作后刷新 disabled（历史深度 20）；
- 快捷键保留（Ctrl/Cmd+Z、Shift+Ctrl/Cmd+Z）；
- 导出：按钮 `disabled` + `aria-busy="true"` + toast 进度 → 成功 toast（尺寸/大小）/失败 toast（重试 action）；不改导出结果（白底/scale 2/quality 1.0）；
- 未保存：`beforeunload` 只在有照片且未导出时触发。

---

## 20. 博客搜索（R2，渐进增强）

结构（`blog/index.html`，脚本 `assets/js/blog-search.js`）：

```html
<div class="blog-search-panel">
  <div class="blog-search">
    <label class="mc-sr-only" for="blogSearchInput" data-i18n="blog.search.placeholder">Search articles…</label>
    <input type="search" id="blogSearchInput" class="blog-search-input" autocomplete="off" spellcheck="false" />
  </div>
  <p class="blog-search-results" id="blogSearchResults" role="status" aria-live="polite" hidden></p>
  <div class="blog-search-empty" id="blogSearchEmpty" tabindex="-1" hidden>
    <p data-i18n="blog.search.empty">No articles match your search.</p>
    <button type="button" class="blog-search-clear" data-i18n="blog.search.clear">Clear search</button>
  </div>
</div>
```

规则：
- 无 JS 时全部文章可见（渐进增强）；过滤只改 `hidden`/`display`，不改 URL/canonical/链接；
- 匹配标题 `.blog-post-title` + 摘要 `.blog-post-excerpt`（NFKC 归一化、大小写不敏感、空白分词 AND、CJK 原样）；
- 结果数 `role="status" aria-live="polite"`；单数用 `blog.search.result_one`、复数 `blog.search.results`；
- 空状态可聚焦（`tabindex="-1"`）+ 清除按钮 ≥44px；
- **坑**：页面内联 `.blog-post-card{display:flex}` 会覆盖 UA `[hidden]` → components.css 必须有 `body .blog-post-card[hidden]{display:none!important}`（L-39）。

```css
.blog-search-panel { max-width: 500px; margin: var(--mc-space-3) auto var(--mc-space-6); display: flex; flex-direction: column; gap: var(--mc-space-2); }
body .blog-search-input { min-height: var(--mc-tap-target-min); border-radius: var(--mc-radius-pill); background: var(--mc-surface-2); color: var(--mc-text-primary); }
.blog-search-results { color: var(--mc-text-muted); font-size: var(--mc-font-size-caption); }
.blog-search-empty { border: var(--mc-border-width-strong) dashed var(--mc-border-input); border-radius: var(--mc-radius-lg); background: var(--mc-surface-2); }
body .blog-search-clear { min-height: var(--mc-tap-target-min); border-radius: var(--mc-radius-pill); background: var(--mc-color-brand-tint); color: var(--mc-text-on-brand); }
```

验收：搜索 `mobile` → 1 篇 + 结果数；`zzzz` → 空状态；清除 → 8 篇；URL 不变；无 JS/i18n 时不裸 key、不白屏。functional IDX-24/25 覆盖。

---

## 22. 导航角色分离（R2 Phase 1）

原则：**全局导航负责"我在网站哪里"，局部工具切换负责"我在这个工具的哪里"**，两者不重复。R2 Phase 2A 已把全局 nav 收口为 Home/Blog/About/Contact（5 语言真实链接），工具只通过局部 `.tool-nav` 与 footer `.footer-tools` 进入。

```html
<!-- 局部工具切换（工具页/首页；不含 Home） -->
<nav class="tool-nav">
  <div class="tool-nav-container">
    <a href="/" class="tool-nav-link active" data-i18n="tool.collage_maker">Collage Maker</a>
    <a href="/tools/squarecrop/" class="tool-nav-link" data-i18n="tool.square_crop">Square Crop</a>
    <a href="/tools/roundedcorners/" class="tool-nav-link" data-i18n="tool.rounded_corners">Rounded Corners</a>
    <a href="/tools/square/" class="tool-nav-link" data-i18n="tool.square_image">Square Image</a>
    <a href="/tools/blurredframe/" class="tool-nav-link" data-i18n="tool.blurred_frame">Blurred Frame</a>
  </div>
</nav>

<!-- 页脚 Tools（所有有 footer 的页面；本地化前缀 + i18n） -->
<nav class="footer-tools" aria-label="Tools" data-i18n-aria-label="nav.tools">
  <a href="/" data-i18n="tool.collage_maker">Collage Maker</a>
  <a href="/tools/squarecrop/" data-i18n="tool.square_crop">Square Crop</a>
  <a href="/tools/roundedcorners/" data-i18n="tool.rounded_corners">Rounded Corners</a>
  <a href="/tools/square/" data-i18n="tool.square_image">Square Image</a>
  <a href="/tools/blurredframe/" data-i18n="tool.blurred_frame">Blurred Frame</a>
</nav>
```

规则：
- `.tool-nav` 不含 Home；about/contact 移除 tool-nav；首页不放 `.home-tool-entry` 重复卡；
- footer 链接用当前语言前缀（`/zh/tools/...`、`/tw/...`、`/ja/...`、`/es/...`），静态文案来自 i18n JSON（无 JS 也正确），`data-i18n` 供运行时切换；
- `.footer-tools` 样式：居中换行、链接 ≥44px 高、`border-bottom: var(--mc-border-subtle)` 分隔；移动端字号降到 `--mc-font-size-2xs`；
- 桌面 `.tool-nav` 为透明上下文 tab（无第二层导航容器）；移动保持横向滚动；
- 迁移脚本：`scripts/design-system/nav-role-separation.mjs`（Phase 1：tool-nav/内容页/首页卡/footer-tools）+ `nav-global-cleanup.mjs`（Phase 2A：全局 nav 工具链接 → Contact，54 页，5 语言）+ `footer-tools-standalone.mjs`（Phase 2B-1：40 个无 footer 页 footer-tools）；均支持 dry-run/--apply/--json/--report、幂等；
- 门禁：`check-layout.mjs` F 项（tool-nav 无 Home / 内容页无 tool-nav / 首页无重复卡 / 有 footer 必有 footer-tools / 全局 nav 含 Contact 且无工具链接）。
- 40 个无 footer 的本地化/指南页使用 `.footer-tools--standalone`（轻量：border-top + 居中换行，不重建整站 footer）；迁移脚本 `footer-tools-standalone.mjs`。全站 94 页（除 404）均有 footer-tools。

---

## 附录：组件速查

| 组件 | 主 token | 现有类/文件 |
|---|---|---|
| 页面面板 | `--mc-panel-*` | `.page-container`（pages bundle） |
| 玻璃卡片 | `--mc-card-*` | `.feature-card`、`.blog-post`、`.faq-item` |
| 顶部导航 | `--mc-z-nav`、`.nav-link` | `.ghibli-nav`（index bundle） |
| 工具导航 | `--mc-radius-panel` | `.tool-nav`（bundle + 工具页内联） |
| 按钮 | `--mc-button-*`、`--mc-gradient-*` | `.btn`、`.btn-primary`、`.btn-success`、`.cta-button`（14 变体，慎用） |
| 输入 | `--mc-input-*` | `.blog-search-input`、`.mc-input` |
| 上传区 | `--mc-border-brand-solid`、`--mc-surface-0` | `.upload-area` |
| 画布浅色控件 | `--mc-overlay-*` | `.image-container .remove-btn`、`.add-image-btn`（index 内联块） |
| Toast | `--mc-surface-toast`、`--mc-z-toast` | `.toast`（bundle + 页面内联） |
| Footer | `--mc-text-link` | 裸 `<footer>`（54 页） |
| 404 | `--mc-solid-*` | `404.html` 内联 |
| 语言选择器 | `--mc-color-brand-tint*` | `.lang-selector*`（bundle vs i18n.css 冲突） |
| Toast | `--mc-toast-*`、`--mc-color-{success,info,danger}` | `.mc-toast`（`ui.js`） |
| 移动顶栏 | `--mc-mobile-nav-height`、`--mc-tap-target-min` | `.mc-brand`/`.mc-menu-btn`（`ui.js`） |
| 工具优先布局 | `--mc-mobile-nav-height` | `body.mc-collage-page` / `body.mc-tool-page` |
| 撤销/导出状态 | `--mc-duration-*`、`--mc-color-*` | `#undoBtn`/`#redoBtn`/`#exportBtn` |
| 博客搜索 | `--mc-tap-target-min`、`--mc-radius-pill`、`--mc-surface-2` | `.blog-search*`（`blog-search.js`） |
