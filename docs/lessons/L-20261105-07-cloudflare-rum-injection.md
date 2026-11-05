# L-20261105-07 — Cloudflare Web Analytics 由边缘注入，默认 curl 看不到，不能据此断言"无统计"

| 字段 | 值 |
|---|---|
| ID | L-20261105-07 |
| 日期 | 2026-11-05 |
| 状态 | mitigated（方法已修正；Dashboard 确认与隐私披露待办） |
| 严重度 | P1（结论可靠性） |
| 证据层 | 代码层 + 线上层 + 平台层 |
| 关联文件 | 仓库内无该脚本（`grep cloudflareinsights` 只命中审计证据）；`assets/*` 无统计代码 |
| 发现来源 | 2026-11-05 审计；`audit/sections/analytics.md` §1/§4；`audit/evidence/tech/02_page_weight.txt` |
| 负责人 | 审计者（取证方法）；维护者（Dashboard 确认）；实施者（隐私披露） |

## 症状

- 第一轮用默认 `curl` 抓线上 HTML：`grep -c cloudflareinsights` = **0**，据此初步判断"大概率未启用 Cloudflare Web Analytics"。
- 同一轮用浏览器渲染 / 页面权重实测：出现 `https://static.cloudflareinsights.com/beacon.min.js/...`（10,264 B 传输、`data-cf-beacon`），说明 RUM 由 Cloudflare 边缘注入。
- 2026-11-05 复核精确条件：默认 curl → 0；加 `-H 'Accept: text/html'` → **1**；只加浏览器 User-Agent → 仍 0。即触发条件是 `Accept: text/html`，不是 UA。

## 影响

- 如果按第一轮结论写"无任何统计"，会漏掉 Cloudflare RUM 对隐私政策/合规的影响，也会误判"站点完全没有数据"。
- 调研结论若被用于决策（例如"不用补统计披露"），属于**证据错误**，比缺数据更危险。
- 仓库代码中确实没有 GA4/GTM（该结论成立），但"平台层"是另一回事。

## 根因

- 平台层脚本由 Cloudflare 边缘按请求 header 动态注入，不在仓库、不在 `curl` 默认响应中。
- 取证时没有固定"模拟真实浏览器请求头"的规范；没有区分「代码层 / 线上静态层 / 平台注入层」。
- 首轮结论与后续浏览器实测不一致时，没有及时回写分报告（总报告已修正，但 `audit/evidence/analytics/live-check-log.md` 仍保留旧结论——证据文件本身也出现了口径分裂）。

## 规则

以后必须：

1. 判断"有没有统计/广告/注入脚本"时，必须分三层取证并分别标注：① 代码层（仓库 grep）② 线上静态层（curl 原始 HTML）③ 平台注入层（浏览器渲染 / 带 `Accept: text/html` 的请求 / Dashboard）。
2. 探测边缘注入时，至少用两种请求头组合对比（默认 curl vs `Accept: text/html` vs 浏览器 UA），并把**实际使用的 header 写进证据**。
3. 平台层结论标注"不确定（需 Dashboard）"，不得因外部不可见就断言不存在；也不得因一次浏览器看到就断言"已启用"（需后台确认）。
4. 发现同一问题两份证据口径冲突时，以可复现的强证据为准，并同步修正旧证据文件（加"已修正/作废"标注）。

禁止：

1. 禁止用默认 `curl` 结果断言平台层不存在某功能。
2. 禁止把"仓库里没有"等同于"线上没有"或"平台没有"。
3. 禁止在证据文件中保留已被推翻的结论而不标注。

## 检测方法

```bash
BASE="${1:-https://www.mecollage.top}"
echo -n 'default curl: ';        curl -s "$BASE/" | grep -c 'cloudflareinsights'
echo -n 'Accept text/html: ';    curl -s -H 'Accept: text/html' "$BASE/" | grep -c 'cloudflareinsights'
echo -n 'browser UA only: ';     curl -s -H 'User-Agent: Mozilla/5.0' "$BASE/" | grep -c 'cloudflareinsights'
```

期望（2026-11-05 实测）：`0 / 1 / 0`。若第二项为 1，说明边缘在注入统计脚本；需在 Cloudflare Dashboard → Web Analytics 确认启用状态，并在隐私政策中披露。

## 反例

- 反例样本：`audit/evidence/analytics/live-check-log.md` 首轮结论"从可观测特征看大概率未启用"，与同仓库 `audit/evidence/tech/02_page_weight.txt` 的 beacon 实测冲突。
- 错误做法：`curl -s URL | grep -i ga` 无结果 → 写"站点无任何统计"。
- 正确做法：代码/静态/平台三层分别取证；平台层用浏览器/真实 header 复核；拿不到 Dashboard 就写"很可能启用，待确认"。

## 关联证据

- `audit/evidence/tech/02_page_weight.txt`（beacon 10,264 B，6 个页面出现）
- `audit/sections/analytics.md` §1/§4/§B-09
- 2026-11-05 复核：`Accept: text/html` 触发注入（命令输出见上方检测方法）

## 后续动作与关闭条件

- [ ] 维护者：Cloudflare Dashboard → Analytics → Web Analytics 确认是否启用，截图/结论入库。
- [ ] 若启用：隐私政策补"无 Cookie 聚合统计"披露（与 AdSense/GA4 合规整改同批）。
- [ ] 关闭条件：Dashboard 状态有明确记录；隐私政策与实际采集一致；旧证据文件已标注修正。

## 变更记录

- 2026-11-05 open：发现首轮结论与浏览器实测冲突。
- 2026-11-05 mitigated：总报告修正为"RUM 很可能已启用"；GOVERNANCE 证据标准加入三层取证要求；Dashboard 确认与披露仍待办。
