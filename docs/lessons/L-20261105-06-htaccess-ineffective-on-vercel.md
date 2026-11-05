# L-20261105-06 — `.htaccess` 里的安全头/缓存策略在 Vercel 完全不生效

| 字段 | 值 |
|---|---|
| ID | L-20261105-06 |
| 日期 | 2026-11-05 |
| 状态 | **closed**（`1f9ad4c` 已上线生产，6 项头由 `vercel.json` 统一下发并验收 PASS） |
| 严重度 | P1 |
| 证据层 | 代码层 + 线上层 |
| 关联文件 | `.htaccess:7`（1 年图片缓存）、`:62`（`max-age=31536000`）、`:74-75`（XCTO/XFO 安全头） |
| 发现来源 | 2026-11-05 审计；`audit/sections/tech-architecture.md` §4.2；`audit/evidence/tech/01_live_headers.txt` |
| 负责人 | 实施者（迁到 `vercel.json`）；审计者复验 |

## 症状

- 仓库根目录 `.htaccess` 声明了 `X-Content-Type-Options: nosniff`、`X-Frame-Options: SAMEORIGIN` 与 1 年图片缓存。
- 线上实测：HTML/资源响应**只有** `strict-transport-security`，没有任何 `.htaccess` 声明的安全头；`wallImage.png` 实际 `cache-control: public, max-age=14400, must-revalidate`（4 小时），不是 1 年。
- `.htaccess` 本身还线上 200 可下载（内部配置泄漏，见 L-20261105-14）。

## 影响

- 造成"已经配了安全头"的错觉，实际站点 CSP/XFO/XCTO/Referrer-Policy/Permissions-Policy 全缺（审计 P1）。
- 缓存策略与预期不符（静态资源 4h must-revalidate，无 immutable），性能与回源成本受影响。
- 任何人后续改 `.htaccess` 都是白费，形成配置漂移。

## 根因

- 平台迁移遗留：`.htaccess` 是 Apache/GitHub Pages 时代配置，Vercel 是静态文件服务器，不解析 Apache 配置。
- 没有"配置所在层 = 实际执行层"的检查：仓库里有配置就默认生效。
- 安全头修复只写在 `.htaccess`，没有落到 `vercel.json` 的 `headers`。

## 规则

以后必须：

1. 安全头/缓存/重定向/rewrite 配置必须写在**实际执行层**：本项目是 `vercel.json`（或 Cloudflare/Vercel Dashboard，且需记录手动操作）。
2. 每次改配置后用线上 curl 验收，不能只看仓库文件。
3. 发现平台遗留配置文件（`.htaccess`、`.nojekyll`、gh-pages 分支产物）时，归档/删除并记入教训，不做"继续修改"。
4. 双 CDN（Cloudflare + Vercel）场景，安全头/缓存变更要明确在哪一层加，并检查两层是否冲突。

禁止：

1. 禁止把安全头只写进 `.htaccess` 或只写进文档而不落实际平台配置。
2. 禁止以"仓库里配置了"作为验收证据。
3. 禁止在 Vercel 项目里保留会误导人的死配置文件而不加说明。

## 检测方法

```bash
BASE="${1:-https://www.mecollage.top}"
echo '--- 安全头（Phase A 后应有 4+ 项）---'
curl -sI "$BASE/" | grep -iE '^(strict-transport-security|x-content-type-options|x-frame-options|referrer-policy|permissions-policy|content-security-policy)'
echo '--- 静态资源缓存（不应以 .htaccess 为准）---'
curl -sI "$BASE/wallImage.png" | grep -i '^cache-control'
```

判定标准：线上缺少应有安全头，或缓存值仍由默认策略决定而仓库另有配置 → 复发。

## 反例

- 反例样本：`.htaccess:74-75` 声明安全头，线上 2026-11-05 实测全缺；`:62` 声明 1 年缓存，线上 4 小时。
- 错误做法：继续在 `.htaccess` 里加 CSP/缓存规则；或把 `.htaccess` 当作安全头文档。
- 正确做法（Phase A 决策，见 ADR-0001 D2）：在 `vercel.json` 加 `headers`，用 curl 验收；`.htaccess` 删除或移出部署面。

## 关联证据

- `audit/evidence/tech/01_live_headers.txt` §6-9/§13
- `audit/sections/tech-architecture.md` §4.1/§4.2
- 线上状态：2026-11-05（HSTS 之外全缺）

## 后续动作与关闭条件

- [ ] Phase A：`vercel.json` 加 4 个零风险头 + CSP-Report-Only；删除/排除 `.htaccess`（实施者）。
- [ ] Preview 验收：curl 能看到 5 项头；静态资源缓存行为符合预期。
- [ ] 关闭条件：生产验收通过 + `.htaccess` 不再被部署 + 证据归档。

## 变更记录

- 2026-11-05 open：审计确认 `.htaccess` 在 Vercel 无效（P1-11）。
- 2026-11-05 进展（待验收）：`1f9ad4c` 在 `vercel.json` 加 4 个零风险头 + CSP-Report-Only；`.htaccess` 已加入 `.vercelignore`（`460c39a`）。需 Preview/生产 curl 验收后转 mitigated。
