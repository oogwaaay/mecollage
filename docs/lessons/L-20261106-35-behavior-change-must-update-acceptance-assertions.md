# L-20261106-35 改变用户可见行为必须同步更新验收断言

| 字段 | 值 |
|---|---|
| ID | L-20261106-35 |
| 日期 | 2026-11-06 |
| 状态 | mitigated（本轮 alert→toast 已按新口径同步断言；规则待写入 AGENTS H11） |
| 严重度 | P2 |
| 证据层 | 代码层（harness）+ 本地渲染层 |
| 关联文件 | `scripts/functional-audit/run-tests.mjs`（HEAD `fedc3ee` :815/:892/:926 依赖 `page.dialogs`；当前 :787-800 `readFeedback`、:830/:907 使用）；`assets/js/mecollage-main.js`（HEAD :1957/:1994 的 alert 为断言来源）；`docs/decisions/ADR-0007-interaction-refinement.md` D6 |
| 发现来源 | R0 alert→toast 改造时 functional harness 出现的"断言口径冲突" |
| 负责人 | 实施者（行为+断言同批改）；维护者（批准） |

## 症状（可观察到的事实）

1. functional harness 的 3 处断言把"用户可见提示"写成**只读 `alert` dialog 文本**（HEAD `scripts/functional-audit/run-tests.mjs`）：
   - :815 `const dialogMessage = page.dialogs.map((dialog) => dialog.message).join(' | ');`，:819 `/can only hold|capacity|hold/i.test(dialogMessage)`（IDX-19，网格容量不足）；
   - :892 同法，:897 `/Failed to load AI models/i.test(dialogMessage)`（IDX-21，AI 模型加载失败）；
   - :926（IDX-22，AI 抠图失败）同样只读 dialog。
   - 对应产品代码来源是 HEAD `main.js` :1957 / :1994 的 `alert(...)`。
2. R0 把 `alert()` 全部替换为 toast 后，**功能仍然正确**（用户能看到非阻塞提示），但上述断言会得到空字符串 → 报"未捕获到提示" → **假 FAIL**（若不改测试就合并，会被误判为回归）。
3. 本次在同一变更内把断言改为 `readFeedback()`（当前 :787-800）：读取 dialog 文本 **或** `#mc-toast-stack .mc-toast__msg`/`.mc-toast` 文本，保留旧实现兼容；IDX-19/IDX-21/IDX-22 均改用该口径（:830/:907 等）。

## 影响

- **对发布**：假 FAIL 会阻塞正当改动，诱导两个错误方向——把测试改绿（弱化验收）或把产品回退（恢复 alert）。
- **对质量**：反过来，如果只改产品不改测试且测试"恰好"仍绿，会造成**假 PASS**（验收已不覆盖真实行为），回归被放过。
- **对信任**：验收脚本是唯一自动化门禁；口径与实现脱节后，"harness PASS"不再可信，后续会有人开始手工绕过。
- **影响面量化**：本次涉及 3 个断言（IDX-19/21/22）；harness 共 52 项 + 设备 WARN；后续所有"用户可见行为"改动（toast/aria/错误态/文案）都会踩同类问题。

## 根因

- **直接原因**：断言写死了**实现细节**（`alert` dialog），而不是"用户可见结果"；行为改造与测试改造没有绑定在同一次变更里。
- **为何会发生**：① harness 是围绕旧实现写的（Phase F），没有"断言面向用户可见效果"的约定；② 流程上"改行为"与"改验收"由不同任务/不同会话负责，缺少硬规则；③ 失败信息只报"未捕获到提示"，没有提示"可能只是反馈通道变了"。
- **结构性**：行为变更 → 验收失效 是自动化测试的固有耦合；无构建/无 CI 的站点里 harness 更是唯一门禁，必须把"同步更新断言"写成硬规则（AGENTS H11）而不是靠自觉。

## 规则（以后必须 / 禁止做什么）

必须：

1. **同一变更内**同时更新：产品行为 → 验收断言 → 证据（交付说明列"行为变更 / 断言变更 / 验证输出"三段）。
2. 断言面向**用户可见结果**，而不是单一实现：用候选集合读取（如 dialog 文本 **或** `#mc-toast-stack` 文本、aria-live 区域、可访问名称），保留旧口径**兼容期**（本次同时接受 dialog 与 toast）。
3. 行为变更后必须验证断言**仍能捕获失败场景**：构造一次失败路径，确认新口径能读到提示文本（而不是"空字符串也 pass"）；空文本兜底只允许作为"未捕获到提示"的显式失败。
4. 改完跑 `node scripts/functional-audit/run-tests.mjs`，确认 0 FAIL 且相关 case 的 `measure` 输出包含新反馈文本；证据归档。
5. 若断言必须删除/替换，在变更说明与 ADR 里写清原因与替代覆盖，不得静默删除。

禁止：

1. 只改产品代码不改 harness（假 FAIL/假 PASS）。
2. 为了让测试通过而回退产品行为（例如保留 alert）。
3. 删除失败断言/跳过 case/放宽正则到"任何文本都算"（会让断言失去意义）。
4. 把断言继续绑定到某个具体 DOM id/函数名（如只读 `#toast`），而不覆盖同语义候选（`.mc-toast`、原生 dialog、aria-live 文本）。

## 检测方法（命令 / 脚本）

```bash
cd /Users/keyi/mecollage

# 1) 行为变更的前后对照：旧断言依赖点
git show HEAD:scripts/functional-audit/run-tests.mjs | grep -nE 'page\.dialogs|dialogMessage|\.test\(dialogMessage'
# HEAD 结果：:815 :819 / :892 :897 / :926（3 处依赖 dialog）

# 2) 当前口径是否已覆盖新反馈通道
grep -nE 'readFeedback|mc-toast-stack|page\.dialogs' scripts/functional-audit/run-tests.mjs
# 期望：readFeedback 存在，且读 #mc-toast-stack；page.dialogs 仅作为兼容候选之一

# 3) 行为回归（0 FAIL 才通过；关注 IDX-19 / IDX-21 / IDX-22）
node scripts/functional-audit/run-tests.mjs

# 4) 反向验证（建议在改动时做一次）：临时让 toast 不出现，确认断言失败（不要提交这个改动）
#    目的：证明断言确实在检查"用户可见提示"，不是空文本 pass
```

判定标准：

- **通过**：行为变更同批包含 `scripts/functional-audit/run-tests.mjs` 的 diff；harness 0 FAIL；相关 case 的 `measure`（如 `invalidGridDialog`/`dialog`）包含新反馈文本；反向验证（临时移除反馈）能让断言失败。
- **复发**：行为改了但 `git diff` 里没有 harness 变更；或 harness 仍只读 `page.dialogs`；或断言出现"空文本也算通过"的兜底（`|| dialogMessage.length > 0` 需配合"未捕获到提示"的显式失败说明，不能两边都放行）。
- **不适用**：纯视觉/样式改动（无用户可见行为变化）不需要改断言，但仍需截图/视觉回归。

## 反例（本项目的真实反面样本）

- **HEAD `scripts/functional-audit/run-tests.mjs:815-820`（IDX-19）**：`page.dialogs` + `/can only hold|capacity|hold/i`。
  - 为什么错：产品把提示从 alert 换成 toast 后，用户仍能看到提示，但断言读不到 dialog → 假 FAIL。
  - 当时正确做法：`readFeedback()` 读取 dialog + `#mc-toast-stack` 文本（当前 :787-800；本次已实施）。
- **HEAD :892-898（IDX-21）**：`/Failed to load AI models/i.test(dialogMessage)`。
  - 为什么错：AI 失败改为 toast + i18n 文案后，旧正则/通道都失配。
  - 当时正确做法：读 toast 文本并匹配 `AI|model|模型|load|加载` 等语义集合（当前 :913）。
- **HEAD :926（IDX-22）**：同样只读 dialog（外部库加载失败提示）。
- **"改行为不改测试"的典型后果**：合并前 harness 报 3 项 FAIL，容易被误读为"产品回归"，实际是验收口径未更新——本次已用同批变更消除。

## 关联证据

- 代码层：`git show HEAD:scripts/functional-audit/run-tests.mjs`（:815/:819/:892/:897/:926）；当前 `scripts/functional-audit/run-tests.mjs:787-800`（`readFeedback`）、`:830`/`:907`（使用点）。
- 本地渲染层：`audit/evidence/phase-f/browser/shots/`（旧 alert 状态截图）；`audit/design-migration/r0/`（R0 后 toast/导出截图）。
- `docs/decisions/ADR-0007-interaction-refinement.md` D6；`docs/lessons/L-20261106-32-alert-feedback-and-dead-toast.md`。
- **最终验收（2026-11-06 03:2x）**：functional **51 PASS / 0 FAIL / 2 WARN**（共 53；WARN = IDX-13 用例本身 WARN 级、ENV-02 覆盖说明，非产品 FAIL；IDX-19/21/22 按 dialog+toast 兼容口径 PASS）；证据 `audit/evidence/phase-f/browser/report.{md,json}`、`audit/design-migration/r0/functional-report-final.{md,json}`。

## 后续动作与关闭条件

- [x] 规则写入 `AGENTS.md` H11 与 `GOVERNANCE.md` C2 交互矩阵（本任务同批完成）。
- [x] 本轮即完整案例：alert→toast 行为变更 + `readFeedback()` 断言同批更新；harness **51 PASS / 0 FAIL / 2 WARN**（WARN 非产品 FAIL）。
- [ ] 在后续 R2 的行为变更（导出状态机、触控拖拽、AI 懒加载）中继续复用本规则：先列"行为变更清单"，再逐项核对 harness 断言。
- [ ] 关闭条件：① 一次完整"行为变更 + 断言同步"案例有证据（本轮即案例，已达成）；② harness 0 FAIL 且断言可捕获新反馈（已达成）；③ 规则进入 AGENTS/GOVERNANCE（已达成）；④ 维护者确认。

## 变更记录

- 2026-11-06 open：R0 alert→toast 时发现 harness 断言依赖 dialog 实现（3 处）。
- 2026-11-06 mitigated：同批更新为 `readFeedback()`（dialog + `#mc-toast-stack` 兼容口径）；规则写入 AGENTS H11、GOVERNANCE C2、runbook §4.6。
- 2026-11-06 验收：functional **51 PASS / 0 FAIL / 2 WARN**（WARN = IDX-13 用例本身 WARN 级、ENV-02 覆盖说明）；IDX-19/21/22 通过新口径；证据 `audit/evidence/phase-f/browser/report.{md,json}`。
