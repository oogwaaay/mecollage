# Phase A 整改摘要（安全止血与线上遗留问题）

> 日期：2026-11-05｜分支：`phase-a/security-hardening`（未合并 `main`、未部署生产）
> **Preview 验收：PASS（38 PASS / 0 FAIL / 5 WARN，exit 0）**；生产待维护者批准。
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

**未做**（不在 Phase A 代码范围）：多语言重构、GA4、AdSense 变更/Publisher ID、SEO 内容优化、生产部署。Cloudinary preset 的账户级删除已于 2026-11-05 由维护者完成（代码/线上无引用，截图归档）。

## 验证结果（分三层）

1. **本地静态/配置层（已完成）**
   - `vercel.json` 合法；18/18 配置断言 PASS（安全头、5 条 lang 规则、`/404` noindex、host noindex、CSP 语法）；
   - 404 页：`data-404-page` 标记、`noindex`、0 广告引用、0 自动跳转；缺失 URL 返回 404；`/404/` 200 + noindex（Vercel 静态站约定）；
   - 删除文件全站引用 0；关键资源（ads.txt/sitemap/robots/i18n/JS/CSS/图片）未改。
2. **生产上线（已完成，2026-11-05，维护者批准）**
   - 生产部署：`npx vercel deploy --prod --yes`（main push 只产生 Preview，**不自动上线**；实测记录见 L-18）；部署 URL `https://mecollage-3fnk9uo4k-keeey-is-projects.vercel.app` / 最新 `mecollage-cf88q7qp6-…`，Aliased `https://www.mecollage.top/`；
   - 生产验收：**41 PASS / 0 FAIL / 2 WARN（exit 0）**；6 项安全头、5 条 `?lang=` 单跳无循环、404 页、10/10 遗留文件 404、9/9 关键资产 200、默认域 `x-robots-tag: noindex, nofollow` 全部通过；WARN 为 `/404`、`/404/` 软 404 状态记录；
   - 证据：`audit/evidence/phase-a/verification/post-release-prod.{json,md}`、`audit/evidence/phase-a/production-deploy.txt`。
3. **Preview 运行时（已完成，PASS）**
   - Vercel Git Integration 已生成 Preview 并构建成功（最终代码 head `987680b`：deployment `7570549183`，`https://mecollage-df9hlp6l3-keeey-is-projects.vercel.app`）；
   - Preview 默认受 **Vercel Authentication** 保护；本次用 `npx vercel login` + `npx vercel curl` 自动带 bypass token，再以 `x-vercel-set-bypass-cookie: true` 换取 7 天有效的 `_vercel_jwt` cookie 传给验收脚本（**无需人工查看/传递 secret**；cookie 值不写入报告）；
   - 结果：**38 PASS / 0 FAIL / 5 WARN（exit 0）**——6 项安全头、5 条 `?lang=` 单跳且最终 URL 无 `?lang=`、404 页（404 状态/无广告/无跳转/noindex）、10/10 遗留文件 404、9/9 关键资产 200 全部通过；WARN 为 `/404` 软 404 状态记录 ×2 + 跨主机 N/A ×3。
   - 证据：`audit/evidence/phase-a/verification/preview.{json,md}`（本机，未入库）。

## 上线后剩余事项

1. 浏览器人工 QA：拼图编辑器、4 工具页、AI 去背景、导出、5 语言、移动端（HTTP 矩阵已 PASS，但交互/渲染需真人确认）；
2. ✅ 维护者已在 Cloudinary 控制台**删除** `public_works_unsigned`（2026-11-05；删除确认截图归档；代码/线上无引用，公开历史仍含字符串但匿名上传面已消除，见 L-03/L-16）；
3. 可选加固：Vercel Dashboard 默认域 301 → 主域（生产已实测 host 级 `x-robots-tag: noindex, nofollow`，301 非必需）；
4. 清理验收临时凭据：`vercel curl` 可能自动生成项目级 bypass secret（Dashboard 复核/撤销）；按需 `npx vercel logout`。

## 关键风险与限制

- **Preview 保护已解决 + 生产已上线**：用 `vercel login` + `vercel curl` 自动 bypass；Preview 38 PASS、生产 41 PASS。`vercel curl` 可能自动生成项目级 bypass secret，建议在 Dashboard 复核/撤销；本机登录态可按需 `vercel logout`。
- 空参数 `?lang=` 已在 Preview + 生产实测：Vercel 移除空参数，最终 URL 干净、单跳、无循环。
- host 条件 `X-Robots-Tag` 已在生产实测生效（`mecollage.vercel.app` 返回 `noindex, nofollow`）；Dashboard 301 为可选加固。
- `/404/` 仍返回 200（Vercel 静态站约定），已用 meta + header noindex 缓解；严格 404 需后续评估路由中间件。
- `robots.txt` 的 `?lang=` Disallow 与重定向策略仍不一致，Phase B 一起决策。

## 回滚

- 代码：`git revert` 对应提交（按 6 个逻辑提交）或在 Vercel Dashboard 回滚到上一生产部署；
- 配置：若安全头/重定向引发问题，单独 revert `1f9ad4c`/`7391c5b` 并重新部署；
- 所有回滚都需要记录到 `docs/lessons/`（regressed）与 ADR。
