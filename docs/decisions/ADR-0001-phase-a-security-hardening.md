# ADR-0001 — Phase A 安全加固：404、响应头、重定向、部署面与默认域名

| 字段 | 值 |
|---|---|
| 状态 | **Accepted**（2026-11-05 维护者批准上线；Preview 38 PASS/0/5；**生产部署并验收 PASS：41 PASS / 0 FAIL / 2 WARN**） |
| 日期 | 2026-11-05（Asia/Shanghai） |
| 决策者 | 维护者（生产批准 / 账户级操作）；Lead（实施）；审计者（发现与复验） |
| 分支 | `phase-a/security-hardening` |
| 已实施提交 | `460c39a`（.vercelignore/.gitignore）、`9b950c5`（404）、`1f9ad4c`（响应头 + `?lang=` 重定向）、`7391c5b`（`?lang=` 改为空参数清除 query，循环安全）、`b2a3924`（删除死 bundle/备份/test-section/重复 zh-tw.json）；后续 cleanup/docs 提交见 `git log main..HEAD` |
| Preview | 已生成（Vercel Git 集成）；查询：`gh api repos/oogwaaay/mecollage/deployments?sha=$(git rev-parse HEAD)`。最终代码 head `987680b` → deployment `7570549183`（state success）。未认证访问 302 到 Vercel SSO，见 §6 |
| Preview 验收 | **38 PASS / 0 FAIL / 5 WARN（exit 0）**，2026-11-05；方式：`vercel login` + `vercel curl` 自动 bypass → `_vercel_jwt` cookie（7d）→ `verify-site.mjs --header "Cookie: …"`（值脱敏）。证据 `audit/evidence/phase-a/verification/preview.{json,md}` |
| 生产部署 | 2026-11-05，维护者批准后 `npx vercel deploy --prod --yes`（生产 deployment `mecollage-cf88q7qp6-…`，Aliased `www.mecollage.top`）；main push 只产生 Preview，不自动上线 |
| 生产验收 | **41 PASS / 0 FAIL / 2 WARN（exit 0）**；WARN = `/404`、`/404/` 软 404 状态记录；证据 `audit/evidence/phase-a/verification/post-release-prod.{json,md}` |
| 关联审计 | `audit/AUDIT-REPORT.md` §1.5、§2.5、§7.1、§8.1；`audit/sections/tech-architecture.md` §4；`audit/sections/adsense.md` A-07 |
| 关联教训 | [L-20261105-03](../lessons/L-20261105-03-cloudinary-unsigned-preset-dead-code.md)、[L-04](../lessons/L-20261105-04-404-ad-and-auto-redirect.md)、[L-05](../lessons/L-20261105-05-lang-redirect-query-loop.md)、[L-06](../lessons/L-20261105-06-htaccess-ineffective-on-vercel.md)、[L-12](../lessons/L-20261105-12-preview-before-production.md)、[L-13](../lessons/L-20261105-13-default-vercel-domain-indexable.md)、[L-14](../lessons/L-20261105-14-gitignore-is-not-deploy-ignore.md) |
| 写范围 | `404.html`、`vercel.json`、`.vercelignore`、`.gitignore`、已确认无引用的死文件；**不含**代码逻辑、i18n 系统、多语言页面内容、AdSense/Publisher ID、GA4、Cloudinary 账户 |

## 1. 背景

2026-11-05 审计确认了以下可直接利用/影响合规的问题（证据见审计报告）：

- 安全响应头只有 HSTS；CSP/XFO/XCTO/Referrer-Policy/Permissions-Policy 全缺；`.htaccess` 里的安全头在 Vercel **实测不生效**。
- 404 页仍挂着 AdSense 且 JS 自动 `location.replace` 到首页，`/404/` 还返回 200（软 404），`/test-section/` 200 可索引。
- `?lang=en` 在 `vercel.json` 形成 **308 自循环**；其余 `?lang=` 重定向保留 query，落到 `robots.txt` 的 `Disallow: /*?lang=` 下。
- 内部文档/备份/旧 bundle 因被 git 跟踪而全部公开可下载；默认域 `mecollage.vercel.app` 200 且无 noindex。
- 死代码 `assets/js/index-CurY6_0Y.js`（含 Cloudinary unsigned preset）线上可下载。

约束：

1. 站点**无构建系统**、96 个手写 HTML、无 CI，不能靠"改源码重新构建"；安全头/重定向只能走 `vercel.json`。
2. Phase A 只做"安全止血 + 部署面收敛"，**不修 i18n、不动广告/统计、不操作第三方账户**。
3. AI 不执行生产部署；生产需要维护者明确批准（`AGENTS.md` H1/H2）。
4. 写范围严格限定在 ADR 头部所列文件；`audit/`、`docs/`、`scripts/` 为本地/治理产物，不进部署。

## 2. 决策

### D1 — 404 页改造（去广告、去 JS 跳转、正常导航、noindex）

**决策**：重写 `404.html` 为真实错误页：移除 AdSense 脚本与 `location.replace`；加入 `meta robots noindex, follow`、标题/描述、首页/博客/联系/工具/语言导航；保留 Vercel 对不存在路径返回 **404 状态码** 的行为。

**实施**：`9b950c5`。另对 `/404`、`/404/` 在 `vercel.json` 加 `X-Robots-Tag: noindex`（`1f9ad4c`）；删除 `test-section.html`（`b2a3924`）。

**残余风险（Vercel 保留 `/404/` 200）**：由于 `cleanUrls` + `trailingSlash`，`/404.html` 文件本身可通过 `/404/` 以 **200** 访问（Vercel 把根目录 `404.html` 同时用于"不存在的路径的响应体"和"可直接访问的文件"）。Phase A 无法把它变成 404：

- 缓解：页面内 `noindex, follow` + `/404/` 路径级 `X-Robots-Tag: noindex` + 不进 sitemap + 验收脚本检查；
- 接受：残余软 404 风险为低（无内容、无广告、不可从站内到达），记录在本 ADR，后续如需彻底解决可考虑 Vercel/Cloudflare 路径级规则或移除 `404.html`（会失去自定义错误页导航，不推荐）。

**备选方案**：删除 `404.html` 用 Vercel 默认 404（失去品牌与导航，SEO 体验更差）；把所有 404 重定向到首页（软 404 + 广告政策风险，禁止）。

**验收**：不存在 URL → 404 且响应体无 `adsbygoogle`/`pagead2`/`location.replace`，含 `noindex`；`/404/` → 200 但带 noindex 头/Meta；`/test-section/` → 404。

### D2 — 安全响应头集合，CSP 先 Report-Only

**决策**：在 `vercel.json` 的 `headers`（`source: "/(.*)"`）统一加：

| Header | 值 | 说明 |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | 零风险 |
| `X-Frame-Options` | `SAMEORIGIN` | 防点击劫持 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | 限制外链 referrer |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` | 关闭不需要的能力 |
| `Content-Security-Policy-Report-Only` | 见下 | 先观察，不阻断 |

CSP-Report-Only 的 allowlist（完整字符串以 `vercel.json:82-84` 为唯一事实来源）：

- `default-src 'self'`；`base-uri 'self'`；`object-src 'none'`；`frame-ancestors 'self'`；`form-action 'self'`；
- `script-src 'self' 'unsafe-inline' 'unsafe-eval'` + `cdn.jsdelivr.net`、`cdnjs.cloudflare.com`、`esm.sh`、`pagead2.googlesyndication.com`、`www.googletagservices.com`、`www.google.com`、`www.gstatic.com`；
- `style-src 'self' 'unsafe-inline'` + `fonts.googleapis.com`、`cdnjs.cloudflare.com`；
- `img-src 'self' data: blob: https:`；`font-src 'self' data:` + `fonts.gstatic.com`、`cdnjs.cloudflare.com`；
- `connect-src 'self'` + `esm.sh`、`cdn.jsdelivr.net`、`cdnjs.cloudflare.com`、`staticimgly.com`、`pagead2.googlesyndication.com`、`www.google-analytics.com`、`region1.google-analytics.com`；
- `worker-src 'self' blob:`；`child-src 'self' blob:`；`frame-src 'self' blob:` + AdSense iframe 域（`googleads.g.doubleclick.net`、`tpc.googlesyndication.com`、`www.google.com`、`www.googletagservices.com`）；`manifest-src 'self'`；`media-src 'self' blob:`；`upgrade-insecure-requests`。

**为什么先 Report-Only（不直接 enforce）**：

1. 无构建系统，96 个页面含内联 `<script>/<style>`（编辑器配置、内联工具逻辑），无法用 hash/nonce 批量改造；`'unsafe-inline'`/`'unsafe-eval'` 是被迫放行，不是最佳实践。
2. 核心功能依赖多类动态执行：AI 去背景（`esm.sh` 动态 import、WASM/ONNX）、导出（`html2canvas`）、face-api/onnxruntime、`blob:` worker、`data:`/`blob:` 图片渲染；一处漏放行就会让工具不可用。
3. AdSense 的 iframe/脚本域名多且会变化（当前 0 广告位、Auto ads 未确认，未来可能新增域名）；Cloudflare 还会在边缘注入 RUM `static.cloudflareinsights.com`（仓库不可见，见 L-07）。
4. 外链依赖 7 个第三方域（cdnjs/jsdelivr/esm.sh/staticimgly/google fonts/pagead2/CF beacon），供应链与白名单需要实测校准。
5. 项目当前没有可用的 CSP violation 上报端点；先以 Report-Only 在 Preview/生产观察，人工从 DevTools 与 QA 记录违规，再决定是否收紧。

**未来收紧所需条件（Phase B/C，需维护者批准）**：

- 观察期 ≥1–2 周、核心页面（首页/4 工具页/AI 去背景/导出/5 语言）无新增违规；
- 逐步移除 `'unsafe-eval'`（改为 `'wasm-unsafe-eval'` 若仍需要 WASM）、收敛 `img-src https:` 为白名单、自托管字体与 CDN 资源并加 SRI、内联脚本改为外链/hash/nonce；
- 若需自动上报，先选型 reporting endpoint 并做隐私评审（不得引入未经批准的第三方）；
- 将 `Content-Security-Policy-Report-Only` 转为 `Content-Security-Policy`，并保留回滚开关（enforce 前先留 ADR 与回滚记录）。

**残余风险**：Report-Only 不阻断攻击，`'unsafe-inline'`/`'unsafe-eval'` 削弱防护；`img-src https:` 过宽；CSP 仅覆盖 Vercel 边缘响应，Cloudflare 注入脚本需同步维护。

**实施**：`1f9ad4c`。**备选**：Cloudflare Transform Rules 加头（会在两处维护、易漂移，未采纳）。

### D3 — `?lang=` 重定向修复（空参数清除 query，循环安全）

**决策**：保留 5 条语言重定向，`destination` 使用**空参数**写法：

- `/` + `?lang=zh` → `/zh/?lang=`；es → `/es/?lang=`；ja → `/ja/?lang=`；tw → `/tw/?lang=`；en → `/?lang=`。

理由：① Vercel redirects 默认把源 query 透传到 destination，`destination: "/"` 会形成 `/?lang=en` 自循环；② 空参数写法（重复 query key、值为空）按 Vercel 实际行为会被移除，且**即使未被移除，目标 URL 的 `lang=` 为空，不会再次匹配 `value: en` 规则**，至少保证无循环；③ 不用裸 `?` 结尾是因为该行为缺少稳定的官方文档背书（仅社区实践），空参数方案在失败时也更安全。

**实施**：`1f9ad4c` → `7391c5b`（最终写法）。**备选**：删除全部规则（旧链接无法落到正确语言，不采纳）；删除 en 规则（可作为兜底，见风险表）；用前端 JS 跳转（SEO 不友好，不采纳）。

**实测结果（Preview，head `987680b`，2026-11-05）**：5 条 `?lang=` 规则全部**单跳 308 → 200**，最终 URL **不含 `?lang=`**（空参数被 Vercel 移除），**无循环**；`?lang=xx`/`?lang=` 返回 200 无跳转。证据 `audit/evidence/phase-a/verification/preview.md` §c。

**残余问题（不在 Phase A 写范围）**：`robots.txt:4` 的 `Disallow: /*?lang=` 未改。修复后源 URL `/?lang=zh` 仍被 robots 屏蔽，但落地 URL 已干净；Google 侧的可发现性不是本阶段目标。该配置一致性问题记入 [L-05](../lessons/L-20261105-05-lang-redirect-query-loop.md) 后续项，Phase B 再决策（删除 Disallow 或彻底移除重定向）。

**验收**：每个 `?lang=` 值（含 en、非法值）`curl -L --max-redirs 5`：单跳、最终 200、最终 URL 不含 `?lang=`、无循环。

### D4 — `.vercelignore` 排除内部文件，`.gitignore` 只忽略本地大证据

**决策**：新增 `.vercelignore`（`460c39a`），排除：

- 治理/审计/工具：`audit/`、`docs/`、`scripts/`、`AGENTS.md`、`GOVERNANCE.md`；
- 内部说明/遗留配置：`design-system.md`、`需求理解确认.txt`、`.htaccess`、`.nojekyll`、`.trae/`；
- 开发脚本：`check_keys.js`、`sync_keys.js`；备份：`*.backup`；
- 本地元数据：`.vercel/`、`.vercelignore`（自身）、`.gitignore`、`.DS_Store`。

同时 `.gitignore` 忽略整个 `audit/`（本机审计产物含未修复风险细节，公开仓库不提交；证据可由 `audit/evidence/` 下脚本复现）；治理所需结论沉淀到 `docs/lessons/`。

**理由**：`.gitignore` 只影响 git，**不影响 Vercel 部署**；被跟踪的内部文件会作为静态文件发布（L-14）。部署输入 = 仓库内容，必须在部署层显式排除。

**风险与缓解**：误排必要目录（如 `i18n/`、`assets/`、`public/`）会让站点损坏 → 验收必须同时检查"内部文件 404"与"关键资源 200"；`.vercelignore` 是 gitignore 语法，后续新增顶层目录必须在同一变更更新并验证。

**备选**：把内部文件移出仓库（成本高，报告需要版本化，未采纳）；独立部署仓库（架构改动，未采纳）。

### D5 — 默认域名 `mecollage.vercel.app`：host 级 noindex + Dashboard 301

**决策**：

1. 仓库层：`vercel.json` 增加 host 条件响应头 —— `source: "/(.*)"` + `has: [{type:"host", value:"mecollage.vercel.app"}]` → `X-Robots-Tag: noindex, nofollow`（`1f9ad4c`）。
2. 平台层（维护者人工）：Vercel Dashboard → Project → Domains，把 `mecollage.vercel.app` **301 到** `https://www.mecollage.top/`（或确认默认域不可索引）。Dashboard 操作无法版本化，因此必须在本文与检查单记录，并附截图/时间。

**实施状态**：仓库层已实现；Dashboard 301 **待维护者执行（不确定）**。**验证限制**：host 条件只对 `mecollage.vercel.app` 生效，不能在普通 Preview URL 上验证；必须在生产部署后 `curl -sI https://mecollage.vercel.app/ | grep -i x-robots-tag` 复验。若 Vercel 不支持 headers 的 host 条件（待实测），回退为 Dashboard/Cloudflare 规则（需维护者操作并记录）。

**备选**：Cloudflare 层 301（多一层配置、默认域流量不经主域 DNS，未采纳）；仅改 GitHub homepage（无效，未采纳）。

### D6 — 不操作 Cloudinary 账户；代码侧删除死 bundle

**决策**：

- Phase A **不登录、不修改、不上传测试** Cloudinary 账户；`public_works_unsigned` preset 的关闭/删除由维护者在 Cloudinary 控制台人工完成，并记录结论。
- 代码侧删除 0 引用的 `assets/js/index-CurY6_0Y.js` 与 `.backup`（`b2a3924`），并从部署面排除 `*.backup`（`.vercelignore`）。

**理由**：账户操作不可逆、需要凭据、属第三方写操作；审计要求只读取证，避免滥用。删除部署面文件可降低发现面，但**不能替代**关闭 preset。

**残余风险（必须明确）**：仓库是 public，**git 历史中仍保留该 bundle 与 preset 字符串**（`git log -p` 可取得）。只有维护者关闭/删除 preset 才能消除滥用面；在此之前该风险始终存在，记为 P0 待办（[L-03](../lessons/L-20261105-03-cloudinary-unsigned-preset-dead-code.md)）。

### D7 — Preview 先行；生产必须维护者明确批准

**决策**：Phase A 的提交只推送到 `phase-a/security-hardening`，由 Vercel Git 集成生成 Preview；验收证据归档后，维护者明确批准才可进入生产。AI 不执行生产部署/提升。

**实施状态**：分支已推送（HEAD `b2a3924`），Preview deployment `7570103062` 已创建（2026-11-05T09:36:33Z，vercel[bot]）；**但 Preview URL 受 Vercel Authentication 保护**：

```
$ curl -sI https://mecollage-9fibvzr1t-keeey-is-projects.vercel.app/
HTTP/2 302
location: https://vercel.com/sso-api?url=...   # Protected by Vercel Authentication
```

因此"Preview 验收"尚**未完成**。可选路径（需维护者配合，见 `docs/runbooks/preview-deploy.md`）：

1. 维护者在 Vercel 生成 Protection Bypass for Automation secret，验收请求带 `x-vercel-protection-bypass`（需 `verify-site.mjs` 支持额外 header/环境变量）；
2. 维护者用已登录的 Vercel 凭据/`vercel curl` 代跑验收，把输出交回；
3. 临时放宽 Preview 保护（不推荐，用完恢复）。

**2026-11-05 更新**：Preview HTTP 验收已完成（38 PASS/0 FAIL/5 WARN）；生产已上线并验收 41 PASS/0/2。Cloudinary preset 已由维护者删除；剩余：浏览器功能 QA、默认域 Dashboard 301（可选）。

## 3. 后果

### 正面

- 404 页不再有广告/自动跳转，符合 AdSense ad placement policies，消除软 404 的内容/广告风险面。
- 全站获得 4 个零风险安全响应头 + CSP 观察层；后续收紧有基线。
- `?lang=en` 循环修复（配置层已改；Preview 验收被 SSO 阻断，待 bypass 后验证），其余语言落地 URL 设计上不再被 query 污染。
- 内部文档/备份/工具脚本/治理文档不再被部署；死 bundle 删除，公开面收敛。
- 默认域有仓库层 noindex（待生产复验），并留下 Dashboard 301 操作项。
- 首次建立"分支 → Preview → 证据 → 维护者批准 → 生产"流程（L-12）。

### 负面 / 代价

- 引入一条很长的 CSP-Report-Only 字符串，后续维护需要逐域更新；Report-Only 期间没有实际阻断收益。
- `.vercelignore` 增加部署面维护点：新增顶层目录必须同步更新并验证。
- 删除 `assets/js/index-CurY6_0Y.js`、`.backup`、`test-section.html`、根 `zh-tw.json` 后，git 历史仍保留（公开仓库），Cloudinary preset 风险不因删除代码而消除。**2026-11-05 更新：维护者已删除该 preset，风险消除；历史字符串保留但不再构成匿名上传面（L-03/L-16）。**
- `/404/` 仍返回 200（软 404 残余），只能 noindex 缓解。
- `robots.txt` 的 `?lang=` Disallow 与重定向策略仍不一致（本阶段不改）。

### 风险表

| 风险 | 可能性 | 影响 | 缓解 |
|---|---|---|---|
| Vercel 对 `destination: "...?lang="`（空参数）的行为与预期不同（query 未清除） | 中 | 落地 URL 带空 `lang=`（不循环，但不够干净） | Preview/生产 `curl -L` 全量矩阵；若无法清除则删除 en 规则并记录 |
| Vercel headers 的 host 条件不生效 | 中 | 默认域仍可索引 | 生产复验；回退 Dashboard/Cloudflare 规则（维护者） |
| `.vercelignore` 误排关键资源 | 低 | 站点功能/多语言损坏 | 验收：内部文件 404 + 关键资产 200 双矩阵 |
| `/404/` 200 被误当普通页 | 中 | 软 404 | noindex + 不进 sitemap + 验收脚本断言 |
| Preview 受保护导致无法验收 | **高（已发生）** | 无法完成门禁 | 维护者提供 bypass/代跑；未完成不得上线 |
| ~~Cloudinary preset 仍有效~~ | ~~中~~ | 第三方账号滥用 | **已关闭（2026-11-05）**：维护者删除 `public_works_unsigned`，截图 `audit/evidence/phase-a/cloudinary/`；代码/线上零引用；公开历史仍含字符串但已无匿名上传面 |
| CSP Report-Only 观察不足就上 enforce | 中 | 工具/广告/AI 功能被阻断 | 收紧前 1–2 周观察 + 全功能 QA + ADR 更新 |

## 4. 备选方案（未采纳摘要）

| 问题 | 未采纳方案 | 原因 |
|---|---|---|
| 安全头 | 继续用 `.htaccess` / 只写文档 | Vercel 不解析 `.htaccess`，实测无效（L-06） |
| 安全头 | 直接在 Cloudflare 加 Transform Rules | 两处维护、易漂移；先统一在 `vercel.json` |
| CSP | 直接 enforce 完整策略 | 无构建/内联脚本/AI/WASM/Ads 白名单不确定，会破坏核心功能 |
| 404 | 重定向所有错误到首页 | 软 404 + AdSense 政策风险 |
| 404 | 删除 404.html 用默认页 | 失去导航与品牌，用户体验差 |
| `?lang=` | 删除全部 redirect | 旧链接无法落到正确语言 |
| 内部文件 | 仅加 `.gitignore` | 不影响部署面（L-14） |
| 默认域 | 只改 GitHub homepage | 搜索引擎仍可发现默认域 |
| Cloudinary | 在代码里"注释掉"preset | 文件仍部署、历史仍可查；必须控制台关闭 + 删除 |

## 5. 验证方式（预览通过后才可请求生产批准）

```bash
BASE="<preview-or-production-url>"

# D1 404
curl -s -o /tmp/404.html -w 'status=%{http_code}\n' "$BASE/this-page-does-not-exist-xyz/"
grep -cE 'adsbygoogle|pagead2|location\.replace' /tmp/404.html      # 期望 0
grep -ci 'noindex' /tmp/404.html                                    # 期望 >=1
curl -sI "$BASE/404/" | grep -i 'x-robots-tag'                      # 期望 noindex
curl -s -o /dev/null -w '/test-section/ => %{http_code}\n' "$BASE/test-section/"  # 期望 404

# D2 安全头
curl -sI "$BASE/" | grep -iE '^(x-content-type-options|x-frame-options|referrer-policy|permissions-policy|content-security-policy-report-only)'

# D3 重定向矩阵
for l in en zh es ja tw xx; do
  curl -s -o /dev/null --max-redirs 5 -L \
    -w "?lang=$l => %{http_code} hops=%{num_redirects} final=%{url_effective}\n" "$BASE/?lang=$l"
done
# 期望：全部 200、hops<=1、final 不含 ?lang=（xx 不循环即可）

# D4 部署面
for p in AGENTS.md GOVERNANCE.md docs/lessons/README.md scripts/verify-site.mjs \
         design-system.md 需求理解确认.txt .htaccess .nojekyll check_keys.js sync_keys.js \
         test-section/ assets/js/index-CurY6_0Y.js assets/js/index-CurY6_0Y.js.backup; do
  printf '%-45s %s\n' "/$p" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/$p")"
done   # 期望全部 404
for p in ads.txt sitemap.xml robots.txt i18n/zh.json assets/js/mecollage-main.js; do
  printf '%-35s %s\n' "/$p" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/$p")"
done   # 期望全部 200

# D5 默认域（仅生产部署后可验）
curl -sI https://mecollage.vercel.app/ | grep -iE '^(HTTP/|x-robots-tag|location)'
```

**验收脚本**：`node scripts/verify-site.mjs --base "$BASE"`（Phase A 起提供；若分支没有该文件，按上表手工执行）。证据存 `audit/evidence/phase-a/verification/`，文件名含 sha 与时间。

**通过标准**：上述命令输出符合期望；`verify-site.mjs` 无 FAIL（WARN 需逐条解释）；Preview URL 访问问题已解决；维护者批准记录已附。

## 6. 开放问题 / 后续

- [ ] **Preview 验收阻塞**：Vercel Authentication 保护导致未认证 302。需维护者提供 bypass/代跑，或授权临时放宽；完成后补 `audit/evidence/phase-a/verification/`。
- [ ] **生产部署方式确认**：GitHub Deployments 目前只见 `environment=Preview` 记录（sha `b2a3924`/`afd3be4`）；生产触发/提升路径需维护者 Dashboard 确认并写入 runbook（当前标"不确定"）。
- [x] **Cloudinary preset**：维护者在控制台删除 `public_works_unsigned`（2026-11-05；删除确认截图归档）；结论入库。
- [ ] **默认域 Dashboard 301**：维护者执行并截图；仓库层 noindex 生产复验。
- [ ] **CSP 观察**：报告期收集违规，1–2 周后评估收紧；任何 enforce 需新 ADR 更新本文件 D2。
- [ ] **robots.txt 与 `?lang=`**：Phase B 决策（删除 Disallow 或移除重定向），见 L-05。
- [ ] **`/404/` 200**：接受残余风险；若未来平台能力允许再处理。
- [ ] **`audit/` 入库策略**：`audit/evidence/` 已被 gitignore；`AUDIT-REPORT.md`/`sections` 是否入库由维护者定（本 ADR 引用其路径）。

## 7. 变更记录

- 2026-11-05 Proposed：Lead 在 `phase-a/security-hardening` 实施 4 个提交并推送 Preview；本 ADR 记录决策、残余风险与验证方式。等待 Preview 验收 + 维护者生产批准后转 **Accepted**。
