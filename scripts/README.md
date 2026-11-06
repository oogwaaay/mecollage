# scripts/ — MeCollage 验收与迁移脚本

> 目录索引：`verify-site.mjs`（部署验收，本文档）· [`functional-audit/`](functional-audit/README.md)（浏览器功能回归 + 移动触摸回归：`run-tests.mjs` / `run-mobile-touch.mjs`）· [`seo-audit/`](seo-audit/README.md)（多语言/SEO）· [`design-audit/`](design-audit/README.md)（Design Token 审计 + 布局/交互门禁 + 性能预算：`run-token-audit.mjs` / `check-layout.mjs` / `check-performance.mjs`）· [`design-system/`](design-system/README.md)（存量页面统一迁移与 UI 注入）

# verify-site.mjs — 部署验收脚本

> Phase A（安全止血）起引入的**可重复执行部署验收基线**，供 Vercel Preview 与生产共用。
> 当前版本：`verify-site.mjs` v1.1.0（2026-11-05）
> 关联：`AGENTS.md` H7（证据标准）、`docs/runbooks/preview-deploy.md`、`audit/evidence/phase-a/verification/`

## 1. 是什么

`scripts/verify-site.mjs`：Node.js 零依赖（内置 `fetch`）的站点验收脚本。

- 对任意 base（生产 / Vercel Preview / 本地静态服务器）跑同一套检查矩阵 a–h；
- **手动跟随重定向**（`redirect: 'manual'`，最多 10 跳，记录完整跳转链），可检测循环、多跳、`?lang=` query 残留；
- 输出 PASS / FAIL / WARN 与逐项证据（状态码、响应头、跳转链、字节数、页面标记等）；
- 可落盘 JSON（机器可读）与 Markdown（人工评审），FAIL > 0 退出码 1；
- 网络错误 / 超时（默认 10s）容错为 WARN，不崩溃；
- Preview 被 Vercel Deployment Protection 保护时判定为 **BLOCKED**（不是几十条 FAIL），退出码 2，并提示 maintainer 提供 bypass secret 或代跑。

运行时要求：**Node.js ≥ 20**（本机验证 Node v24.19.0；无 npm 依赖，无需 `npm install`）。

## 2. 快速使用

```bash
# 生产（当前基线，Phase A 尚未上线 → 预期 FAIL，见 §7）
node scripts/verify-site.mjs --base https://www.mecollage.top/

# 保存证据
node scripts/verify-site.mjs --base https://www.mecollage.top/ --label baseline \
  --json audit/evidence/phase-a/verification/baseline.json \
  --md  audit/evidence/phase-a/verification/baseline.md

# Vercel Preview（未受 Protection 保护，或已提供 bypass secret）
VERCEL_AUTOMATION_BYPASS_SECRET='<secret>' \
  node scripts/verify-site.mjs --base "https://mecollage-<hash>-keeey-is-projects.vercel.app/" \
  --label preview --json audit/evidence/phase-a/verification/preview.json \
  --md  audit/evidence/phase-a/verification/preview.md
```

### 参数

| 参数 | 必需 | 说明 |
|---|---|---|
| `--base <URL>` | 是 | 站点根地址（`http/https`，不带路径/查询/锚点） |
| `--json <path>` | 否 | 结构化结果落盘（自动 `mkdir -p`） |
| `--md <path>` | 否 | Markdown 报告落盘（自动 `mkdir -p`） |
| `--label <name>` | 否 | 报告标签，如 `baseline` / `post-branch-prod` / `preview`；默认取运行模式 |
| `--timeout <ms>` | 否 | 单请求超时，默认 `10000`，允许 `1000–30000` |
| `--header "Key: Value"` | 否 | 追加/覆盖请求头，**可重复**；用于 `x-vercel-protection-bypass` 等 |
| `-h, --help` | 否 | 帮助 |

### 环境变量

| 变量 | 作用 |
|---|---|
| `VERCEL_AUTOMATION_BYPASS_SECRET` | 存在且非空时自动追加 `x-vercel-protection-bypass: <secret>` 请求头（等价于 `--header`）。**值不会写入 JSON/MD/命令行**（命令行中的 `--header` 值统一脱敏为 `***`）。 |

> 安全约定：secret 只随 HTTP 头发送给 Vercel；脚本证据中仅记录**请求头名称**（如 `x-vercel-protection-bypass`）与 `bypassSource`（`env`/`flag`）。不要把 secret 贴进公开 issue/聊天记录。

## 3. 退出码与判定

| 退出码 | 判定 | 含义 |
|---|---|---|
| `0` | `PASS` | 无 FAIL（允许 WARN：如软 404 状态记录、跨主机 N/A） |
| `1` | `FAIL` | 存在 FAIL（Phase A 未达标 / 线上回归） |
| `2` | `BLOCKED` / `INCONCLUSIVE` / 参数错误 | `BLOCKED`：Preview 受 Vercel Deployment Protection 保护，**未产生 PASS/FAIL**；`INCONCLUSIVE`：目标不可达；另有参数错误、输出写入失败 |

- `BLOCKED` 与 `INCONCLUSIVE` 都会**跳过检查矩阵**，只输出 1 条说明项，避免几十条虚假 FAIL/WARN。
- WARN 不影响退出码；FAIL 明细与 WARN 明细分列在 Markdown 报告中。

## 4. 检查矩阵（对应 Phase A-3 任务 a–h）

| 分类 | 检查 | PASS 条件 |
|---|---|---|
| a) 关键页面 | `/`、`/about/`、`/tools/square/`、`/blog/`、`/privacy/`、`/zh/`、`/es/`、`/ja/`、`/tw/` | 最终状态 200（最终路径、HTML content-type 不匹配仅 WARN） |
| b) 安全响应头 | 首页 `/` 与工具页 `/tools/square/` | 六项头全部存在且取值合格：`strict-transport-security`（含 `max-age=`）、`x-content-type-options: nosniff`、`x-frame-options`（`DENY`/`SAMEORIGIN`）、`referrer-policy`、`permissions-policy`、`content-security-policy-report-only` |
| c) 重定向 | `/?lang=zh|es|ja|tw` → `/{lang}/`；`/?lang=en` → `/`；`/about` → `/about/`；`/public/tools/square/` → `/tools/square/` | 单跳、最终 200、最终 URL 不含 `?lang=`、无循环；`/about` 与 `/public/tools/square/` 单跳且最终 200 |
| c) 跨主机 | `http://mecollage.top/`、`https://mecollage.top/` | 最终 HTTPS + 主机 `www.mecollage.top` + 200（仅生产域参与判定，见 §5） |
| d) 404 页 | 随机 `/this-page-should-not-exist-<token>/` | 最终 404；响应体含 404 页标记（`data-404-page` / `"Page not found"` / `<title>` 或 `<h1>` 含 `404`，任一即可）；**不含** `pagead2`/`adsbygoogle`；**不含** `location.replace(`；含 noindex（`<meta name="robots">` 或 `X-Robots-Tag`） |
| e) 软 404 | `/404` 与 `/404/` | 状态码**只记录不判 FAIL**（Vercel 静态站通常 200，记 WARN）；noindex / 无广告脚本 / 无 `location.replace(` 为 FAIL 级 |
| f) 遗留文件 | `design-system.md`、`需求理解确认.txt`、`.htaccess`、`.nojekyll`、`check_keys.js`、`sync_keys.js`、`zh-tw.json`、`assets/js/index-CurY6_0Y.js`、`assets/js/index-CurY6_0Y.js.backup`、`/test-section/` | 最终 404（删除或 `.vercelignore` 排除）；200 → FAIL |
| g) 关键资产 | `/ads.txt`、`/sitemap.xml`、`/robots.txt`、`/assets/js/mecollage-main.js`、`/assets/js/i18n.js`、`/assets/index-vAuRGWiM.css`、`/assets/pages-C2UaL6ML.css`、`/wallImage.webp`、`/i18n/zh.json` | 最终 200；`ads.txt` 内容须与 `google.com, pub-9280689992387509, DIRECT, f08c47fec0942fa0` 一致（trim 后逐字节）；sitemap/robots/i18n 的轻量结构检查仅 WARN |
| h) 默认域 | `https://mecollage.vercel.app/` | 200 且 `X-Robots-Tag` 含 `noindex`（仅生产域参与判定） |

**404 页标记是 Phase A 实现约束**：新 `404.html` 至少包含 `data-404-page`、“Page not found”文案、`<title>` 含 404、`<h1>` 含 404 中的**任意一个**，否则 d) 判 FAIL（当前 Phase A 分支的 404 页四个全有）。noindex 接受 `<meta name="robots" content="…noindex…">` 或响应头 `X-Robots-Tag: noindex`。

**判定粒度**：每个检查项下有多条断言，任一条 FAIL 则该项 FAIL；仅 WARN 则项 WARN；全部 PASS 则项 PASS。汇总按**检查项**计数（WARN 计数为“项”，不是断言数）。

## 5. 跨主机检查规则（重要）

| base 主机 | 模式 | 跨主机检查（http→https、apex→www、默认域 X-Robots-Tag） |
|---|---|---|
| `www.mecollage.top` / `mecollage.top` / `mecollage.vercel.app` | `production` | **参与判定**（FAIL 级） |
| `mecollage-*.vercel.app`（Preview） | `preview` | 标 `N/A`（WARN，仅记录原始响应），不判 FAIL；需生产部署后复跑 |
| 其他域名 / localhost | `custom` | 同上，标 `N/A` |

原因：这些行为绑定生产域名（Cloudflare/Vercel 域级配置、host 级 headers），无法在一个 Preview 主机上验证。

## 6. Preview 被 Vercel Deployment Protection 保护时的验收方式（给 maintainer）

当前 Preview 部署（`phase-a/security-hardening` @ `b2a3924`）未认证访问会 `302 → https://vercel.com/sso-api…`。脚本判定 **BLOCKED** 并退出 2，不尝试绕过认证。三种可选做法：

### A. 提供 bypass secret（推荐，可自动化、证据完整）

1. maintainer 在 Vercel Dashboard → Project `mecollage` → Settings → **Deployment Protection** → **Protection Bypass for Automation** 创建 secret（仅维护者操作，AI 不做账户级操作）；
2. 在 agent 会话/本机安全地提供 secret（不要把 secret 写进仓库/公开消息），复跑：

```bash
# 方式 A1：环境变量（推荐，命令行不出现 secret）
VERCEL_AUTOMATION_BYPASS_SECRET='<secret>' \
  node scripts/verify-site.mjs \
  --base "https://mecollage-<hash>-keeey-is-projects.vercel.app/" \
  --label preview \
  --json audit/evidence/phase-a/verification/preview.json \
  --md  audit/evidence/phase-a/verification/preview.md

# 方式 A2：--header（证据中自动脱敏；注意 shell history）
node scripts/verify-site.mjs --base "<preview-url>" \
  --header "x-vercel-protection-bypass: <secret>" \
  --label preview --json ... --md ...
```

预期结果（静态审查预测，需实测确认）：`PASS 38 / FAIL 0 / WARN 5`，退出码 0。WARN 为 2 个软 404 状态记录 + 3 个跨主机 N/A。

### B. 使用已登录 Vercel 的 CLI / 浏览器打开（人工核对，不能替代脚本证据）

- Vercel CLI（需 maintainer 已 `vercel login`）：

```bash
vercel curl "https://mecollage-<hash>-keeey-is-projects.vercel.app/" \
  --deployment "https://mecollage-<hash>-keeey-is-projects.vercel.app/"
# 具体参数以 `vercel curl --help` / 官方文档为准：
# https://vercel.com/docs/cli/curl
```

- 或 maintainer 在已登录 Vercel 的浏览器打开 Preview URL，人工核对本 README §4 的矩阵项并截图存档。
- 说明：浏览器 Cookie / CLI 会话无法转交给本脚本（脚本零依赖、不读浏览器 Cookie），因此**完整自动化验收仍需方式 A**。

### C. 临时关闭 Deployment Protection（不推荐）

Vercel Dashboard → Project → Settings → Deployment Protection → 临时关闭 Vercel Authentication → 复跑本脚本 → **立即恢复原设置**。风险：期间任何知道 URL 的人可访问 Preview；需在治理记录中注明操作人/时间/恢复时间。

## 7. 当前证据与基线（`audit/evidence/phase-a/verification/`）

| 文件 | 内容 | 结果 |
|---|---|---|
| `baseline.json` / `baseline.md` | Phase A 前生产基线（生产域名，2026-11-05） | **22 PASS / 21 FAIL / 0 WARN → FAIL（退出码 1）** |
| `preview-blocked.json` / `preview-blocked.md` | 分支 `b2a3924` 的 Preview 验收 | **BLOCKED**（302 → `vercel.com/sso-api`），退出码 2，未产生 PASS/FAIL |
| `post-branch-prod.json` / `post-branch-prod.md` | 分支提交后再次跑生产，确认生产未被分支影响 | **与 baseline 完全一致**（43/43 项状态与关键证据无差异） |
| `preview.json` / `preview.md`（待生成） | 提供 bypass secret 后的 Preview 正式验收 | 待 maintainer 提供 secret 后由 agent 复跑 |

### 基线 FAIL 是「Phase A 要修复的」，不是脚本错误

`baseline` 的 **21 项 FAIL 全部是 Phase A 的安全止血目标**（生产当时仍为 `main` HEAD `afd3be4`，Phase A 分支未上线）：

| 分类 | FAIL 项 | 原因（Phase A 前线上实测） |
|---|---|---|
| b) 安全响应头 | 2（首页 + 工具页） | 仅 HSTS；XCTO / XFO / Referrer-Policy / Permissions-Policy / CSP-Report-Only 全部缺失 |
| c) 重定向 | 5 | `?lang=zh/es/ja/tw` 跳转后**保留** `?lang=` query；`?lang=en` **308 自循环**（最多 10 跳仍 308） |
| d) 404 页 | 1 | 旧 `404.html` 是 GitHub Pages 重定向页：无 404 标记、含 AdSense（pagead2/adsbygoogle）、含 `location.replace(`、无 noindex |
| e) 软 404 | 2（`/404`、`/404/`） | 均为 200（记录项不判 FAIL）+ 同上（广告/自动跳转/noindex 缺失 → FAIL） |
| f) 遗留文件 | 10 | 全部 200 可公开访问（含 245KB 死 bundle、`.htaccess`、中文需求文档、test-section） |
| h) 默认域 | 1 | `mecollage.vercel.app` 200 且**无** `X-Robots-Tag`（可被索引） |

基线中 PASS 的 22 项（页面 9、`/about` 与 `/public/tools` 重定向 2、http/apex 2、关键资产 9）说明 Phase A 不得误伤这些既有正确项。

### Phase A 上线后预期

| 场景 | 预期汇总 | 说明 |
|---|---|---|
| Preview（bypass 后） | `PASS 38 / FAIL 0 / WARN 5`，退出码 0 | WARN = 软 404 状态记录 ×2 + 跨主机 N/A ×3 |
| 生产（上线后复跑） | ✅ **实测 2026-11-05：PASS 41 / FAIL 0 / WARN 2，exit 0** | WARN = 软 404 状态记录 ×2；跨主机项参与判定；证据 `audit/evidence/phase-a/verification/post-release-prod.{json,md}` |

> 若出现新的 FAIL，即为回归；按证据中的 URL/跳转链/响应头定位，不要直接改判定。

### 实测记录（2026-11-05）

| 环境 | 结果 | 方式 |
|---|---|---|
| 生产（Phase A 未上线） | PASS 22 / FAIL 21 / WARN 0（基线，符合预期） | 直接请求 |
| Preview（head `987680b`，deployment `7570549183`） | **PASS 38 / FAIL 0 / WARN 5，exit 0** | `npx vercel login` + `npx vercel curl` 自动 bypass → `_vercel_jwt` cookie → `--header "Cookie: …"`（值脱敏）；证据 `audit/evidence/phase-a/verification/preview.{json,md}` |

## 8. 已知限制与不确定项

- **手动跟随只认 `Location` 响应头，不执行页面 JS**：404 自动跳转通过响应体中的 `location.replace(` 文本检测（不执行脚本，避免触发站点逻辑）。
- noindex 只识别 `<meta name="robots">` 与 `X-Robots-Tag`；不解析其他 robots 指令组合（如 `none` 也含 noindex 语义，但当前实现只匹配 `noindex` 字符串）。
- CSP-Report-Only **只检查存在性**，不验证策略内容/是否产生违规报告（Phase A 目标是先上 Report-Only 观测）。
- HSTS 头可能来自 Cloudflare 或 Vercel，脚本只验收最终响应结果（不区分注入层）。
- 跨主机检查的域名是硬编码生产域（`mecollage.top`、`mecollage.vercel.app`），不适用于其他站点。
- 脚本带 `cache-control: no-cache`；HTML 在 Cloudflare 侧为 `DYNAMIC` 不缓存，但静态资产可能命中边缘缓存（对状态/字节校验影响低）。
- `本地仓库 HEAD` 字段只是**当前工作目录的 git HEAD**，用于把证据与提交对应，**不是线上部署证明**；生产内容是否已更新需另行确认（截至 baseline，生产仍为 `main` HEAD `afd3be4`）。
- Preview 认证由 Vercel CLI（`vercel curl`）在请求层绕过，脚本本身不处理认证；使用 runbook 方式 D 可产出完整 JSON 证据（cookie 通过 `--header` 传入，值在证据中脱敏）。
- 不检查渲染层 i18n、GA4/AdSense 业务逻辑、性能/CWV、HTML 语义等（属其他阶段范围）。

## 9. 维护记录

- **v1.1.0（2026-11-05）**：新增 `--header`（可重复）与 `VERCEL_AUTOMATION_BYPASS_SECRET`（自动注入 `x-vercel-protection-bypass`）；新增 `BLOCKED` 判定（302 → `vercel.com/sso-api` 即停止跟随、单条汇总、退出码 2）；命令行 `--header` 值脱敏；报告记录自定义请求头名称与 `bypassSource`；修复 Markdown 分类汇总计数。
- **v1.0.0（2026-11-05）**：首版，a–h 检查矩阵、手动重定向跟随、JSON/Markdown 输出、跨主机 N/A、退出码 1/2。

修改本脚本后：先跑 `node scripts/verify-site.mjs --help` 与本地 fixture / 生产基线自测，再更新本 README 与 `audit/evidence/phase-a/verification/` 证据。
