# L-20261106-32 alert 式阻塞反馈 + toast 样式死代码

| 字段 | 值 |
|---|---|
| ID | L-20261106-32 |
| 日期 | 2026-11-06 |
| 状态 | mitigated（15 处 alert 已移除、toast 已接线；`ui.js` 注入与最终 harness 待完成） |
| 严重度 | P1 |
| 证据层 | 代码层 + 本地渲染层 |
| 关联文件 | `assets/js/mecollage-main.js`（HEAD `fedc3ee` 15 处 `alert()`：:316/:320/:327/:345/:1848/:1852/:1907/:1949/:1957/:1994/:2065/:2067/:2071/:2089/:2127）；`assets/pages-C2UaL6ML.css:773-791`（`.toast` 样式）；`assets/js/ui.js`（新增 `window.mcUI`）；`scripts/design-audit/check-layout.mjs:197-210`（D 项 alert 检查）；`scripts/functional-audit/run-tests.mjs:787-800`（`readFeedback`） |
| 发现来源 | 交互审计 P1-1 / P1-4 / P2-2 + R0 实现 |
| 负责人 | 实施者（反馈接线）；Lead（注入/验收）；维护者（批准） |

## 症状（可观察到的事实）

1. **阻塞式反馈 15 处**（HEAD `fedc3ee`，`git show HEAD:assets/js/mecollage-main.js | grep -nE '\balert\s*\('`）：:316、:320、:327、:345、:1848、:1852、:1907、:1949、:1957、:1994、:2065、:2067、:2071、:2089、:2127。典型：`alert('Export failed. Please try again.')`（:1907）、`alert('Please enter valid grid dimensions (1-10)')`（:1949）、`alert('Failed to load AI models. Please check your internet connection.')`（:1994）。
   - 多数是**硬编码英文**：本地化页（/zh/ /tw/ /ja/ /es/）也显示英文；少数用 `window.i18n.t(...)`（如 :2065），口径不统一。
2. **toast 是死代码**：`assets/pages-C2UaL6ML.css:773-791` 定义了 `/* Global toast */ .toast` / `.toast.is-visible` 的完整样式，但 HEAD 的 `assets/js/*.js` **没有任何** toast 调用（`git grep -n 'toast' HEAD -- assets/js` 无业务命中），样式从未被使用。
3. **无进度/成功反馈**：导出（`main.js:1880-1912`）无 loading、按钮不禁用（可连点）、成功后无提示；AI 模型下载只有按钮文字变化；上传后无"已添加 N 张"提示且页面不滚动。
4. **验收口径被实现绑死**：functional harness 的 IDX-19/IDX-21 直接读 `page.dialogs`（HEAD `run-tests.mjs:815/892`），反馈方式一改就会报"未捕获到提示"（详见 L-35）。
5. **R0 最终态（2026-11-06 03:2x）**：`alert()` 已从 15 处降为 **0**（`git grep -nE '\balert\s*\(' -- 'assets/js/*.js'` 仅命中注释）；新增 `assets/js/ui.js`（`mcUI.toast` 四态、`#mc-toast-stack`、`role="status"` + `aria-live="polite"`、最多 3 条）、`components.css` §14 视觉；`ui.js` 已注入 **94/94** 页（404 排除，`inject-ui.mjs --apply`）；`check-layout` D 项 PASS（alert 0）；functional **51 PASS / 0 FAIL / 2 WARN**（WARN = IDX-13/ENV-02，非产品 FAIL）。

## 影响

- **对用户**：错误/上限/网格非法等高频场景全部是阻塞弹窗，移动端体验差；英文文案对 4 个本地化语言用户不可读；无重试/撤销路径；导出无进度与成功反馈，"点了没反应"。
- **对可维护性**：反馈文案散落在 JS 字符串里，i18n 无法覆盖；`.toast` 样式写了却不用（死代码），后续会话会误以为"已有 toast 能力"。
- **对门禁**：行为（alert）与验收断言（dialog 文本）耦合，改行为就误报 FAIL，阻塞发布（L-35）。
- **影响面量化**：HEAD 15 处 alert；站点 95 页 × 5 语言；导出/上传/AI/网格为核心旅程。

## 根因

- **直接原因**：早期用 `alert()` 作为最省事的反馈通道；`.toast` 样式由页面 bundle 提供但从未接线（无 `showToast` 实现）。
- **为何会发生**：① 没有"统一反馈 API"契约（success/info/error/undo 四态、aria-live、action）；② 反馈文案没有进 i18n 命名空间；③ 验收只做"功能能跑"（52 项回归），没有交互质量门禁（alert 不在任何检查里）。
- **结构性**：只要 `alert()` 仍被允许，产品反馈就会继续分裂；必须同时"移除 alert + 提供等价 toast API + 把 alert 变成 FAIL 门禁"三件事一起做。

## 规则（以后必须 / 禁止做什么）

必须：

1. **产品反馈统一走 `window.mcUI.toast(message,{type,actionLabel,onAction})`**：四态 success/info/error/undo；同屏最多 3 条；`role="status"` + `aria-live="polite"`；文案走 i18n（`toast.*` / `export.*` / `ai.*`）；可带 action（重试/撤销）。
2. **错误场景必须给 retry/替代路径**（导出失败、AI 加载失败、文件读取失败）；导出/上传/AI 等耗时操作必须有 loading（`setBusy`：禁用 + `aria-busy` + 文案）与成功反馈。
3. `ui.js` 未加载/异常时，允许在调用方降级为**非阻塞** fallback（`main.js` 内置 `#mc-toast-stack` 渲染 + `console.error`），**不得回退 alert**。
4. 新增反馈文案必须同时补 5 语言（en/zh/zh-tw/ja/es），并跑 i18n JSON 合法性检查与对应 harness。

禁止：

1. 在 `assets/js/*.js` 使用 `alert()`（门禁 D 项：`scripts/design-audit/check-layout.mjs` 会 FAIL；注释含"禁止 alert"说明除外）。
2. 用 `confirm()` 作为普通产品反馈（破坏性操作确认需在 ADR 里单独决策，不得顺手替换 alert）。
3. 只换文案/翻译但保留阻塞弹窗；或只删 alert 不提供等价反馈（用户会"失去反馈"）。
4. 把 toast 样式写成死代码（新增样式必须同时有线上的调用点与验收断言）。

## 检测方法（命令 / 脚本）

```bash
cd /Users/keyi/mecollage

# 1) 静态门禁：代码层禁止 alert（assets/js/*.js；注释行跳过）
node scripts/design-audit/check-layout.mjs
# 关注 [FAIL]/[PASS] D 项：禁止 alert() 作为产品反馈；
# 期望：D PASS（0 处）；出现任一 alert → FAIL（exit 1）

# 2) 直接检索（复核门禁口径）
git grep -nE '^[^/]*\balert\s*\(' -- 'assets/js/*.js'     # 期望无输出
git grep -nE 'mcUI\.toast|#mc-toast-stack' -- 'assets/js/*.js' | head   # 期望有接线

# 3) 行为回归：上传/网格/AI 失败路径应捕获 toast 文本
node scripts/functional-audit/run-tests.mjs
# 关注 IDX-19（网格容量提示）与 IDX-21/IDX-22（AI 失败提示）：
# 断言读 dialog + #mc-toast-stack 文本，0 FAIL

# 4) 证据归档
node scripts/design-audit/check-layout.mjs --json audit/design-migration/verify/layout.json \
  --md audit/design-migration/verify/layout.md
```

判定标准：

- **通过**：check-layout D 项 PASS（alert 0）；IDX-19/21/22 断言能读到 toast 或 dialog 文本且 0 FAIL；导出/上传场景有 loading 与成功 toast（截图/日志）。
- **复发**：check-layout 出现 `[FAIL] D. 禁止 alert()` 且 detail 非空 → exit 1；或只删 alert 导致断言"未捕获到提示" → 说明反馈未接线。
- **允许**：破坏性操作的原生确认（若未来引入）需单独评审并在 ADR 记录，不计入本规则。

## 反例（本项目的真实反面样本）

- **HEAD `main.js` 的 15 处 alert**（行号见上）：`alert('Export failed. Please try again.')`、`alert('Please enter valid grid dimensions (1-10)')` 等。
  - 为什么错：阻塞、英文、无 action、移动端弹窗；且无法被 toast 门禁覆盖。
  - 当时正确做法：`mcUI.toast(t('toast.export_failed'), {type:'error', actionLabel:t('toast.retry'), onAction: retryExport})`。
- **`assets/pages-C2UaL6ML.css:773-791` 的 `.toast` 死代码**：样式完整但从未被调用。
  - 为什么错："看起来有能力、实际没有"的死代码会让后续会话反复造轮子/误判。
  - 当时正确做法：要么接线并纳入门禁断言，要么删除；R0 选择新增 `mcUI.toast` + 保留旧 `.toast` 视觉兼容（components.css §10 统一 token 化）。
- **functional harness 旧断言只读 `page.dialogs`**（HEAD :815/:892）：alert→toast 后即使功能正确也报"未捕获到提示"。
  - 为什么错：验收绑定实现细节而非用户可见结果（L-35）。
  - 当时正确做法：`readFeedback()` = dialog + `#mc-toast-stack` 文本（本次已实施）。

## 关联证据

- 代码层：`git show HEAD:assets/js/mecollage-main.js` 行号（15 处）；`assets/pages-C2UaL6ML.css:773-791`；当前 `assets/js/ui.js:105-118/208`（toast stack/四态）、`components.css:1682+`（§14）、`main.js` alert 归零。
- 本地渲染层：`audit/evidence/phase-f/browser/shots/`（旧 alert 状态截图，43 张）；`audit/design-migration/r0/`（R0 toast/导出/移动导航截图）；`audit/design-migration/R1-RESULTS.md` §1–§2。
- `docs/design/INTERACTION-AUDIT.md` §3 P1-1/P1-4；`docs/design/DESIGN-TOKENS.md` §4.8（反馈与状态规则）。
- **最终验收（2026-11-06 03:2x）**：functional **51 PASS / 0 FAIL / 2 WARN**（`audit/evidence/phase-f/browser/report.{md,json}`）；`check-layout --full` D 项 PASS（alert 0）；`inject-ui --apply` 94/94（`audit/design-migration/r0/ui/inject-ui-apply.{md,json}`）。

## 后续动作与关闭条件

- [x] `inject-ui.mjs --apply` 注入 `ui.js` **94/94** 页（404 排除）；5 语言页面 toast/mobileNav 生效（`audit/design-migration/r0/ui/inject-ui-apply.{md,json}`）。
- [x] `check-layout --full` D 项 PASS（alert 0）；functional 51/0/2（WARN 均非产品 FAIL）。
- [ ] 导出/AI/上传三类状态在 Preview 真场景复核（按钮禁用、成功文案含大小、失败重试）；AI 模型真实网络下载/进度需 Preview。
- [ ] 关闭条件：① check-layout D PASS（已达成）；② `git grep` alert 0（已达成）；③ IDX-19/21/22 及新增 toast 断言 0 FAIL（已达成）；④ 5 语言 toast 文案齐全（i18n JSON 合法 + 5 语言键集合通过 SEO/i18n 检查）；⑤ 证据归档；⑥ 维护者确认。

## 变更记录

- 2026-11-06 open：交互审计 P1-1（15 处 alert + `.toast` 死代码）记录。
- 2026-11-06 mitigated：R0 将 15 处 alert 全部替换为 toast（i18n 化、四态、aria-live、fallback）；新增 check-layout D 门禁；functional 断言口径同步（L-35）；`ui.js` 已注入 94/94 页。
- 2026-11-06 验收：functional **51 PASS / 0 FAIL / 2 WARN**；`check-layout --full` **PASS 5/0/0**（D 项 alert 0）；证据 `audit/evidence/phase-f/browser/report.md`、`audit/design-migration/r1/layout-check-full.{json,md}`。
