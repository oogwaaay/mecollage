# L-20261106-39 author CSS 的 display 会覆盖 `[hidden]` 属性

| 字段 | 值 |
|---|---|
| ID | L-20261106-39 |
| 日期 | 2026-11-06 |
| 状态 | mitigated（CSS 兜底已加 + computed display 验收；JS inline 兜底待清理） |
| 严重度 | P2 |
| 证据层 | 代码层 + 本地渲染层（CDP computed style） |
| 关联文件 | `blog/index.html:209`（页面内联 `.blog-post-card { display: flex; ... }`）；`assets/js/blog-search.js:138-143`（`el.hidden` + inline `style.display` 兜底）；`assets/css/components.css:2131-2132`（`body .blog-post-card[hidden] { display: none !important }`）；`audit/design-migration/r2/blog-search/verify-report.{md,json}` |
| 发现来源 | R2-B 博客搜索实现（隐藏/过滤卡片时发现 `hidden` 属性不生效） |
| 负责人 | 实施者（JS/CSS）；Lead（components.css §20 兜底）；维护者（合并批准） |

## 症状（可观察到的事实）

1. 博客搜索用 `article.hidden = true` 过滤卡片，但卡片**视觉上没有隐藏**：页面内联样式 `blog/index.html:209` 定义 `.blog-post-card { display: flex; ... }`，author CSS 的 `display` 覆盖了浏览器 UA 样式表的 `[hidden] { display: none }`。
2. 结果是 DOM 的 `hidden` 属性与 computed `display` 不一致：`hidden=true` 但 `getComputedStyle().display === 'flex'`；搜索结果"看起来没生效"。
3. 实现中的临时兜底（`assets/js/blog-search.js:138-143`）：

```js
// hidden 属性给语义层；页面内联 .blog-post-card{display:flex} 的优先级高于
// UA 的 [hidden]{display:none}，因此同步 inline display 确保“视觉过滤”真正生效
item.el.hidden = !isMatch;
item.el.style.display = isMatch ? '' : 'none';
```

4. 最终修复（Lead 并入 `components.css §20`，`:2131-2132`）：

```css
/* 页面内联 .blog-post-card{display:flex} 会覆盖 UA 的 [hidden]，补一条兜底 */
body .blog-post-card[hidden] { display: none !important; }
```

5. 验收改为查 **computed display**（`verify-report.md` A4/A7/A12：`visibleComputed / hiddenComputed`；functional IDX-24/25 也断言"过滤生效/清除恢复"）：搜索 `mobile` → 1 篇可见 + 7 篇 computed display 隐藏；清除 → 8 篇可见。

## 影响

- **对用户**：搜索时"输入了但列表没变"（视觉上没过滤），结果数与卡片不一致；空状态/结果数语义与视觉脱节。
- **对可访问性/语义**：`hidden` 属性本应同时传达"不可见且不可聚焦"；被覆盖后屏幕阅读器/键盘焦点与视觉状态可能不一致。
- **对实现**：不得不在 JS 里写 inline `display` 兜底，行为状态散落在 JS，换实现/降级（无 JS 但有 CSS）时容易漏；后续新增卡片/模块会重复踩坑。
- **影响面量化**：博客列表 8 张卡（当前 `/blog/` 唯一列表页，5 语言键预留）；同模式可在任何"有 author display 的容器 + [hidden] 切换"处复发（搜索结果、空状态、工具面板等）。

## 根因

- **直接原因**：HTML `hidden` 属性不是"魔法"，它只对应**浏览器 UA 样式表**的 `display:none`；author（站点）CSS 中任何 `display` 声明在层叠中优先于 UA 样式，因此 `.blog-post-card{display:flex}` 胜出。
- **为什么会出现**：无构建/多来源样式（bundle + 页面内联 `<style>` + `components.css` + 动态类），页面内联样式常带 `display`；写 JS 的人默认"hidden 会隐藏"，没有 computed style 验收。
- **为什么没被尽早发现**：验收只看"visible 数量/DOM 属性"而不看 computed display 时会误判；功能测试若不覆盖"过滤后视觉隐藏"也会漏。

## 规则（以后必须 / 禁止做什么）

必须：

1. 用 `[hidden]` 表达隐藏时，**author CSS 必须提供兜底**：`[hidden] { display: none !important }`（或组件级 `.x[hidden]{display:none!important}`），或把显示规则写成 `.x:not([hidden]) { display: ... }`。
2. 验收断言读 **computed style**（`getComputedStyle(el).display === 'none'`）而不是只读 `hidden` 属性/可见数量；同时覆盖"无 JS"场景（渐进增强）。
3. 新增会切换 `[hidden]` 的组件时，在 `COMPONENT-RECIPES` 里写明隐藏规则（类名 + CSS 兜底），并加一条 functional/CDP 断言。
4. 若 JS 需要同步 inline `display` 作为兼容，必须注释原因并列入清理项（CSS 兜底生效后可移除）。

禁止：

1. 只设 `element.hidden = true` 就认为"已隐藏"（在存在 author display 时不可靠）。
2. 用 `visibility:hidden`/`opacity:0` 假装隐藏（仍占位/可聚焦/可被读屏访问，除非另有 `display:none`）。
3. 长期依赖 JS inline `display` 作为唯一隐藏机制（越权混入行为状态，且 CSS/JS 双写易漂移）。
4. 用 `!important` 之外的高特异性"补丁"堆叠而不写清楚规则来源（本项目的兜底就是显式 `!important`，并在注释说明原因）。

## 检测方法（命令 / 脚本）

```bash
cd /Users/keyi/mecollage

# 1) 静态定位：谁定义了 display / 谁写了 hidden 兜底
grep -nE '\.blog-post-card\s*\{' blog/index.html | head
grep -n 'blog-post-card\[hidden\]' assets/css/components.css   # 期望存在 display:none!important 兜底

# 2) 行为回归：搜索过滤/清除的真实可见性（computed display）
node scripts/functional-audit/run-tests.mjs
# 关注 IDX-24（过滤生效 + URL 不变 + 清除恢复）与 IDX-25（空结果/aria/清除按钮），期望 0 FAIL

# 3) 浏览器证据（CDP/手动）：过滤后用 computed style 验证
#    getComputedStyle(card).display === 'none'（隐藏）且 hidden === true；
#    恢复后 display 回到原值（flex/block），hidden === false。

# 4) 归档（本机证据，audit/ 已 gitignore）
node scripts/functional-audit/run-tests.mjs --json audit/design-migration/r2/blog-search/verify-report.json \
  --md audit/design-migration/r2/blog-search/verify-report.md
```

判定标准：

- **通过**：搜索后隐藏卡片 `hidden=true` 且 computed `display === 'none'`；恢复后 `hidden=false` 且 display 回原值；无 JS 时全部文章可见（渐进增强）；IDX-24/25 0 FAIL。
- **复发**：`hidden=true` 但 computed display 不是 `none`（或卡片仍占位/可聚焦）；或移除 CSS 兜底后过滤"失效"。
- **注意**：`hidden` 属性在"无 author display"的组件（如 `.blog-search-results`/`.blog-search-empty`）上可直接生效；本规则针对**已有 display 规则**的元素。

## 反例（本项目的真实反面样本）

- **初版博客搜索（R2-B 实现中）**：`article.hidden = true` 后卡片仍 `display:flex`（页面内联 `blog/index.html:209` 覆盖 UA `[hidden]`）。
  - 为什么错：把 HTML 语义属性当成"样式保证"；隐藏效果实际依赖 JS 额外写 inline `display`，而这条兜底本身又容易被后续 CSS/重构破坏。
  - 当时正确做法（已实施）：`components.css §20` 加 `body .blog-post-card[hidden]{display:none!important}`；JS 只切 `hidden` 语义（inline display 兜底为迁移期兼容，待清理）；验收读 computed display。
- **反向教训**：若只在 CSS 写 `.blog-post-card{display:flex}` 而不写 `[hidden]` 兜底，任何"用 hidden 隐藏"的新代码都会复发（搜索结果/空状态/面板），本次用组件配方写清（L-39 → COMPONENT-RECIPES §20）。

## 关联证据

- 代码层：`blog/index.html:209`、`assets/css/components.css:2131-2132`、`assets/js/blog-search.js:138-143`。
- 本地渲染层：`audit/design-migration/r2/blog-search/verify-report.{md,json}`（A4/A7/A12 computed display 断言）、`desktop-1440-filtered-mobile.png`、`mobile-390-empty-state.png`。
- 文档：`docs/design/COMPONENT-RECIPES.md` §20（博客搜索配方，含该坑）、ADR-0008 D2、`scripts/functional-audit/README.md` §13 邻接说明。
- 5 语言 i18n `blog.search.*` 5 键（含单数 `result_one`）；关键词 `mobile`→1、`tips`→4、`design`→2、`拼图`→0（英文页）。

## 后续动作与关闭条件

- [ ] 验证 CSS 兜底生效后，移除 `blog-search.js` 的 inline `style.display` 兜底（只保留 `hidden = ...`），回归 IDX-24/25 + computed display 断言。
- [ ] 扫描其他 `[hidden]` 使用点（搜索结果/空状态/工具面板等），确认都有 author CSS 兜底或本就无 display 冲突：`git grep -n '\.hidden\s*=' -- 'assets/js/*.js'`。
- [ ] 在 COMPONENT-RECIPES 的组件模板里保留该规则；新增切换 hidden 的组件默认写 CSS 兜底。
- [ ] 关闭条件：① computed display 验收通过（已达成）；② inline display 兜底清理完成；③ 其他 hidden 使用点复核无冲突；④ 维护者确认。

## 变更记录

- 2026-11-06 open：R2-B 实现发现 `hidden` 属性被页面内联 `.blog-post-card{display:flex}` 覆盖，过滤视觉不生效。
- 2026-11-06 mitigated：`components.css §20` 增加 `body .blog-post-card[hidden]{display:none!important}` 兜底；JS 保留 inline display 兼容；CDP 26/0（含 computed display 断言）+ functional IDX-24/25 PASS。
