# L-20261105-05 — `?lang=` 重定向保留 query 造成自循环，且同类配置曾"清理后又回归"

| 字段 | 值 |
|---|---|
| ID | L-20261105-05 |
| 日期 | 2026-11-05 |
| 状态 | mitigated + **Preview 验证 PASS**（`7391c5b`；5 条均单跳、最终 URL 无 `?lang=`、无循环；2026-11-05；待生产复验） |
| 严重度 | P2 |
| 证据层 | 代码层 + 线上层 |
| 关联文件 | `vercel.json:62-72`（`?lang=en` → `destination: "/"`）；`vercel.json:13-60`（zh/es/ja/tw 4 条）；`robots.txt:4`（`Disallow: /*?lang=`） |
| 发现来源 | 2026-11-05 审计（Lead 实测）；`audit/evidence/lead/lang-redirect-behavior.txt`；`git show 6f89e10`、`git show afd3be4` |
| 负责人 | 实施者（Phase A 修 redirect）；审计者复验 |

## 症状

- 线上 `curl -L --max-redirs 5 "https://www.mecollage.top/?lang=en"` → **5 次 308 后仍循环**（curl exit 47 "Maximum redirects followed"），最终 URL 还是 `/?lang=en`。
- `?lang=zh|es|ja|tw`：单跳 308 → `/zh/?lang=zh` 等，**query 被保留**；而 `robots.txt:4` 的 `Disallow: /*?lang=` 正好屏蔽最终 URL，重定向与 robots 互相打架。
- 历史：`6f89e10`（2026-06-10）提交信息为 "Remove non-functional ?lang= query param redirects from vercel.json"，当时因"线上全部返回 200 而不是 301"删除了 5 条 `/:path*` 规则；`afd3be4`（2026-06-17）又以 `source: "/"` 的形式把它们加了回来，并引入自循环。**同类配置在 7 天内被删了又加，第二次没有重新验证边界条件。**

## 影响

- `?lang=en` 是外部可能存在的旧链接/分享链接，用户会卡在无限重定向；爬虫可能判定重定向错误。
- 其余 4 条虽能跳转，但落地 URL 带 `?lang=` 且被 robots 屏蔽，等于把用户导到一个"自己禁止抓取"的 URL。
- 配置层回归说明：删除旧配置时的原因（"Vercel 上不生效"）没有被记录成可复用的检查，导致下次以另一种写法重加时再次踩坑。

## 根因

- 直接原因：Vercel redirects 默认保留原 query；`destination: "/"` 不会清除 query，于是 `/?lang=en` → `/?lang=en` 无限循环。Vercel 语法上可在 destination 末尾加 `?` 清空 query；本分支改用更稳的空参数写法（`destination: "/zh/?lang="`），即使空参数未被移除也不会再次匹配规则，从而避免循环。行为仍需 Preview/生产实测。
- 历史原因：`6f89e10` 只删配置，没有把"为什么失效 + 正确写法 + 验收命令"写进文档/注释；`afd3be4` 改写了 `source` 形式后未测试 `?lang=en` 与循环。
- 流程原因：重定向改动没有强制"全量 lang 参数矩阵 + 跳数 + 最终 URL"验收。

## 规则

以后必须：

1. 任何 redirect/rewrite 改动，必须跑**全量矩阵**：每个 `?lang=` 值（含 `en`、非法值、无参数）、每个源路径，记录 `状态码 + 跳数 + 最终 URL`。
2. 涉及 query 的 redirect，必须显式验证 query 清除/保留是否符合预期；Vercel 可用 destination 末尾 `?` 或空参数（`?lang=`）清 query，但必须在可访问环境实测。
3. 删除/修改过的配置若再次加回，必须在变更说明中写明"上次删除原因 + 本次为何不同 + 如何证明"，并跑上次失败的用例。
4. 重定向策略与 `robots.txt` 必须同一次评审（最终 URL 不得落在 `Disallow` 规则内）。
5. 验收命令与期望输出写入 runbook/验证脚本，作为发布门禁。

禁止：

1. 禁止只看单个 308 的 `Location` 头就判定重定向正确。
2. 禁止用 `curl -I`（不跟随）代替 `curl -L` 全链路检查。
3. 禁止在未解释历史原因的情况下重新启用曾被认为"不生效"的配置。

## 检测方法

```bash
BASE="${1:-https://www.mecollage.top}"
for l in en zh es ja tw xx; do
  curl -s -o /dev/null --max-redirs 5 -L \
    -w "?lang=$l => code=%{http_code} hops=%{num_redirects} final=%{url_effective}\n" \
    "$BASE/?lang=$l"
done
```

期望（Phase A 修复后）：全部 `code=200`、`hops<=1`、`final` 不含非空 `?lang=`；`?lang=xx` 要么 200 原页、要么单跳到默认语言且不循环。空参数 `?lang=` 视为 WARN，需确认 Vercel 是否已清除。
当前（2026-11-05）：`en` 触发 curl exit 47；其余 4 条 final 仍带 `?lang=`。

## 反例

- 反例样本：`vercel.json:62-72` 的 en 规则（destination `"/"` 保留 query → 自循环）。
- 错误做法：`curl -I "https://www.mecollage.top/?lang=zh"` 看到 308 就认为"跳转正常"；没有跟到最终 URL，也没检查 `?lang` 是否残留。
- 错误做法 2：删除配置时不记录原因（`6f89e10`），一周后以不同写法重加（`afd3be4`）再次出错。
- 正确做法：destination 末尾加 `?`（`"/zh/?"`、`"/?"`），并用 `curl -L --max-redirs 5` 全量矩阵验证；历史原因写入 ADR/教训。

## 关联证据

- `audit/evidence/lead/lang-redirect-behavior.txt`
- `audit/sections/tech-architecture.md` §3.5；`audit/AUDIT-REPORT.md` P2-11 / P3-1
- `git show 6f89e10 -- vercel.json`（删除 40 行）；`git show afd3be4 -- vercel.json`（重新加回 66 行）

## 后续动作与关闭条件

- [x] Phase A：5 条 destination 改为空参数写法（`/zh/?lang=`、`/?lang=` 等），提交 `7391c5b`；**Preview 验收 BLOCKED（SSO）**，需 bypass 后跑矩阵。
- [ ] 阶段 B/后续：处理 `robots.txt:4` 与重定向策略的一致性（Phase A 写范围不含 robots.txt，作为已知遗留）。
- [ ] 关闭条件：`en` 不再循环、4 条 lang 最终 URL 无 `?lang=`、robots 冲突有明确结论、证据归档。

## 变更记录

- 2026-11-05 open：审计发现 `?lang=en` 循环与 query 保留（Lead 实测）。
- 2026-11-05 regressed：确认同类配置 2026-06-10 曾被删除、2026-06-17 又以不同写法回归；状态改为 regressed。
- 2026-11-05 进展（待验收）：`1f9ad4c` 已把 5 条 destination 改为 `/zh/?` 等（en 为 `/?`）；需在可访问的 Preview/生产上跑全量矩阵后才可转 mitigated。Preview 当前受 Vercel Authentication 阻断（见 L-20261105-12）。
