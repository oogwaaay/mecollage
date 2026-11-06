# Runbook — Preview 部署、验收与生产上线/回滚

> 适用：MeCollage 静态站（Vercel + Cloudflare）的任何生产变更。
> 角色：实施者（AI/开发者）执行 1–5；**维护者执行生产发布与账户级操作**（6–7）。
> 关联：[`AGENTS.md`](../../AGENTS.md)、[`GOVERNANCE.md`](../../GOVERNANCE.md)、[ADR-0001](../decisions/ADR-0001-phase-a-security-hardening.md)、[L-20261105-12](../lessons/L-20261105-12-preview-before-production.md)。
> 本机基线（2026-11-05 实测）：Node `v24.19.0`、`gh` `2.101.0`（已登录 `oogwaaay`，scope `repo`）、仓库 `/Users/keyi/mecollage`、生产域 `https://www.mecollage.top/`。

## 0. 本页回答什么

1. 如何从 feature 分支得到 Vercel Preview URL。
2. Preview 被 Vercel Authentication 挡住时怎么办（实测会发生）。
3. 如何用 `scripts/verify-site.mjs` 验收、如何看退出码、证据存哪。
4. 生产上线前/后的检查单，以及回滚的两种方式。

---

## 1. 关键事实（先读，避免踩坑）

| 事实 | 证据（2026-11-05） |
|---|---|
| Vercel Git 集成**已存在** | GitHub Deployments 有 `vercel[bot]` 创建的记录，`environment=Preview`，sha 与分支 HEAD 对齐：`gh api repos/oogwaaay/mecollage/deployments` |
| Vercel 的 deployment 记录中 **`ref` 是完整 commit sha，不是分支名** | `deployments?ref=main` 只返回旧的 `github-pages` 部署；用 `?sha=$(git rev-parse HEAD)` 才能查到本次部署 |
| Preview URL 受 **Vercel Authentication** 保护 | 未认证 `curl -sI <preview-url>` → `HTTP/2 302`、`location: https://vercel.com/sso-api?...`（"Protected by Vercel Authentication"） |
| 验收脚本会识别认证阻断 | `scripts/verify-site.mjs` 遇到 302→SSO / 401 时判为 **BLOCKED**，退出码 **2**，不伪造 PASS/FAIL |
| 生产发布触发方式 | **2026-11-05 实测：main push 只产生 Preview（GitHub Deployment environment=Preview），生产不会自动更新；生产为手动**：维护者登录后 `npx vercel deploy --prod --yes`（或 Dashboard Promote/Deploy）。Phase A 已按此上线并验收 PASS 41/0/2（见 L-20261105-18） |
| 本机无 Vercel CLI | `vercel` command not found；本机也没有 `VERCEL_AUTOMATION_BYPASS_SECRET` |

> 结论：**拿不到 Preview 访问权就无法完成验收；未完成验收不得请求生产批准。**

---

## 2. 从分支获得 Preview

### 2.1 前置检查

```bash
cd /Users/keyi/mecollage
git status --short          # 只应有本任务范围内的改动；未跟踪文件要说明
git branch --show-current   # 不得是 main
git rev-parse HEAD          # 记下基线 sha
```

### 2.2 推送分支

```bash
git push -u origin "$(git branch --show-current)"
```

> 只推分支；**不要** merge 到 main、不要 `vercel --prod`。Vercel Git 集成会在推送后自动创建 Preview（实测约 1 分钟内）。

### 2.3 找到本次 Preview deployment

```bash
cd /Users/keyi/mecollage
SHA=$(git rev-parse HEAD)
echo "HEAD=$SHA"
gh api "repos/oogwaaay/mecollage/deployments?sha=$SHA&per_page=5" \
  --jq '.[] | [.id, .environment, .sha[0:7], .created_at, (.production_environment|tostring)] | @tsv'
```

期望输出形如（2026-11-05 实例）：

```
7570103062    Preview    b2a3924    2026-11-05T09:36:33Z    false
```

> 如果为空：先确认推送成功（`git ls-remote --heads origin` 有该分支且 sha 一致）；再试不带过滤的 `gh api repos/oogwaaay/mecollage/deployments?per_page=5`。仍为空 → Git 集成/权限问题，找维护者看 Vercel Dashboard，**不要**自己改用 `vercel` CLI 部署。

### 2.4 取 status 与 Preview URL

```bash
DEPLOY_ID=7570103062   # 换成上一步的 id
gh api "repos/oogwaaay/mecollage/deployments/$DEPLOY_ID/statuses" \
  --jq '.[0] | {state, environment_url, target_url, description, created_at}'
```

- `state` 需为 `success`（`queued`/`in_progress` 时等待重试；`failure`/`error` 时看 Vercel 构建日志，静态站通常不会有构建失败，多为配置/ignore 错误）。
- `environment_url` 就是 Preview 站点根地址（Vercel 给的 `https://mecollage-<hash>-<team>.vercel.app`）。

等待循环（可选）：

```bash
for i in $(seq 1 30); do
  STATUS=$(gh api "repos/oogwaaay/mecollage/deployments/$DEPLOY_ID/statuses" --jq '.[0].state // "none"')
  echo "[$i] $STATUS"
  [ "$STATUS" = "success" ] && break
  [ "$STATUS" = "failure" ] || [ "$STATUS" = "error" ] && break
  sleep 10
done
gh api "repos/oogwaaay/mecollage/deployments/$DEPLOY_ID/statuses" --jq '.[0].environment_url'
```

### 2.5 检查 Preview 是否可访问（会失败，属预期）

```bash
PREVIEW_URL="$(gh api "repos/oogwaaay/mecollage/deployments/$DEPLOY_ID/statuses" --jq '.[0].environment_url')"
curl -sI "$PREVIEW_URL/" | head -6
```

若看到 `302 → https://vercel.com/sso-api?...`，进入 §3；若直接 200，跳到 §4。

---

## 3. Preview 被 Vercel Authentication 保护时的三种验收方式

> 实测（2026-11-05）：**未认证**访问所有 Preview URL 均 302 到 Vercel SSO。**已用下方「方式 D」完成一次完整验收（38 PASS / 0 FAIL / 5 WARN）**；脚本本身不处理认证，bypass 由 `vercel curl` 在请求层完成。禁止把 bypass secret/JWT 写进仓库/脚本/报告/命令行历史。

### 方式 A（推荐）：Protection Bypass for Automation

1. 维护者：Vercel Dashboard → 项目 `mecollage` → Settings → **Deployment Protection** → **Protection Bypass for Automation** → 生成/查看 secret（只需一次）。
2. 维护者把 secret 通过安全渠道给实施者（会话/密码管理器），**不要**贴在仓库或公开消息里。
3. 验收时用环境变量（脚本已支持，值不会写入报告；`--header` 传入的值在证据里会被脱敏）：

```bash
export VERCEL_AUTOMATION_BYPASS_SECRET='<secret>'   # 仅当前 shell，结束 unset
node scripts/verify-site.mjs --base "$PREVIEW_URL" \
  --label preview \
  --json "audit/evidence/phase-a/verification/preview-$(git rev-parse --short HEAD).json" \
  --md   "audit/evidence/phase-a/verification/preview-$(git rev-parse --short HEAD).md"
unset VERCEL_AUTOMATION_BYPASS_SECRET
```

> 等价写法：`--header "x-vercel-protection-bypass: <secret>"`（注意：会存在于 shell history，优先用 env）。

### 方式 B：维护者用已登录 Vercel 的浏览器/CLI 代跑

- 维护者在浏览器打开 `environment_url`，按 §5.2 手工矩阵截图/记录；或用其本机已登录的 `vercel curl <deployment-url>` 执行 §5.2 的命令，把原始输出回传。
- 证据由实施者整理进 `audit/evidence/phase-a/verification/`，并标注"由维护者代跑、时间、方式"。

### 方式 D（2026-11-05 实测可行，本项目推荐）：`vercel login` + `vercel curl` 自动 bypass

无需人工查看/传递 secret：

```bash
cd /Users/keyi/mecollage
npx vercel login   # 维护者本人交互式登录（浏览器/GitHub/邮箱）
PREVIEW_URL="https://<deployment>.vercel.app"

# 1) 换取 7 天有效的 _vercel_jwt cookie（CLI 自动加 x-vercel-protection-bypass）
npx vercel curl / -H "x-vercel-set-bypass-cookie: true" -D /tmp/pv-h.txt -o /dev/null --deployment "$PREVIEW_URL"
COOKIE=$(grep -i '^set-cookie:' /tmp/pv-h.txt | head -1 | sed 's/^[Ss]et-[Cc]ookie: //' | cut -d';' -f1 | tr -d '\r')

# 2) 用 cookie 跑完整矩阵（--header 值在证据中脱敏）
node scripts/verify-site.mjs --base "$PREVIEW_URL/" --label preview \
  --header "Cookie: $COOKIE" \
  --json audit/evidence/phase-a/verification/preview.json \
  --md audit/evidence/phase-a/verification/preview.md
rm -f /tmp/pv-h.txt
```

- 注意：`vercel curl` 首次使用可能自动生成一个项目级 bypass secret；验收后可在 Dashboard 复核/撤销。
- `npx vercel logout` 可清理本机登录态（按需）。

### 方式 C（不推荐）：临时放宽 Preview 保护

- 维护者在 Deployment Protection 临时调整为可公开访问 → 立即跑验收 → **验收后立刻恢复原设置**。
- 风险：窗口期内站点可被外部访问；必须记录起止时间与恢复确认。

> 四种方式都不行 → 验收 **BLOCKED**，退出码 2；在交付说明中写"Preview 验收未完成（认证阻断）"，不得请求生产批准。

---

## 4. 运行验收脚本

### 4.1 基本用法

```bash
cd /Users/keyi/mecollage
node scripts/verify-site.mjs --base "<URL>" [--label ...] [--json ...] [--md ...] [--header "K: V"]
```

- Node ≥ 20（本机 v24.19.0）；零第三方依赖。
- 脚本手动跟随重定向（最多 10 跳），检查：关键页面、5 项安全头、重定向矩阵、404 页、软 404、遗留文件暴露、关键资产回归、默认域 noindex。
- 跨主机检查（http→https、apex→www、默认域）只在 base 为生产域时参与判定；Preview 下标记 N/A。

### 4.2 退出码（先看这个）

| 退出码 | 含义 | 处理 |
|---|---|---|
| `0` | 无 FAIL（WARN 允许） | 可进入证据归档与批准流程；WARN 逐条解释 |
| `1` | 存在 FAIL | 修复后重新部署 Preview 再跑；**不得**带 FAIL 合并 |
| `2` | 无法判定：参数错、站点不可达、Preview 认证阻断（BLOCKED）、输出写入失败 | 先解决访问/参数问题；认证阻断见 §3 |

### 4.3 证据归档（命名固定）

```bash
cd /Users/keyi/mecollage
SHA=$(git rev-parse --short HEAD)
STAMP=$(date '+%Y%m%dT%H%M%S%z')
mkdir -p audit/evidence/phase-a/verification
node scripts/verify-site.mjs --base "$PREVIEW_URL" --label preview \
  --json "audit/evidence/phase-a/verification/preview-${SHA}-${STAMP}.json" \
  --md   "audit/evidence/phase-a/verification/preview-${SHA}-${STAMP}.md"
```

> 注意：`audit/evidence/` 已在 `.gitignore` 中（本机大证据不入库）；若需要入库，按维护者要求另存摘要（含命令、时间、sha、PASS/FAIL 汇总）。

### 4.4 生产基线（Phase A 前）预期

2026-11-05 对**当前生产**跑脚本的基线：`PASS=22 / FAIL=21 / WARN=0`，退出码 1。这些 FAIL 正是 Phase A 要修的项（安全头缺失、`?lang=` 循环/query 残留、404 广告/跳转、遗留文件 200、默认域无 noindex），**不是回归**。Phase A 部署后生产验收应全部消除（`/404` 与 `/404/` 的 200 状态记为 WARN，可接受）。

**2026-11-05 Phase A 上线后实测**：`PASS=41 / FAIL=0 / WARN=2`，退出码 0；6 项安全头下发、5 条 `?lang=` 单跳无循环、404/遗留文件/默认域 noindex 全部符合预期。证据 `audit/evidence/phase-a/verification/post-release-prod.{json,md}`。

### 4.5 手工抽查（脚本之外，最少 3 个）

```bash
BASE="$PREVIEW_URL"   # 或生产
curl -s -o /tmp/404.html -w 'notfound=%{http_code}\n' "$BASE/governance-probe-does-not-exist/"
grep -cE 'adsbygoogle|pagead2|location\.replace' /tmp/404.html   # 期望 0
curl -sI "$BASE/" | grep -iE '^(x-content-type-options|x-frame-options|referrer-policy|permissions-policy|content-security-policy-report-only)'
curl -sI "$BASE/404/" | grep -i x-robots-tag
```

### 4.6 UI / 交互专项矩阵（H11 六道门禁；R0/R1 起，R2 扩为六道，2026-11-06）

移动端 / 交互 / 编辑器类变更，除 §4.1–4.5 外必须在本地补跑以下命令（离线、需本机 Chrome；不联网）：

| 命令 | 覆盖 | PASS 判据 |
|---|---|---|
| `node scripts/design-audit/run-token-audit.mjs` | token 外颜色/字号/圆角/内联样式 + **JS 运行时裸色**（style 赋值/对象字面量/cssText）+ `DESIGN-TOKENS.md` 一致性 | exit 0；JS 违规不得高于基线；新增文件 0 违规 |
| `node scripts/design-audit/check-layout.mjs` | 95 页 390 全量 + 代表页 1440/360/320：横向溢出、固定壁纸、触控 ≥44px、`alert()`、首屏 AI 库预加载 | exit 0（触控默认 WARN，`--strict-touch` 升级 FAIL；A/B/D/E 出现 FAIL 即阻断） |
| `node scripts/functional-audit/run-tests.mjs` | 浏览器回归；**行为变更后的断言口径**（L-35） | 0 FAIL |
| `node scripts/functional-audit/run-mobile-touch.mjs` | 390×844 触摸模拟：导航开合/语言抽屉/触控拖拽/**滚动后导出**/触控目标；**交互后/打开态**断言（L-38） | exit 0（6 用例 MT-01~06；FAIL 即阻断；需本机 Chrome + fixtures） |
| `node scripts/design-audit/check-performance.mjs` | 性能预算：静态 gzip 体积 + 390×844 渲染结构（DOM/深度/backdrop/样式表/脚本）；`--bench` 仅参考（L-37） | exit 0；超预算 FAIL、>90% WARN |
| `node scripts/seo-audit/run-seo-checks.mjs` | 多语言/head/内链；R1 只做视觉重排也必须跑（DOM/文本顺序不变） | 0 FAIL |

```bash
cd /Users/keyi/mecollage
SHA=$(git rev-parse --short HEAD)
mkdir -p audit/design-migration/verify
node scripts/design-audit/run-token-audit.mjs --report-all \
  --json audit/design-migration/verify/token-${SHA}.json \
  --md   audit/design-migration/verify/token-${SHA}.md
node scripts/design-audit/check-layout.mjs --full \
  --json audit/design-migration/verify/layout-${SHA}.json \
  --md   audit/design-migration/verify/layout-${SHA}.md
node scripts/functional-audit/run-tests.mjs
node scripts/functional-audit/run-mobile-touch.mjs \
  --json audit/design-migration/verify/mobile-touch-${SHA}.json \
  --md   audit/design-migration/verify/mobile-touch-${SHA}.md
node scripts/design-audit/check-performance.mjs \
  --json audit/design-migration/verify/perf-${SHA}.json \
  --md   audit/design-migration/verify/perf-${SHA}.md
node scripts/seo-audit/run-seo-checks.mjs
```

- `check-layout --full` 为四宽度（1440/390/360/320）× 95 页全量矩阵（慢），**发布前至少跑一次**并归档；日常改动可用默认（390 全量 + 代表页其余宽度）。
- `check-layout` 需要本机 Chrome 且会阻断外部网络；若本机无 Chrome，记录为"环境不可用"并列入 Preview 人工抽查，不得口头宣布通过。
- **交互后才出现 / 打开态才可见的状态**（上传后工具栏、导航/语言抽屉、toast 等）必须用 `run-mobile-touch.mjs` 在交互后断言；`check-layout` 是静态首屏扫描，**不能替代**（L-38）。触控目标发布前用 `check-layout --strict-touch` 复核。`run-mobile-touch` 首次需 `python3 scripts/functional-audit/make-fixtures.py`，且滚动导出用例需要 cdnjs（html2canvas，与生产一致）；离线缺网时该用例 WARN 并写入限制。
- **性能判据**：`check-performance.mjs` 是发布门槛；`--bench` 的 headless FPS 仅参考，**不得**据此做无证据的 blur/视觉降级，真机 profiling 用 DevTools（L-37）。
- **用户可见行为变更**（alert→toast、导出状态、拖拽、aria 文案等）必须同批更新 `scripts/functional-audit/run-tests.mjs` 断言并保留旧口径兼容期（L-35），否则会出现假 FAIL/假 PASS。
- **导出/截图类改动必须在“页面已滚动”状态下验收**（L-36）：手动测试先上传触发自动滚动（`scrollY≈300–600`）再导出，确认产物非白且与预览一致；functional 的 IDX-14/15/16 已在滚动后比较导出像素 hash，额外要求 hash ≠ 纯白（当前 1200×1200 纯白 FNV hash `d2b3285`）。html2canvas 的 wrapper 若为 `position:fixed;left:0;top:0`，options 必须显式 `scrollX:0, scrollY:0`（其余渲染参数不动）；**不要**用关闭 `foreignObjectRendering` 或 `scrollTo(0,0)` 绕过。
- 移动端改动附 **390×844 截图**（首页/工具页/编辑器）与 `check-layout` JSON 证据；`audit/design-migration/verify/` 已被 `.gitignore` 排除（本机证据，不入库）。

---

## 5. 生产上线检查单

### 5.1 上线前（实施者准备，维护者确认）

- [ ] Preview 验收退出码 `0`（或 FAIL 已逐项解释并被维护者接受）；证据路径已写进交付说明。
- [ ] 手工抽查 3 项通过（§4.5）；`?lang=` 全量矩阵通过（脚本 c 组）。
- [ ] 部署面双矩阵通过：内部文件全 404 + 关键资产全 200。
- [ ] UI/交互变更：token 审计（含 JS 运行时）+ `check-layout` + functional/seo harness 均 0 FAIL；390×844 截图与 check-layout JSON 已归档（§4.6，AGENTS H11）。
- [ ] ADR/教训状态已更新；本次变更没有重复已知教训。
- [ ] 回滚方式已写明：revert 哪个 commit；Preview 上一版本 reference。
- [ ] **维护者明确批准**（消息/issue 链接 + 时间）；生产执行人已确定。
- [ ] 生产发布方式确认（见 §1 与 §5.2；本项目为手动 CLI/Dashboard，不要假设 main push 自动上线）。

### 5.2 上线中（维护者执行）

- **方式一（本项目不可用）**：merge 到 `main` 只产生 Preview，不会自动生产部署（2026-11-05 实测，见 L-20261105-18）。
- **方式二（本项目已验证）**：维护者登录 Vercel CLI 后 `npx vercel deploy --prod --yes`（Aliased 到 `www.mecollage.top`）；或 Vercel Dashboard 把已验证的 Preview **Promote to Production**。
- 记录：操作人、时间、目标 sha、部署 ID、任何 Dashboard 操作（域名 301、保护设置等）。

### 5.3 上线后（1 小时内）

```bash
cd /Users/keyi/mecollage
SHA=$(git rev-parse --short HEAD)
STAMP=$(date '+%Y%m%dT%H%M%S%z')
node scripts/verify-site.mjs --base https://www.mecollage.top/ --label production \
  --json "audit/evidence/phase-a/verification/production-${SHA}-${STAMP}.json" \
  --md   "audit/evidence/phase-a/verification/production-${SHA}-${STAMP}.md"
echo "exit=$?"
```

- [ ] 退出码 `0`（`/404`、`/404/` 软 404 WARN 可接受并记录）。Phase A 实测：41 PASS / 0 FAIL / 2 WARN。
- [ ] 默认域检查（生产模式才判定）：`curl -sI https://mecollage.vercel.app/ | grep -i x-robots-tag` → 含 `noindex`（或 301 到主域）。
- [ ] 关键页/工具页/语言页 200；`?lang=` 单跳且最终 URL 干净。
- [ ] 内部文件 404 矩阵通过；`/ads.txt`、`/sitemap.xml`、`/robots.txt`、`/i18n/zh.json` 200。
- [ ] 生产证据归档；更新 `L-*` 状态（如 L-04/L-05/L-06/L-12/L-13/L-14 的 mitigated/closed 条件）。
- [ ] 观察 24h（Vercel 部署错误、Cloudflare 5xx、搜索控制台无明显异常）；异常 → §6。

### 5.4 平台侧人工操作（维护者，需记录）

| 操作 | 位置 | 记录要求 |
|---|---|---|
| 默认域 301 → 主域 | Vercel Dashboard → Domains | 时间 + 截图 + 验证 `curl -I` |
| Cloudflare Web Analytics 确认 | Cloudflare Dashboard → Analytics | 是否启用 + 截图 |
| Cloudinary unsigned preset 关闭 | Cloudinary Console → Upload presets | 时间 + 结果（见 L-03） |
| AdSense ID 归属/账户 | AdSense 后台 | 结论（见 L-10） |

---

## 6. 回滚

### 6.1 回滚触发条件

- 生产验收出现新的 FAIL（尤其是 5xx、重定向循环、404/安全头回归）；
- 页面功能明显损坏（工具/AI/导出/多语言异常）；
- 广告/统计数据/账户违规风险；
- 维护者判断收益 < 风险。

### 6.2 方式一（首选）：revert 提交

```bash
cd /Users/keyi/mecollage
git log --oneline -5
git revert <bad-commit-sha>        # 生成一个新提交，不改写历史
git push origin main               # 由维护者执行/授权
```

- 等自动部署完成 → 跑 §5.3 生产验收 → 记录 revert commit 与部署 ID。
- 若 revert 产生冲突：停下，交维护者处理；**不要** `reset --hard` / force push。

### 6.3 方式二（秒级止损）：Vercel Dashboard 回滚

1. 维护者：Vercel → Project `mecollage` → Deployments → 找到上一个已知良好部署 → **Promote/Rollback**。
2. 立即 `curl -sI` 关键页 + 跑 `scripts/verify-site.mjs --base https://www.mecollage.top/ --label rollback` 验证。
3. **随后仍要** `git revert` 让仓库与生产一致（Dashboard 回滚不改变 git）。

### 6.4 回滚后必做

- [ ] 生产验收通过；证据归档。
- [ ] 24h 内写事故记录：发现时间、影响范围、时间线、根因、回滚动作、数据/账户影响。
- [ ] 更新相关 `L-*`：复发 → `regressed`；新根因 → 新建条目。
- [ ] 在下次发布检查单中增加对应检测项。

---

## 7. 故障排查

| 现象 | 可能原因 | 处理 |
|---|---|---|
| push 后查不到 deployment | 未推送成功 / Git 集成未开启 / 查的是 `ref=main` | 核对 `git ls-remote`；用 `?sha=`；用不带过滤的 list；找维护者看 Vercel Dashboard |
| deployment `state=failure` | `.vercelignore` 排错、vercel.json 非法、Vercel 项目配置 | 看 deployment 详情/构建日志；修复后重新 push |
| Preview 302 → `vercel.com/sso-api` | Deployment Protection（Vercel Authentication） | §3 三种方式；脚本退出码 2 属预期 |
| 脚本退出码 2 但不是认证问题 | `--base` 带路径/查询、站点不可达、超时 | 只传根地址；`--timeout 30000`；先 `curl -I` 验证可达 |
| 验收 FAIL 但本地看起来正常 | 没带浏览器 header / 看的静态 HTML / Cloudflare 缓存 | 用脚本（含渲染无关的 header/重定向检查）；必要时加 `cf-cache-status` 判断 |
| 生产 header 与 Preview 不一致 | Cloudflare 边缘/缓存、Deployment Protection、Dashboard 覆盖 | 记录 `cf-cache-status`、x-vercel-id；必要时维护者 Purge Cache |
| 默认域 noindex 未生效 | host 条件未匹配 / Dashboard 301 未配 | 生产复验；回退 Dashboard/Cloudflare 规则并由维护者记录 |
| 回滚后仍异常 | Cloudflare 缓存 / 部署未完成 / 回滚目标不对 | 看 Vercel deployment 状态；Purge；再验证 |

---

## 8. 附录 A：脚本不可用时的最小手工矩阵

```bash
BASE="${1:?用法: ./manual-check.sh https://preview-or-prod/}"
FORCE='-H Accept:text/html'

echo '== 页面 =='
for p in / /about/ /tools/square/ /blog/ /privacy/ /zh/ /es/ /ja/ /tw/; do
  printf '%-18s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE$p")"
done

echo '== 安全头 =='
curl -sI "$BASE/" | grep -iE '^(x-content-type-options|x-frame-options|referrer-policy|permissions-policy|content-security-policy-report-only)'

echo '== 重定向 =='
for l in en zh es ja tw; do
  curl -s -o /dev/null --max-redirs 5 -L \
    -w "?lang=$l => %{http_code} hops=%{num_redirects} final=%{url_effective}\n" "$BASE/?lang=$l"
done

echo '== 404 =='
curl -s -o /tmp/404m.html -w 'status=%{http_code}\n' "$BASE/this-does-not-exist-xyz/"
grep -cE 'adsbygoogle|pagead2|location\.replace' /tmp/404m.html    # 0
grep -ci noindex /tmp/404m.html                                    # >=1
curl -sI "$BASE/404/" | grep -i x-robots-tag

echo '== 部署面 =='
for p in AGENTS.md GOVERNANCE.md docs/lessons/README.md scripts/verify-site.mjs \
         design-system.md 需求理解确认.txt .htaccess .nojekyll check_keys.js sync_keys.js \
         test-section/ assets/js/index-CurY6_0Y.js assets/js/index-CurY6_0Y.js.backup; do
  printf '%-45s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/$p")"
done

echo '== 关键资产 =='
for p in ads.txt sitemap.xml robots.txt i18n/zh.json assets/js/mecollage-main.js; do
  printf '%-35s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/$p")"
done
```

## 9. 附录 B：部署记录模板（写进交付说明/证据）

```
日期时间（+08:00）：
分支 / commit sha：
Preview deployment id / environment_url：
验收方式（A/B/C）：
verify-site 退出码 / PASS FAIL WARN：
手工抽查结果：
已知问题/残余风险：
生产批准记录（维护者 + 时间）：
生产部署 id / 方式：
生产验收结果：
回滚 commit（如有）：
关联 L-* / ADR：
```

> 本 runbook 与 `GOVERNANCE.md` §4/§5 同步维护；流程若有变化，先改文档再改操作。
