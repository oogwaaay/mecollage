# Phase A 整改摘要（安全止血与线上遗留问题）

> 日期：2026-11-05｜分支：`phase-a/security-hardening`（未合并 `main`、未部署生产）
> 完整报告（本机、不入库）：`audit/PHASE-A-REPORT.md`；流程：[AGENTS.md](../../AGENTS.md)、[GOVERNANCE.md](../../GOVERNANCE.md)

## 做了什么

| 类别 | 变更 | 提交 |
|---|---|---|
| 404 页 | 重写为真实 404 导航页：去广告、去 JS 自动跳转、加 `noindex`；真实不存在 URL 仍返回 404 | `9b950c5` |
| 安全响应头 | 新增 `X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`、`Permissions-Policy` 与 `CSP-Report-Only`（先观察，不 enforce） | `1f9ad4c` |
| 重定向 | 修复 `/?lang=en` 308 自循环；5 条语言重定向改为空参数清除 query 的安全写法 | `1f9ad4c`、`7391c5b` |
| 默认域 | 对 `mecollage.vercel.app` 增加 host 级 `X-Robots-Tag: noindex, nofollow`（Dashboard 301 待维护者） | `1f9ad4c` |
| 部署面 | 新增 `.vercelignore`，排除审计/治理/工具/内部说明/遗留配置/备份/本地元数据 | `460c39a` |
| 死代码清理 | 删除 0 引用的旧 Vite bundle 与 `.backup`、内部测试页 `test-section.html`、重复 `zh-tw.json`；删除 0 引用的 `upload-icon.png/.webp` | `b2a3924`、`b2ad3dc` |
| 治理体系 | `AGENTS.md`、`GOVERNANCE.md`、17 条教训（`docs/lessons/`）、ADR-0001、Preview runbook、零依赖验收脚本 `scripts/verify-site.mjs` | `b2ad3dc` |

**未做**（不在 Phase A 范围）：多语言重构、GA4、AdSense 变更/Publisher ID、SEO 内容优化、Cloudinary 账户操作、生产部署。

## 验证结果（分三层）

1. **本地静态/配置层（已完成）**
   - `vercel.json` 合法；18/18 配置断言 PASS（安全头、5 条 lang 规则、`/404` noindex、host noindex、CSP 语法）；
   - 404 页：`data-404-page` 标记、`noindex`、0 广告引用、0 自动跳转；缺失 URL 返回 404；`/404/` 200 + noindex（Vercel 静态站约定）；
   - 删除文件全站引用 0；关键资源（ads.txt/sitemap/robots/i18n/JS/CSS/图片）未改。
2. **生产未受影响（已完成）**
   - 分支提交后生产复跑验收：22 PASS / 21 FAIL / 0 WARN，与分支前基线 **43/43 项无差异**（生产仍是旧行为，符合"未上线"）。
3. **Preview 运行时（BLOCKED）**
   - Vercel Git Integration 已生成 Preview 并构建成功（例：`b2ad3dc` → `https://mecollage-87azkotzy-keeey-is-projects.vercel.app`）；
   - 但 Preview 受 **Vercel Authentication** 保护：未认证请求（含 `/robots.txt`）302 → `vercel.com/sso-api`；
   - 验收脚本判定 **BLOCKED（exit 2）**，不产生虚假 PASS/FAIL。**安全头 / 重定向 / 404 / `.vercelignore` 的运行时行为尚未验证。**

## 上线前必须完成

1. 维护者提供 `VERCEL_AUTOMATION_BYPASS_SECRET`（或代跑/浏览器人工验收），使
   `node scripts/verify-site.mjs --base <preview-url>` 达到 0 FAIL（预期 38 PASS / 0 FAIL / 5 WARN）；
2. 浏览器人工 QA：拼图编辑器、4 工具页、AI 去背景、导出、5 语言、移动端；
3. 维护者在 Cloudinary 控制台关闭/删除旧的第三方上传 preset（代码已删除，但公开 git 历史仍可取得，见 L-16）；
4. 维护者在 Vercel Dashboard 配置默认域 301 → 主域（或确认 host noindex 生效）；
5. 维护者书面批准生产上线（AGENTS H1）；上线后立即用同一脚本跑生产验收（预期 41 PASS / 2 WARN / 0 FAIL）并归档。

## 关键风险与限制

- **Preview 保护是当前唯一验收阻塞点**：不是代码失败；解决方式见 `scripts/README.md` §6 与 `docs/runbooks/preview-deploy.md`。
- 空参数 `?lang=` 的清除行为需在可访问环境实测；若不生效，回退方案为删除 `en` 规则并记录（不会循环）。
- host 条件 `X-Robots-Tag` 只能在生产复验；Dashboard 301 是更稳的兜底。
- `/404/` 仍返回 200（Vercel 静态站约定），已用 meta + header noindex 缓解；严格 404 需后续评估路由中间件。
- `robots.txt` 的 `?lang=` Disallow 与重定向策略仍不一致，Phase B 一起决策。

## 回滚

- 代码：`git revert` 对应提交（按 6 个逻辑提交）或在 Vercel Dashboard 回滚到上一生产部署；
- 配置：若安全头/重定向引发问题，单独 revert `1f9ad4c`/`7391c5b` 并重新部署；
- 所有回滚都需要记录到 `docs/lessons/`（regressed）与 ADR。
