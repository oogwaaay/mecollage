# L-20261106-37 headless FPS 不能证明 GPU/blur 性能

| 字段 | 值 |
|---|---|
| ID | L-20261106-37 |
| 日期 | 2026-11-06 |
| 状态 | mitigated（已改性能预算门禁 + 记录限制；真机 profiling 待 Preview） |
| 严重度 | P2 |
| 证据层 | 本地渲染层（headless Chrome）+ 代码层 |
| 关联文件 | `scripts/design-audit/check-performance.mjs`；`scripts/design-audit/performance-budget.json`（rationale/caveats/C 段）；`docs/design/DESIGN-TOKENS.md` §4.10；`audit/design-migration/r2/perf-budget.{json,md}`；ADR-0008 D4 |
| 发现来源 | R2 性能预算任务（R2-C2）：计划中的「移动端 blur 缩减」在 headless A/B 实测无差异 |
| 负责人 | 实施者（预算门禁）；审计者（bench 复跑）；维护者（真机判定） |

## 症状（可观察到的事实）

R2 性能任务先假设「移动端 backdrop-filter/blur 成本高，应缩减模糊」，于是用 390×844 headless Chrome 做 A/B：默认 blur vs 缩减 blur，滚动 150 帧采样 `requestAnimationFrame` 帧间隔。结果（`audit/design-migration/r2/perf-budget.md` §C）：

| 指标 | baseline（默认 blur） | reduced（缩减 blur） |
|---|---:|---:|
| frames | 150 | 150 |
| avg | 16.66ms | 16.63ms |
| p95 | 16.98ms | 16.91ms |
| p99 | 17.33ms | 17.22ms |

- 差异 ≤0.03ms（<0.2%），且帧间隔被锁在 **16.67ms（60fps）** 附近；无 long task。
- 首页在 390×844 下实际有 **48 个 `backdrop-filter` 元素**（`performance-budget.json` baseline `/` backdrop=48）。
- 结论：headless 下「缩减 blur」**测不出收益**；用它当"性能优化"依据会导致无证据的视觉降级（壁纸+玻璃是全站品牌识别）。

## 影响

- **产品/视觉**：若无证据地删/降 blur，会破坏 ADR-0006/0007 建立的「壁纸 + 深色玻璃」视觉语言，且用户感知不到性能提升。
- **工程判断**：headless 的 60fps 锁会让真正的 GPU 合成/绘制瓶颈"看起来不存在"；反过来也可能因为**无关项**（图片/字体/第三方脚本）掩盖真实瓶颈，优化方向被带偏。
- **治理**：性能讨论缺少可执行判据时，容易变成"感觉优化"或"为了指标牺牲设计"，无法在 Preview/回归中验证。
- **影响面量化**：首页 + zh 首页各 48 个 backdrop 元素（5 语言 × 首页 + 工具页）；移动端所有页面共用 `components.css` 玻璃层。

## 根因

- **直接原因**：headless Chrome 的 `requestAnimationFrame` 与合成器行为（vsync 锁 60fps、GPU 合成虚拟化/软件路径）不能代表真机 GPU 的 `backdrop-filter` 成本；A/B 在这种环境下天然无差异。
- **为什么之前没暴露**：性能审计只到"建议做性能预算（blur/图片/字体）"，没定义**什么证据才算数**；R1/R0 从未在真机上测过 blur 成本。
- **结构性**：无构建/无 CI 的静态站没有性能回归门禁；"性能"停留在主观判断，缺少像 token/functional 那样的可执行检查。

## 规则（以后必须 / 禁止做什么）

必须：

1. **性能优化必须给可复现的真机/DevTools 证据**（Safari/Chrome Performance 录制、GPU 帧时间、long task、真实设备截图），否则**不得**做视觉降级（删 blur、降壁纸、减动效）。
2. 性能**回归**用静态/结构预算门禁：`node scripts/design-audit/check-performance.mjs`（资源 gzip 体积、DOM 节点/深度、backdrop 数量、样式表/脚本数）；超预算 FAIL、>90% WARN。
3. `--bench` 的 FPS/长任务只作**参考记录**（INFO），不设门槛、不作为发布判据。
4. 新增第三方脚本/图片/AI 库回首页时，先更新 `scripts/design-audit/performance-budget.json` 并复核预算，再进 Preview。
5. 真机性能结论写清设备/系统/网络/DevTools 版本与采样方式；不确定项标"待真机"。

禁止：

1. 用 headless Chrome 的 FPS 差异（或"rAF 锁 60fps 看不出问题"）证明/否定 blur 性能收益。
2. 为"性能"删除/弱化壁纸、玻璃、动效等品牌视觉元素——除非有真机证据且维护者批准。
3. 把 `check-performance` 的 A 项 WARN（如旧 bundle 体积）当成可以忽略的老问题而不记录/不排期。
4. 用 `--bench` 的数字当发布门槛（否则会在 CI/Preview 上产生假 FAIL/WARN）。

## 检测方法（命令 / 脚本）

```bash
cd /Users/keyi/mecollage

# 1) 结构/体积预算门禁（发布判据）
node scripts/design-audit/check-performance.mjs
# 期望：PASS（exit 0）；A 体积、B 渲染结构不得超预算；>90% 预算为 WARN 需说明
# 2026-11-06 基线：A 1 WARN（旧 bundle gzip 11189/12000B）、B 全 PASS、C INFO

# 2) 参考 bench（只记录，不作门槛）
node scripts/design-audit/check-performance.mjs --bench
# 关注输出 C 段：headless 下 baseline/reduced 的 avg/p95/p99 基本一致（锁 60fps）

# 3) 证据归档
node scripts/design-audit/check-performance.mjs --json audit/design-migration/r2/perf-budget.json \
  --md audit/design-migration/r2/perf-budget.md
```

判定标准：

- **通过**：`check-performance.mjs` PASS（WARN 已解释）；预算内；真机性能结论有录屏/DevTools 数据。
- **复发/错误做法**：出现"因为 headless FPS 无差异/有差异所以删/加 blur"的结论；或预算 FAIL 却合并；或把 C 段 INFO 写成 PASS/FAIL 门槛。
- **注意**：headless 数字只能证明"结构/体积没回归"，**不能**证明真机 GPU 成本；真机结论需要设备与采样方式说明。

## 反例（本项目的真实反面样本）

- **R2 的计划假设**：「移动端 48 个 backdrop 元素 → 缩减 blur 能提升滚动性能」。
  - 为什么错：headless A/B 实测 avg 16.66→16.63ms、p95 16.98→16.91ms（<0.2%），且 60fps 被锁；无法证明真机收益，却会牺牲玻璃视觉一致性。
  - 当时正确做法（已采用）：不做 blur 缩减；把"性能"落到可测预算（A/B 体积与结构）+ `--bench` 参考；真机 profiling 留到 Preview（ADR-0008 D4）。
- **另一个易犯错误**：把 WARN（旧 bundle gzip 11.1KB / 预算 12KB，>90%）当成"PASS 忽略"。
  - 正确做法：记录 WARN 并在交付说明里排期（旧 bundle 无源码、不在本轮删）。

## 关联证据

- `audit/design-migration/r2/perf-budget.{json,md}`：A 体积表（9 项）、B 渲染结构（5 页）、C A/B 参考（baseline/reduced）。
- `scripts/design-audit/performance-budget.json`：rationale/caveats/budgets/baseline（含 48 backdrop 基线）。
- `docs/design/DESIGN-TOKENS.md` §4.10「性能预算」规则；ADR-0008 D4。
- 未做：真机（iOS Safari/Android Chrome）性能 profiling；headless 结果不代表 GPU 成本（已写进 caveats）。

## 后续动作与关闭条件

- [ ] Preview/真机：iOS Safari + Android Chrome 用 DevTools performance 录制滚动/编辑，给出 blur 相关帧时间与 long task（仅记录，除非有稳定证据否则不改视觉）。
- [ ] 保持 `check-performance.mjs` 在 R2+ 的 UI/交互改动门禁里（H11 六道门禁之一）。
- [ ] 定期复核预算（旧 bundle 体积 WARN 需排期）；新增第三方脚本先更新预算。
- [ ] 关闭条件：① 性能发布判据明确为"预算 PASS + 真机记录"（已写入 H11/runbook）；② 至少一次真机 profiling 证据归档；③ 维护者确认。

## 变更记录

- 2026-11-06 open：R2 性能预算任务发现 headless A/B 缩减 blur 无差异（16.66 vs 16.63ms）。
- 2026-11-06 mitigated：改为 `check-performance.mjs` + `performance-budget.json` 结构预算（PASS，1 WARN 旧 bundle）；`--bench` 仅参考；规则写入 DESIGN-TOKENS §4.10 / ADR-0008 / runbook §4.6。
