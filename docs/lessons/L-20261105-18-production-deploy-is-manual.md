# L-20261105-18 — 生产部署不是 main push 自动上线；是手动 CLI/Dashboard，AI 执行需明确授权

| 字段 | 值 |
|---|---|
| ID | L-20261105-18 |
| 日期 | 2026-11-05 |
| 状态 | closed（Phase A 实测并已记录流程） |
| 严重度 | P2 |
| 证据层 | 平台层（Vercel/GitHub Deployments）+ 流程层 |
| 关联文件 | `docs/runbooks/preview-deploy.md` §1/§5、`docs/decisions/ADR-0001-phase-a-security-hardening.md`、`audit/evidence/phase-a/production-deploy.txt` |
| 发现来源 | Phase A 上线（2026-11-05） |
| 负责人 | 维护者（发布方式确认）/ 实施者（记录） |

## 症状

- `git push origin main`（`afd3be4..c83f393`）后，GitHub Deployments 只出现 `environment=Preview`，生产 `www.mecollage.top` 仍返回旧版本（无新安全头），等待 ~3 分钟无变化。
- 实际生产上线是通过维护者已登录的 `npx vercel deploy --prod --yes` 完成（Aliased `www.mecollage.top`）。

## 影响

- 若误以为"merge main 即上线"，会得到错误结论（以为已发布、实际未发布），或在等待中误判部署失败。
- 反向：若误以为 AI 可以随时发布，容易绕过审批门禁。

## 根因

- Vercel 项目的 Git Integration 与 Production 发布策略不是"main 自动部署"（可能配置为手动 promote / 仅 Preview 跟踪 / 生产分支不同）；仓库内无 CI 配置可证明。
- 审计阶段只能看到 Preview 记录，生产触发方式标为"待确认"；上线时实测得到答案。

## 规则

必须：

1. 每次上线前用 `gh api repos/oogwaaay/mecollage/deployments?environment=Production` 与生产响应头/`x-vercel-id` 变化确认"是否真的上线"，不要用"push 成功"当发布成功。
2. 生产发布方式以实测为准：本项目 = 维护者登录后 `npx vercel deploy --prod --yes`（或 Dashboard Promote/Deploy）。
3. **AI 执行生产部署必须同时满足**：维护者明确批准/要求（记录原话与时间）+ 源 commit 明确 + 回滚方式明确；只执行一次，并立即跑生产验收。
4. 上线后 1 小时内跑 `scripts/verify-site.mjs --base https://www.mecollage.top/` 并归档；生产验收 PASS 后才能关闭相关 `L-*`。

禁止：

1. 禁止把"main push 成功"当作"生产已上线"。
2. 禁止在无明确授权时执行 `vercel --prod` 或 Dashboard Promote。
3. 禁止上线后不做生产验收就宣布完成。

## 检测方法

```bash
# 1) 生产是否真的更新（前后对比响应头 / etag / x-vercel-id）
curl -sI https://www.mecollage.top/ | grep -iE 'x-content-type-options|x-frame-options|x-vercel-id'
# 2) GitHub Deployments 环境
gh api "repos/oogwaaay/mecollage/deployments?per_page=5" --jq '.[] | "\(.environment) \(.ref[0:7]) \(.created_at)"'
# 3) 生产验收
node scripts/verify-site.mjs --base https://www.mecollage.top/ --label production
```

## 反例

- 反例：push main 后看到 GitHub Deployment 成功（environment=Preview）就宣布"已上线"——生产实际未变。
- 正确：Phase A = Preview 38 PASS → 维护者"批准上线" → `npx vercel deploy --prod --yes` → 生产验收 41 PASS/0 FAIL/2 WARN → 归档。

## 关联证据

- `audit/evidence/phase-a/production-deploy.txt`
- `audit/evidence/phase-a/approval.md`（批准原话与时间）
- `audit/evidence/phase-a/verification/post-release-prod.{json,md}`
- `gh api repos/oogwaaay/mecollage/deployments`

## 后续动作与关闭条件

- [x] 实测生产发布方式并写入 runbook/AGENTS。
- [x] 生产验收 PASS 并归档。
- [x] 维护者批准记录归档。
- [ ] 下一次发布复核该流程仍成立（Vercel 设置可能变化）。
