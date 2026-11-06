# GOVERNANCE.md — MeCollage 变更治理与发布门禁

> 版本：v1（2026-11-05，Phase A）
> 适用范围：本仓库的一切变更，包括代码、HTML、资源、配置、文档、部署与账户级操作。
> 效力：本文件是流程门禁。与任务说明冲突时，以维护者的书面决定为准，并**在同一次变更内**更新本文件/ADR，不允许口头例外。
> 入口：[`AGENTS.md`](AGENTS.md)；教训库：[`docs/lessons/README.md`](docs/lessons/README.md)。

## 0. 为什么需要它

MeCollage 是**无构建、无 CI、96 个手写页面、5 套语言副本、双 CDN** 的静态站，错误配置（重定向、404、响应头、.vercelignore）会一次影响全站，且没有自动回归可依赖。治理体系要保证三件事：

1. **每次生产变更都可追溯**：谁改的、改了什么、验证了什么、谁批准的。
2. **每次事故/审计发现都能沉淀**：变成可执行的规则与检测命令，而不是"下次注意"。
3. **不可逆操作不被顺手做掉**：部署、账户、域名、广告/统计、删除文件都需要明确批准。

## 1. 角色与责任

| 角色 | 由谁担任 | 职责 | 不可以做 |
|---|---|---|---|
| 维护者（Maintainer） | 站点所有者 | 生产发布批准与执行；账户级操作（AdSense/GA4/Cloudinary/Cloudflare/Vercel/GitHub/DNS）；决定优先级与关闭教训；最终验收 | 不能跳过证据记录 |
| 实施者（Implementer） | 开发者 / AI 会话 | 在分支实施变更；跑验收脚本；归档证据；回灌教训；提出 ADR | **不得自主部署生产**；不得改账户设置；不得越过写范围 |
| 审计者（Auditor） | 开发者 / AI 会话（只读） | 只读取证；复现问题；判断修复是否有效；提出教训与优先级 | 不修改被跟踪文件；不部署；不测试第三方写操作 |
| AI 会话 | 任意 | 按任务写范围工作；把"不确定"标出来；完成后报告 | 不能以"默认/历史/看起来没问题"替代维护者批准 |

## 2. 变更分级与审批矩阵

| 级别 | 定义 | 例子 | 分支 | Preview | 验收脚本 | ADR | 维护者批准 | 生产执行 |
|---|---|---|---|---|---|---|---|---|
| **C0 只读** | 不改任何被跟踪文件 | 审计、调研、渲染对比 | 可选 | 不需要 | 只读证据 | 否 | 否 | 不涉及 |
| **C1 文档/治理** | 只改 `AGENTS.md`、`GOVERNANCE.md`、`docs/`（且已被 `.vercelignore` 排除） | 教训库、ADR、runbook | 必须 | 不需要（若会部署则升 C2） | 链接/格式检查 | 视内容 | 合并需批准 | 维护者合并 |
| **C2 常规** | 内容、HTML、静态资源、非高风险配置 | 文案、图片压缩、内链、页面内容 | 必须 | **必须** | **必须 PASS** | 可选 | **必须** | 维护者或授权执行 |
| **C3 高风险** | 安全/URL/错误页/广告统计/删除文件/依赖/部署配置 | CSP、响应头、重定向、404、sitemap、hreflang、`.vercelignore`、删被跟踪文件、新第三方依赖、Publisher ID 相关 | 必须 | **必须 + 人工抽查** | **必须 PASS + 全量矩阵** | **必须** | **逐项批准** | 维护者执行 |
| **C4 紧急热修** | 线上 P0 事故/安全事件，维护者发起 | 生产 500、无限重定向、广告/账户违规 | 允许维护者快速通道 | 可事后补 | 修复后立即 | 事后 24h 内补 | 维护者当次明确授权 | 维护者执行 |

> 判定规则：拿不准时按更高级别处理。AI 不得自行把变更降级。

## 3. 标准变更流程（C2/C3 适用）

```
G0 准备 → G1 分支 → G2 实现 → G3 静态验证 → G4 Preview → G5 验收
      → G6 证据归档 → G7 维护者批准 → G8 生产 → G9 生产验证 → G10 收尾/回灌
```

| 门 | 要求 | 产出 |
|---|---|---|
| G0 准备 | 读 AGENTS/GOVERNANCE/相关 L-* 与 ADR；确认写范围；记录基线 `git rev-parse HEAD`、线上关键状态 | 基线命令输出 |
| G1 分支 | 从最新 `main`（或任务指定基线）建分支；命名见 AGENTS H2；不直接改 `main` | 分支名 + 基线 sha |
| G2 实现 | 最小改动；跨多文件先写幂等脚本（dry-run + diff）；内部文件同步 `.vercelignore`；不引入密钥 | diff/脚本 |
| G3 静态验证 | JSON/HTML 语法、`vercel.json` 可解析、grep 一致性、链接检查；列出需 Preview 验证的项 | 本地输出 |
| G4 Preview | push 分支 → 等 Vercel Preview（见 runbook）→ 拿到 `environment_url` | deployment id + URL + sha |
| G5 验收 | `node scripts/verify-site.mjs --base <preview>` + 本变更专项矩阵；FAIL 必须修复后重跑 | PASS/FAIL/WARN + 退出码 |
| G6 证据 | 原始输出（JSON/MD/headers/渲染快照）存 `audit/evidence/<phase>/verification/`，文件名含 sha 与时间 | 证据路径 |
| G7 批准 | 向维护者提交：变更清单、diff stat、证据、已知项、风险、回滚方式；获得**明确**批准 | 批准记录 |
| G8 生产 | 由维护者执行（或授权执行）；禁止 AI 自主触发 | 生产部署记录 |
| G9 生产验证 | 用同一脚本/矩阵对生产复跑；记录 PASS/FAIL | 生产验收证据 |
| G10 收尾 | 更新相关 L-* 状态/证据；新教训建条目并更新索引；发布说明 | 索引变更 + 关闭记录 |

**紧急修复例外（C4）**：仅当线上正在发生 P0（全站不可用/无限重定向/安全事件/账户违规风险）且维护者明确发起时启用。要求：单用途最小 diff、当次维护者授权、修复后 1 小时内生产验证、24 小时内补 ADR/证据、48 小时内补教训条目。**AI 不得自行发起 C4。**

## 4. 发布检查单（部署前 / 部署后）

### 4.1 部署前（全部勾选才可请求批准）

- [ ] 分支正确，`git diff main...HEAD --stat` 已逐项检查；无写范围外文件。
- [ ] 无密钥/凭据/upload preset 新增；`git grep -nE 'api[_-]?key|secret|token|upload_preset|PRIVATE KEY'` 无新增命中。
- [ ] 未改 Publisher ID / 广告 / 统计代码（除维护者批准的专项）。
- [ ] 新增/变更的顶层内部目录已加入 `.vercelignore`，且 Preview 上内部路径 404、关键资源 200。
- [ ] 本变更涉及的 `L-*` 检测命令已在 Preview 运行并记录（改了什么就验什么）。
- [ ] 专项矩阵通过：
  - 重定向：全量 `?lang=` / 尾斜杠 / `/public/tools/` / http→https / apex→www（见 L-05）；
  - 404：不存在 URL 返回 404 且无广告/无 JS 跳转；`/404/` noindex；`/test-section/` 404（见 L-04）；
  - 安全头：XCTO/XFO/Referrer-Policy/Permissions-Policy/CSP-Report-Only 出现（见 ADR-0001 D2）；
  - 默认域：`mecollage.vercel.app` noindex 或 301（见 L-13）；
  - 关键资产：`/ads.txt`、`/sitemap.xml`、`/robots.txt`、`/i18n/zh.json`、`/assets/js/mecollage-main.js` 仍 200。
  - **UI/交互（H11，2026-11-06 起，R0/R1 交互改造后成为强制项）**：`node scripts/design-audit/run-token-audit.mjs` 无 FAIL（token + **JS 运行时裸色** + 文档一致性）；`node scripts/design-audit/check-layout.mjs` 无 FAIL（320/360/390 横向溢出、固定壁纸层、触控目标 ≥44px、禁止 `alert()`、首屏 HTML 不预加载 AI 库）；`node scripts/functional-audit/run-tests.mjs` 0 FAIL；**用户可见行为变更必须同批更新 harness 断言并保留旧口径兼容期**（L-35）；**导出/截图类改动必须在页面已滚动状态下验收**（L-36）；390×844 移动端截图归档。详见 AGENTS H11、L-31~L-36、runbook §4.6。
- [ ] `scripts/verify-site.mjs` 结果无 FAIL（WARN 已逐条解释并接受）。
- [ ] 证据已归档，路径写入交付说明。
- [ ] 回滚方式已写明（revert 哪个 commit / 重部署哪个版本）。
- [ ] 维护者批准记录已附（消息/issue 链接/时间）。

### 4.2 部署后（生产验收，1 小时内完成）

- [ ] 生产部署成功（Vercel deployment status = success/success；无 5xx）。
- [ ] 对生产复跑 `scripts/verify-site.mjs`，无新增 FAIL。
- [ ] 关键 URL 抽查：首页、`/tools/square/`、`/zh/`、`/privacy/`、不存在 URL、`/404/`、`mecollage.vercel.app`。
- [ ] 响应头/重定向与 Preview 一致；若有 CDN 缓存差异（`cf-cache-status`）记录。
- [ ] 内部文件 404 矩阵通过；公开面未新增可下载内部文件。
- [ ] 生产验收证据归档；更新相关 `L-*` 状态。
- [ ] 如发现异常：立即进入 §5 回滚，而不是"边观察边修"。

## 5. 回滚原则

| 场景 | 首选动作 | 执行人 | 要求 |
|---|---|---|---|
| 代码/配置类回归 | `git revert <commit>` → push → 等自动部署 | 维护者（或授权） | 不改写历史；revert 后跑生产验收；记录 revert commit |
| 需要秒级止损 | Vercel Dashboard → Deployments → 上一版本 → Rollback/Promote | 维护者 | 仅临时；随后仍要 `git revert` 让仓库与生产一致 |
| 广告/统计/账户类问题 | 后台关闭对应功能/CMP/广告位 | 维护者 | 记录操作时间与截图；补教训 |
| 第三方上传/密钥类 | 第三方控制台关闭 preset/轮换密钥 | 维护者 | 先止损后删代码；不测试上传 |
| CDN 缓存导致旧内容 | Cloudflare Purge Cache（按 URL） | 维护者 | 记录 purge 范围与时间 |

回滚后必须：① 生产验收跑一遍；② 在 24 小时内写事故记录（发现时间/影响/根因/时间线/回滚动作）；③ 更新对应 `L-*` 为 `regressed` 或 `open`，并在变更记录写清复发版本。

禁止：用 `push --force` 回滚；删除部署历史；只回滚生产不修仓库；回滚后不写记录。

## 6. 教训回灌机制

### 6.1 触发条件（任一命中即必须建/更新教训）

- 审计发现（P0/P1/P2 均记；P3 可合并）；
- 线上事故/回滚；
- Preview 验收失败（尤其是"本地正常、Preview 异常"）；
- 同一问题第二次出现（直接标 `regressed`）；
- 平台政策/第三方依赖变化（AdSense 政策、Cloudflare/Vercel 行为、许可证）；
- 评审/维护者指出流程漏洞。

### 6.2 编号与格式

- 编号：`L-YYYYMMDD-NN`；日期 = 发现日（Asia/Shanghai）；`NN` 当日从 `01` 递增；**永不复用、永不删除**。
- 文件：`docs/lessons/L-YYYYMMDD-NN-<kebab-slug>.md`；模板见 [`docs/lessons/TEMPLATE.md`](docs/lessons/TEMPLATE.md)。
- 同步更新 [`docs/lessons/README.md`](docs/lessons/README.md) 索引表（同一变更内）。
- 必填：症状、影响、根因、规则（必须/禁止）、检测方法、反例、关联证据、状态、后续动作。
- 时间要求：新教训在同一会话/同一 PR 内回灌；无写权限时必须在交付说明中报告"待分配编号"；事故类 48 小时内、审计类 5 个工作日内。

### 6.3 状态机

```
open ──(有证据的缓解)──> mitigated ──(根因消除+检测通过)──> closed
  ↑                           │
  └──────── regressed ←───────┘  (复发；保留历史，重新处理)
```

- `open`：已记录未处理/未验证。
- `mitigated`：已部署缓解/已修正方法，有证据，但根因未证明消除。
- `closed`：根因消除 + 检测命令通过 + 证据归档；需维护者确认。
- `regressed`：曾 mitigated/closed 后复发；写清复发版本/日期/证据，然后按 open 流程处理。

### 6.4 复核节奏与负责人

| 时点 | 动作 | 负责人 |
|---|---|---|
| 每次生产发布前 | 扫一遍 `open`/`regressed`；确认本次变更不重复踩坑 | 实施者，维护者抽查 |
| 每月第一个工作周 | 全量复核：状态、证据时效、检测命令是否仍可执行 | 维护者 + 实施者 |
| 每次审计后 | 把发现映射到已有/新教训；更新优先级 | 审计者 + 维护者 |
| 每次事故/回滚后 | 48h 内新增/更新教训并复盘 | 实施者，维护者确认 |

## 7. 证据标准（没有证据 = 没做）

### 7.1 每条结论必须包含

| 字段 | 要求 |
|---|---|
| 证据层 | `[代码层]` / `[线上层]` / `[平台层]`；跨层分别给证据 |
| 复现方式 | 可直接复制的命令（含 URL/header/参数）或截图/日志路径 |
| 输出 | 原始关键输出（状态码、header、渲染片段、CSV/JSON），不要只写摘要 |
| 时间与环境 | 取证时间（含时区）、环境（local/Preview/生产）、工具与版本 |
| 定位 | `file:line` 或 URL/响应头 |
| 确定性 | `[事实]` / `[推断]`（附依据与验证方式）/ `[不确定]`（说明需要什么才能确认） |

### 7.2 反例与正例

| ❌ 不合格 | ✅ 合格 |
|---|---|
| "安全头已加" | `curl -sI https://... \| grep -i x-frame-options` → `x-frame-options: SAMEORIGIN`（生产，2026-11-05 10:12 +08:00） |
| "多语言正常" | 静态 curl + headless 渲染后 `lang` 对比；引用渲染快照路径 |
| "没有统计代码" | 代码层 grep 0 命中 + 默认 curl 0 + `Accept: text/html` 1（平台注入）+ Dashboard 待确认 |
| "已删除死文件" | `curl -o /dev/null -w '%{http_code}' /assets/js/index-...` → 404（Preview/生产） |

### 7.3 存储与保留

- 原始证据：`audit/evidence/<主题>/`（本机审计产物可能未入库；入库时在交付说明标注 commit/路径）。
- 文档中引用证据用相对路径 + 时间；禁止只写"我验证过了"。
- 证据不得包含密钥/完整凭据；截图遮蔽敏感信息。
- 删除/覆盖证据前需维护者同意。

## 8. 不可逆 / 账户级操作清单（仅维护者）

以下操作**必须维护者明确批准并执行**，AI 只能给方案与检查命令：

1. 生产部署 / promote / rollback / 删除部署。
2. merge 到 `main`、`git revert` 生产提交、任何 git 历史改写。
3. Vercel 项目设置：域名、Deployment Protection、Git 集成、构建设置、环境变量。
4. Cloudflare：DNS 记录、代理开关、缓存规则/Purge、Web Analytics、WAF/规则。
5. AdSense：Publisher ID、站点验证、广告位、Auto ads、CMP、政策中心操作。
6. GA4 / GTM / 其他统计：创建媒体资源、改跟踪代码、开启数据共享。
7. Cloudinary：账户、upload preset（尤其 unsigned）、API key、配额。
8. GitHub：仓库可见性、Pages 设置、homepage、分支/标签删除、协作者权限。
9. 删除/移动被跟踪文件、改 URL 结构、改 `.vercelignore` 导致公开面变化。
10. 密钥/令牌轮换、删除审计证据或历史记录。

## 9. 例外、冲突与升级

- **范围冲突**：任务说明与治理文档冲突 → 先停下，报告 Lead/维护者；由维护者书面裁决并记录。
- **时间压力**：不得以赶进度为由跳过证据/审批；只能由维护者把 C3 降为 C4。
- **发现严重问题但不在写范围**（如密钥、账户违规）：立即报告，不自行修复；给出只读取证与建议。
- **并行会话**：共享工作区，多个会话可能同时改文件；只改分配范围，发现冲突（FS_STALE_VERSION/文件被改）时先读最新内容再重做，必要时报告 Lead 协调。
- **升级路径**：实施者 → Lead → 维护者。

## 10. 附录：最小命令集

```bash
cd /Users/keyi/mecollage
git rev-parse HEAD && git branch --show-current && git status --short
# 生产基线（只读）
curl -sI https://www.mecollage.top/ | head -20
node scripts/verify-site.mjs --base https://www.mecollage.top/   # Phase A 起可用
# Preview（见 docs/runbooks/preview-deploy.md）
node scripts/verify-site.mjs --base "$PREVIEW_URL"
```

> 本文件与 `AGENTS.md`、`docs/lessons/` 一起构成治理基线；任何修改都要走 C1 流程并保留 diff 证据。
