# L-20261105-12 — 所有生产变更必须 Preview 先行并留验收证据

| 字段 | 值 |
|---|---|
| ID | L-20261105-12 |
| 日期 | 2026-11-05 |
| 状态 | open（首次完整应用 = Phase A；当前验收 BLOCKED：Preview 受 Vercel Authentication 保护） |
| 严重度 | P0（流程门禁） |
| 证据层 | 平台层 + 线上层 |
| 关联文件 | `vercel.json`、`404.html`、`.vercelignore`；`scripts/verify-site.mjs`（Phase A 工具）；`docs/runbooks/preview-deploy.md` |
| 发现来源 | 2026-11-05 审计 §2.6（无构建/无 CI/无回滚保障）；Lead 通过 GitHub Deployments 确认 Vercel Git 集成 |
| 负责人 | 实施者（执行）；维护者（批准） |

## 症状

- 仓库无 `.github/workflows`、无 CI、无部署脚本；审计确认"线上内容 = HEAD"但无法从仓库判断自动部署流程。
- 历史操作直接在 `main` 上产生内容提交（如 `afd3be4` 同时改 96 页 + vercel.json + sitemap），没有 Preview 验收记录，导致 `?lang=en` 循环、软 404 等问题直接进入生产。
- 没有证据规范：改完后没有"改前/改后 curl 输出、渲染快照、验证脚本结果"的归档。

## 影响

- 配置类变更（重定向/头部/404）一旦出错影响全站，而 96 页手写站没有自动回归。
- 出了事故无法快速判断"哪次部署引入、如何回滚"，回滚靠手工改文件风险更高。
- AI 会话若被允许直接部署生产，会把"未经验证的改动"风险放大。

## 根因

- 没有发布门禁：分支 → Preview → 验收 → 批准 → 生产的流程未定义。
- 没有可复用的验收脚本（Phase A 才引入 `scripts/verify-site.mjs`）。
- 把"文件已提交/部署成功"当作"行为正确"。

## 规则

以后必须：

1. 生产变更唯一路径：**分支 → push → Preview 部署 → 验收脚本 + 人工抽查 → 证据归档 → 维护者明确批准 → 生产**。
2. AI 会话禁止执行生产部署（`vercel --prod`、Dashboard promote/rollback、merge 触发生产），除非维护者对本轮明确批准。
3. 验收必须包含：`scripts/verify-site.mjs --base <preview-url>` 输出（PASS/FAIL/WARN + 退出码）与至少 1 份人工抽查记录（curl/渲染截图）。
4. 验收证据存入 `audit/evidence/phase-a/verification/`（或对应阶段目录），文件名含 commit sha 与时间。
5. Preview 验收失败必须修复后重新部署，禁止"带着已知失败合并"。
6. 合并/上线前必须写清回滚方式（revert commit / 重部署上一版本）。

禁止：

1. 禁止直接改 `main`（文档类分支也需维护者合并）。
2. 禁止用"本地打开正常"替代 Preview 验收。
3. 禁止在无 Preview 证据的情况下声称"已验证"。
4. 禁止 AI 自行处理 Preview 的 Deployment Protection 凭据（由维护者提供或代跑）。

## 检测方法

```bash
cd /Users/keyi/mecollage
SHA=$(git rev-parse HEAD)
gh api "repos/oogwaaay/mecollage/deployments?sha=$SHA&per_page=5" \
  --jq '.[] | [.id,.environment,.sha[0:7],.created_at] | @tsv'
# 取最新 deployment ID 的 status
gh api "repos/oogwaaay/mecollage/deployments/<ID>/statuses" \
  --jq '.[0] | {state,environment_url}'
node scripts/verify-site.mjs --base "<environment_url>"
```

判定标准：无 Preview 记录、无 verify 输出、verify 退出码非 0、或没有维护者批准记录 → 变更不得进入生产。
注意：当前 Preview URL 受 Vercel Authentication 保护（未认证返回 302 到 SSO），验收需维护者提供 bypass 或代跑；详见 runbook。

## 反例

- 反例样本：`afd3be4` 直接进生产后 `?lang=en` 自循环、404 页挂广告（2026-11-05 线上仍存在）。
- 错误做法："本地改了 vercel.json，觉得没问题，直接 push main"。
- 正确做法：Phase A 流程（见 `docs/runbooks/preview-deploy.md`）：分支 → Preview → 验收矩阵 → 证据 → 维护者批准 → 生产；ADR-0001 记录决策。

## 关联证据

- `audit/AUDIT-REPORT.md` §2.6、§7；`docs/decisions/ADR-0001-phase-a-security-hardening.md`
- GitHub Deployments：`gh api repos/oogwaaay/mecollage/deployments`（vercel[bot]，environment=Preview）
- 2026-11-05 实测：Preview URL 302 → `vercel.com/sso-api`

## 后续动作与关闭条件

- [ ] Phase A：按 runbook 完成首次 Preview 验收并归档证据；维护者批准后才生产。
- [ ] 维护者确认生产部署触发方式（Git 集成自动 / 手动 promote），写入 runbook。
- [ ] 关闭条件：至少一次完整走通"分支 → Preview → 验收 → 批准 → 生产 → 生产验收"并留证。

## 变更记录

- 2026-11-05 open：确立为治理门禁；Phase A 首次执行。
- 2026-11-05 进展（BLOCKED）：分支 `b2a3924` 已生成 Preview deployment `7570103062`（environment_url `https://mecollage-9fibvzr1t-keeey-is-projects.vercel.app`）；但未认证访问 302 到 Vercel SSO，`verify-site.mjs` 判定 BLOCKED（退出码 2）。验收未完成，不得请求生产批准；处理方式见 `docs/runbooks/preview-deploy.md` §3。
