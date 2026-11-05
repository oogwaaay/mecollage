# L-20261106-29 — “站内入链 40+”必须先定义口径（全站链接/正文链接/唯一来源页）

| 字段 | 值 |
|---|---|
| ID | L-20261106-29 |
| 日期 | 2026-11-06 |
| 状态 | mitigated（Phase E 按全站 href 出现次数达标；Preview 待生产） |
| 严重度 | P3 |
| 证据层 | 代码层 + 静态链接图 |
| 关联文件 | `audit/evidence/phase-e/link-counts.json`、`docs/phase-e/PHASE-E-SUMMARY.md` |
| 发现来源 | 维护者内链任务“从二十来次涨到 40 次以上”实施时 |

## 症状

同一句“站内入链从二十来次涨到 40 次以上”，实测三种口径差异很大：

- 全站 `<a href>` 出现次数（含 header/tool-nav）：square 56、squarecrop 43；
- 去掉 header/nav/footer 的正文内链：square 25、squarecrop 30；
- 唯一来源页：square 29、squarecrop 29（英文可索引页约 37，不可能自然到 40）。

如果只报“40+”，不写口径，验收时容易误判。

## 规则（必须）

1. 内链任务必须同时记录：全站 href 次数、正文内链次数、唯一来源页数；报告写明统计脚本与是否排除导航/footer。
2. 不应为了凑唯一来源页数，在页脚/导航重复堆链接；优先正文自然链接。
3. 目标应可达成：唯一来源页上限受可索引页总量约束；达不到时先说明口径，不虚报。
4. 验收脚本应把统计结果写入证据目录（如 `audit/evidence/<phase>/link-counts.json`）。

## 检测方法

```bash
python3 - <<'PY'
# 统计全部 href / 去 nav 后的 body href / 唯一来源页；详见 link-counts.json
PY
```

判定：只报一个数字且未说明是否含导航/是否唯一页，视为口径不清。

## 反例 / 正确做法

- 反例：宣称“内链 40+”但实际只有唯一来源页 29，或只在 footer 堆 40 个链接。
- 正确：Phase E 报 all href 56/43、body 25/30、unique 29/29，并说明 40+ 按全站出现次数满足。

## 证据

- `audit/evidence/phase-e/link-counts.json`；`audit/evidence/phase-e/seo-report.{json,md}`。
