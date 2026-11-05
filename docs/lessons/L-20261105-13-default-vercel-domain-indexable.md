# L-20261105-13 — 默认域名 `mecollage.vercel.app` 可索引，与主域重复内容

| 字段 | 值 |
|---|---|
| ID | L-20261105-13 |
| 日期 | 2026-11-05 |
| 状态 | mitigated（分支 `1f9ad4c` 加 host noindex；Dashboard 301 待维护者；生产复验） |
| 严重度 | P2 |
| 证据层 | 线上层 + 平台层 |
| 关联文件 | 无仓库配置（默认域名由 Vercel 项目层控制）；GitHub 仓库 `homepage` 字段指向 `https://mecollage.vercel.app` |
| 发现来源 | 2026-11-05 审计；`audit/sections/tech-architecture.md` §3.4；`audit/AUDIT-REPORT.md` P2-4 |
| 负责人 | 实施者（`vercel.json` host 级 noindex）；维护者（Dashboard 301） |

## 症状

- `https://mecollage.vercel.app/` 返回 **200**，与主域 `https://www.mecollage.top/` 同内容，响应头**无 `X-Robots-Tag`**（2026-11-05 复核）。
- GitHub 仓库 homepage 也指向该默认域名，进一步增加被搜索引擎当作主站/重复站点的概率。
- Vercel 默认域名无法在仓库中删除，只能通过项目配置/Dashboard 处理。

## 影响

- 搜索引擎可能把默认域名当作重复站点（重复内容、canonical 竞争、权重分散）。
- 外部平台/开发者文档可能引用默认域名，形成第二入口。
- 与主域之间没有强制跳转，用户可能在不同域名间跳转，统计与 cookie 归属混乱。

## 根因

- 使用 Vercel 默认域名上线时，默认没有 noindex/301；项目设置里没有把默认域名收敛到主域。
- 仓库层无法控制 host 级行为，需要 `vercel.json` 的 `has: [{type: "host"}]` 或 Dashboard 配置；此前没人处理。

## 规则

以后必须：

1. 新增/迁移域名时，明确唯一规范域（本项目 = `https://www.mecollage.top/`）；其他入口（vercel.app、apex、http）全部 301 或 noindex。
2. 默认域名使用 host 级 `X-Robots-Tag: noindex`（`vercel.json` headers + `has: host`），并在 Dashboard 配置 301 到主域（双保险）。
3. 域名相关变更必须在 Preview/生产上验证响应头与跳转，不能只改仓库。
4. 任何新域名入口接入前先写 ADR（谁是规范域、如何跳转、如何验收）。

禁止：

1. 禁止让默认域名与主域同时可索引。
2. 禁止只改仓库不验证 host 级行为（host 条件、Dashboard 设置都可能不生效）。
3. 禁止在 GitHub homepage 等外部资料继续指向非规范域。

## 检测方法

```bash
echo '--- 默认域名 ---'
curl -sI 'https://mecollage.vercel.app/' | grep -iE '^(HTTP/|x-robots-tag|location)'
echo '--- 主域 canonical ---'
curl -s 'https://www.mecollage.top/' | grep -o '<link rel="canonical"[^>]*>' | head -1
```

期望（Phase A 后）：默认域名响应含 `x-robots-tag: noindex`（或 301 到主域）；主域 canonical 指向主域。
当前（2026-11-05）：默认域名 200、无 x-robots-tag。

## 反例

- 反例样本：`mecollage.vercel.app` 200 无 noindex（2026-11-05 实测）。
- 错误做法：只删 GitHub homepage 字段，认为搜索引擎就不会收录默认域名。
- 正确做法（ADR-0001 D5）：`vercel.json` 加 host 级 noindex + 维护者 Dashboard 设 301；Preview/生产验收 header 与跳转。

## 关联证据

- `audit/sections/tech-architecture.md` §3.4
- 2026-11-05 复核：`HTTP/2 200`，无 `x-robots-tag`
- `gh api repos/oogwaaay/mecollage --jq .homepage` = `https://mecollage.vercel.app`

## 后续动作与关闭条件

- [ ] Phase A：`vercel.json` host 级 `X-Robots-Tag: noindex`；维护者 Dashboard 配置默认域 301 → 主域（人工步骤）。
- [ ] 验收：默认域响应头含 noindex 或 301；主域 200 正常。
- [ ] 关闭条件：两处均验证通过；GitHub homepage 改为主域；证据归档。

## 变更记录

- 2026-11-05 open：审计确认（P2-4）。
- 2026-11-05 进展（待验证）：`1f9ad4c` 已加 host 条件 `X-Robots-Tag: noindex, nofollow`（host = `mecollage.vercel.app`）；Dashboard 301 仍需维护者操作。host 条件只能在生产域复验。
