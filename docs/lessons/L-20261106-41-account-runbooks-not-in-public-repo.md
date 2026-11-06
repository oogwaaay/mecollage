# L-20261106-41：账户级/内部操作 runbook 不得提交到公开仓库

| 字段 | 值 |
|---|---|
| ID | L-20261106-41 |
| 日期 | 2026-11-06 |
| 状态 | mitigated |
| 严重度 | P1 |
| 证据层 | 代码层（仓库可见性）+ 平台层（Cloudflare / Vercel 账户操作） |
| 关联文件 | `GOVERNANCE.md` C1；`AGENTS.md` §8 第 21 条；`docs/runbooks/contact-email-routing.md`（已从公开仓库移除）；`audit/runbooks/contact-email-routing.md`（本地私有副本，gitignored） |
| 发现来源 | 维护者复核：公开仓库不应出现账户级操作清单（PR #9 后指出） |
| 负责人 | 实施者（移除+规则）/ 维护者（确认公开/私有边界） |

## 症状（可观察到的事实）

2026-11-06，AI 在公开仓库 `oogwaaay/mecollage` 新增并合并 `docs/runbooks/contact-email-routing.md`（PR #9）：Cloudflare Email Routing 的账户级操作清单。维护者指出"我们不是开源的项目吗？直接把这个操作清单提交到仓库，这对吗？"。

事实核查（2026-11-06 16:1x）：

- 文件内**没有**真实个人邮箱、API key、token、account ID、密码；只有公开域名 `mecollage.top` 与占位 `you@gmail.com`。
- 生产站不可达：`/docs/runbooks/contact-email-routing.md` → **404**（`.vercelignore` 已排除 `docs/`，H4 部署边界未破）。
- 但仓库是 **public**：文件与 PR #9 对所有人可见；同类账户级操作说明不应默认进入公开仓库。
- 处理：PR #10 从当前树移除该文件，本地副本保留在 gitignored 的 `audit/runbooks/`；Git 历史/PR #9 仍公开（无敏感信息，不做历史改写）。

## 影响

- 对用户：无直接影响（清单未部署、无个人数据）。
- 对 SEO / 广告 / 安全 / 成本：无直接泄露；但公开了账户操作路径（启用邮件路由、destination 验证、MX 变更、回滚），增加了被社工/误操作参照的风险；降低了"公开仓库 = 产品与通用工程文档"的边界清晰度。
- 影响面量化：1 个文件、1 次公开 PR/commit；`docs/` 不在部署面（404）。

## 根因

1. 把 `docs/`（C1 文档类变更，`GOVERNANCE.md` C1 允许合并）等同于"可以公开"——C1 只定义**部署边界**（`.vercelignore`），没有定义**仓库可见性边界**。
2. 缺少一条明确规则：账户级/内部操作 runbook（DNS、邮箱、密钥、账户设置、发布账号流程）默认**私有**。
3. 实施时只做了 H4（部署面 404）核对，没有做"公开仓库可见性"核对；对"开源项目"的默认公开属性敏感度不足。

## 规则（以后必须 / 禁止做什么）

1. **公开仓库只放**：产品代码/资源、公开设计文档、通用工程文档、教训/ADR（不含账户秘密）、可公开的验证脚本。
2. **账户级/内部操作 runbook 默认私有**：Cloudflare/邮箱/DNS/AdSense/GA4/Cloudinary/Vercel 账户设置、密钥轮换、发布账号流程等，放私有知识库、密码管理器或**本地 gitignored** 目录（如 `audit/runbooks/`）。
3. 若确需在公开仓库记录，先由维护者明确同意，并做**脱敏**（去掉真实邮箱、账户 ID、内部 URL、个人路径、token）。
4. 新增 `docs/**` 变更时，**先问一句"这份内容公开是否合适"**，再决定是否提交；不要因为 `docs/` 不部署就默认公开。
5. 已经公开且含敏感信息的，按 H3/H8 走"停止扩散 → 维护者处置"；不自行改写 git 历史（H10）。

## 检测方法

- 提交前对新增文档做敏感信息扫描：
  ```bash
  git diff --cached --name-only | xargs grep -nE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|api[_-]?key|token|secret|account[ _-]?id|password' || true
  ```
- 检查文件性质：包含 "Cloudflare / Vercel / AdSense / DNS / MX / API key / 账户" 等账户操作关键词 → 默认不进公开仓库。
- 检查仓库可见性：`gh repo view oogwaaay/mecollage --json visibility` 必须为 `PUBLIC` 时才按公开仓库规则审。
- 定期审计 `docs/runbooks/`、`docs/decisions/` 是否出现账户级 SOP（grep 关键词）。

## 反例

- PR #9：`docs/runbooks/contact-email-routing.md` 含 Cloudflare Email Routing 启用/MX/回滚步骤，被合并到 public 仓库（无密钥，但属于账户级 SOP）。
- 误判："`.vercelignore` 排除了 `docs/`，所以 docs 安全"——这只证明线上 404，不证明仓库不公开。

## 关联证据

- PR #9（已合并，公开历史）：https://github.com/oogwaaay/mecollage/pull/9
- PR #10（移除当前树）：https://github.com/oogwaaay/mecollage/pull/10
- 生产 404：`curl -s -o /dev/null -w '%{http_code}' https://www.mecollage.top/docs/runbooks/contact-email-routing.md` → `404`
- 本地私有副本：`audit/runbooks/contact-email-routing.md`（`audit/` gitignored，不入库、不部署）

## 后续动作 / 关闭条件

- [x] 从公开仓库当前树移除该文件（PR #10）。
- [x] 本地保留私有副本，后续交付通过会话/私有渠道。
- [x] `GOVERNANCE.md` / `AGENTS.md` 增加"公开仓库 vs 私有 runbook"规则。
- [ ] 维护者确认是否需要对历史公开内容做其他处置（无敏感信息，默认不重写历史）。
- [ ] 下一次 `docs/**` 变更时按本规则做"公开是否合适"判断。

## 变更记录

| 日期 | 变更 |
|---|---|
| 2026-11-06 | 新建；mitigated（PR #9 引入 → PR #10 移除当前树 + 规则回灌） |
