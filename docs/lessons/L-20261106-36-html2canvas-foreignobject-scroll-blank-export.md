# L-20261106-36 html2canvas foreignObject 按页面滚动偏移克隆，导致导出全白

| 字段 | 值 |
|---|---|
| ID | L-20261106-36 |
| 日期 | 2026-11-06 |
| 状态 | mitigated（已定位并修复；导出产物非白已验证；Preview/真机滚动后导出待复核） |
| 严重度 | P0（核心功能输出错误；上线前拦截） |
| 证据层 | 代码层 + 本地渲染层 |
| 关联文件 | `assets/js/mecollage-main.js:2330`（导出 wrapper `position:fixed;left:0;top:0`）、`:2364-2373`（html2canvas options，修复后含 `scrollX:0, scrollY:0`）；`scripts/functional-audit/run-tests.mjs:628-720`（IDX-14/15/16 像素 hash 断言）、`:621`（IDX-13 `page.dialogs.slice()` 快照修复）；`scripts/functional-audit/instrument.mjs:22-40`（FNV-1a `pixelSnapshot`） |
| 发现来源 | R0 实现中的 functional 回归 FAIL（IDX-14/15/16 导出像素 hash 全为 `d2b3285`）+ 本地复算 |
| 负责人 | 实施者（导出/交互）；审计者（像素验收）；维护者（Preview/真机确认） |

## 症状（可观察到的事实）

1. **导出全白**：R0 上传后过渡（P0-4）新增 `scrollIntoView`，页面 `scrollY≈450–500`；此后导出 1200×1200 PNG 全白。functional IDX-14（gutter）/ IDX-15（radius）/ IDX-16（滤镜）的导出像素 hash **全部为 `d2b3285`**（本机复算 = **纯白 1200×1200 canvas**），断言"导出像素随参数变化"因而 FAIL。
2. **同页面对比实验**（`audit/design-migration/r0/README.md` §5，同一页面/同一 wrapper、上传+滚动后）：
   - html2canvas 不加 scroll 参数 → **0 个非白像素**（全白）；
   - 加 `scrollX:0, scrollY:0` → **651,834 个非白像素**；
   - 先 `window.scrollTo(0,0)` 再导出 → 同样 651,834（与参数方案等价）。
   - 空白页（无站点 CSS）同参数正常，排除 Chrome/CSS 因素。
3. **修复后**：`main.js` 导出 options 仅在原参数基础上新增 `scrollX: 0, scrollY: 0`（其余白底/scale 2/quality/useCORS/allowTaint/foreignObjectRendering 与 HEAD 逐字一致）；真实导出产物 `audit/design-migration/r0/export-result-1200.png`（1200×1200，3 张照片 + 2×2 网格 + 白底）非白；functional IDX-14/15/16 均 **PASS**（`audit/design-migration/r0/functional-report-final.md`）。

## 影响

- **对用户（若上线）**：任何"上传（触发自动滚动）→ 导出"的主路径都会得到**全白图片**；这是核心功能失效，属 P0。修复前该问题只在 R0 分支出现（未部署），由 functional 像素断言在合并前拦截。
- **对验收**：旧 functional 场景在 `scrollY=0` 下导出，**测不出这个 bug**；只有"页面已滚动后再导出"才复现 → 说明导出类验收必须覆盖滚动状态。
- **对库/参数**：html2canvas 1.4.1 的 `foreignObjectRendering:true` 走 foreignObject 克隆路径；关闭它会丢失 CSS filter（IDX-16 会失败），所以不能靠关闭该特性绕过。
- **影响面量化**：首页编辑器导出（5 语言首页共用 main.js）+ 所有会触发自动滚动的上传流程；工具页导出不受同一路径影响（需按各自 wrapper 复核）。

## 根因

- **直接原因**：html2canvas 1.4.1 的 foreignObject 路径默认用 `window.pageXOffset/pageYOffset`（当前滚动位置）作为克隆文档偏移；而导出用的离线 wrapper 是 `position:fixed;left:0;top:0`（`main.js:2330`，语义上就在视口原点）→ 滚动后内容被整体移出画布，导出纯白。
- **为什么现在才暴露**：R0 之前用户上传后页面不自动滚动（`scrollY≈0`），旧的导出实现"碰巧"正确；R0 为解决"上传后用户不知道发生了什么"新增 scrollIntoView，把潜在参数问题变成**必现**。这是"交互改进引入导出回归"的典型耦合。
- **为什么旧验收没挡住**：旧 functional 导出用例在页面顶部（`scrollY=0`）执行，没有"先滚动再导出"场景；也没有"导出结果 ≠ 纯白"的显式断言（只比较参数变化的 hash 差异）。
- **结构性**：导出/截图是"依赖页面坐标/滚动/视口"的功能，验收必须包含滚动与坐标前提，不能只测理想状态。

## 规则（以后必须 / 禁止做什么）

必须：

1. **导出/截图类功能必须在"页面已滚动"状态下验收**：至少覆盖 `scrollY≈300–600`（或真实交互产生的滚动）后再触发导出/截图，确认产物非白且与 `scrollY=0` 时构图一致。
2. 导出 wrapper 与 html2canvas options 必须成对说明语义：wrapper 若为 `position:fixed;left:0;top:0`（视口原点），options 必须显式 `scrollX:0, scrollY:0`；wrapper 若在文档流内，则按实际几何传偏移。
3. 导出类断言保留两条：① 产物 **≠ 纯白 hash**（当前 FNV 纯白 `d2b3285`）；② 参数/滤镜变化时 hash **必须不同**（防止"全白也算通过"）。
4. 修改导出参数必须逐项 diff，只允许"最小新增"；修复后在 Preview 真机复核"滚动后导出"（iOS Safari 的滚动/坐标行为与桌面不同）。

禁止：

1. 为修复白屏直接关闭 `foreignObjectRendering`（会丢失 CSS filter，IDX-16 失败；正确做法是修偏移参数）。
2. 只测 `scrollY=0` 的导出就宣布"导出正常"；或在导出前偷偷 `scrollTo(0,0)` 改变用户位置而不写进设计（本修复选择参数化，不移动用户视口）。
3. 让"全白 hash 相等"通过断言（如 IDX-14/15/16 在 hash 相等时报 PASS）。
4. 把导出/截图问题当作"偶发/环境问题"跳过（像素 hash 可直接复算，属确定性 bug）。

## 检测方法（命令 / 脚本）

```bash
cd /Users/keyi/mecollage

# 1) 行为回归：上传（触发自动滚动）后导出，比较导出像素 hash
node scripts/functional-audit/run-tests.mjs
# 关注 IDX-14（gutter）/ IDX-15（radius）/ IDX-16（6 滤镜）：
#   断言“导出 canvas 像素随参数变化”必须 PASS；
#   全白时三者 hash 会全部等于 d2b3285（纯白 1200×1200）→ 立即判为复发。

# 2) 代码审查：wrapper 与 html2canvas options 是否成对
grep -nA8 'html2canvas(wrapper' assets/js/mecollage-main.js   # 期望看到 scrollX: 0, scrollY: 0
grep -n 'position:fixed;left:0;top:0' assets/js/mecollage-main.js  # wrapper 在视口原点

# 3) 手动复现（浏览器）：上传 1–3 张照片（页面自动滚动）→ 导出 → 打开 PNG
#    期望：非白、与预览构图/滤镜一致；对照 audit/design-migration/r0/export-result-1200.png

# 4) 像素复算（可选）：canvas getImageData 非白像素数 > 0，且 hash ≠ d2b3285
```

判定标准：

- **通过**：滚动后导出非白；IDX-14/15/16 PASS（参数变化 → hash 变化）；导出图与预览比例/滤镜一致；`export-result-1200.png` 类产物正常。
- **复发**：导出全白 / 三者 hash 同为 `d2b3285` / IDX-14/15/16 FAIL（hash 相等）→ 先查 `scrollX/scrollY` 与 wrapper 是否成对，再查是否有人改动导出参数或上传后滚动逻辑。
- **注意**：纯白 hash 会随导出尺寸/采样步长变化（当前 1200×1200 采样约 9,000 点，FNV-1a）；判定以"非白像素=0 或 hash 与已知纯白一致"为准，不要只写死一个 hash 值。

## 反例（本项目的真实反面样本）

- **R0 第一次 functional 回归（修复前）**：IDX-14/15/16 的导出 hash 全为 `d2b3285`；本地用同一 wrapper 复算为纯白 1200×1200。原因：上传后 `scrollIntoView` 把页面滚到 `scrollY≈450–500`，html2canvas foreignObject 克隆按滚动偏移把 `fixed;left:0;top:0` wrapper 的内容移出画布。
  - 为什么错：导出/截图依赖页面坐标，却只在 `scrollY=0` 验证；R0 的交互改进（自动滚动）与导出共用同一页面状态，回归被"正常功能改进"掩盖。
  - 当时正确做法：html2canvas options 显式 `scrollX:0, scrollY:0`（wrapper 在视口原点），并在滚动后验收导出像素（本次已实施）。
- **旧验收的盲区**：旧 functional 导出用例全部在页面顶部执行；即使导出全白，只要"参数变化 → hash 变化"不成立才会 FAIL，而"全白"又会因为 hash 相同而触发 FAIL——看似能挡住，但**前提是断言已存在且覆盖滚动状态**（本次 R0 恰好有 IDX-14/15/16 才拦住）。
- **修复旁路（未采用）**：关闭 `foreignObjectRendering` 或导出前 `scrollTo(0,0)`。前者丢失 CSS filter（IDX-16 失败），后者会改变用户滚动位置；两者都不是本问题的根因修复。

## 关联证据

- `audit/design-migration/r0/README.md` §5（现象/根因/对比实验/修法/真实用户影响）；§2 门禁结果。
- `audit/design-migration/r0/export-result-1200.png`（修复后真实导出产物）；`empty-placeholder.png`/`editor-undo.png`/`export-toast.png`（R0 状态截图）。
- `audit/design-migration/r0/functional-report-final.{md,json}`：IDX-14/15/16 PASS；`audit/evidence/phase-f/browser/report.{md,json}`（最终 51 PASS / 0 FAIL / 2 WARN）。
- 代码层：`assets/js/mecollage-main.js:2330`（wrapper）、`:2364-2373`（options `scrollX:0, scrollY:0`）；`scripts/functional-audit/instrument.mjs:22-40`（FNV-1a 采样 hash）。
- 关联：ADR-0007 D5/验证段（实现中发现并回灌）；L-35（行为变更同步验收断言）。

## 后续动作与关闭条件

- [ ] Preview + 真机（iOS Safari / Android Chrome）复核：滚动后导出非白、滤镜/比例正确（本地离线不能完全代表真机坐标行为）。
- [ ] 导出类断言固定化：保留"hash ≠ 纯白"+"参数变化 hash 必须不同"两条；新增导出相关用例时默认先滚动。
- [ ] 评估其他"依赖页面坐标"的功能（AI 人脸/贴纸定位等）是否同样需要滚动前提（本轮未发现同类问题，标待确认）。
- [ ] 关闭条件：① 滚动后导出非白（本地已达成，Preview/真机待确认）；② IDX-14/15/16 + 导出状态机断言 0 FAIL；③ 证据归档；④ 维护者确认。

## 变更记录

- 2026-11-06 open：R0 functional IDX-14/15/16 导出 hash 全为 `d2b3285`，本地复算纯白；定位为 html2canvas foreignObject 按页面滚动偏移克隆 vs fixed wrapper。
- 2026-11-06 mitigated：`main.js` 导出 options 仅新增 `scrollX:0, scrollY:0`；其余渲染参数不变；IDX-14/15/16 PASS，`export-result-1200.png` 非白；功能/门禁数字见 ADR-0007 验证段。
