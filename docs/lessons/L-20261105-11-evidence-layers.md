# L-20261105-11 — 审计结论必须区分「代码层 / 线上层 / 平台层」证据，静态 curl 会骗人

| 字段 | 值 |
|---|---|
| ID | L-20261105-11 |
| 日期 | 2026-11-05 |
| 状态 | mitigated（证据标准已固化到 GOVERNANCE；由后续审计执行） |
| 严重度 | P1（结论可靠性） |
| 证据层 | 代码层 + 线上层 + 平台层 |
| 关联文件 | 全仓；典型样本：`assets/js/i18n.js:4`（代码层正常但渲染错误）、`audit/evidence/analytics/live-check-log.md`（默认 curl 漏 RUM）、`vercel.json`（代码层重定向，行为需线上验证） |
| 发现来源 | 2026-11-05 审计全过程；`audit/AUDIT-REPORT.md` §10、`audit/sections/analytics.md` 三层表 |
| 负责人 | 审计者（取证）；维护者（Dashboard 确认）；实施者（Preview 验收） |

## 症状

同一问题在不同取证方式下结论相反的真实样例：

1. **i18n**：`curl /zh/` 看静态 HTML 是中文 → 结论"多语言正常"；headless Chrome 渲染后是英文、`lang=en` → 真正结论是"本地化页对 Googlebot 失效"。
2. **统计**：默认 curl 无 `cloudflareinsights` → 结论"无统计"；带 `Accept: text/html` 或浏览器渲染有 beacon → 平台层实际有 RUM。
3. **部署方式**：仓库无 CI/无 workflow → 无法从代码判断是否 Git 集成；GitHub Deployments API 显示 vercel[bot] 的 Preview 记录 → 可确认集成存在，但生产触发方式仍需 Dashboard。
4. **Cloudinary preset**：代码里有 unsigned preset + 线上文件可下载 → 能确认"暴露面"，但 preset 是否有效只能在 Cloudinary 控制台确认。
5. **Auto ads / Publisher ID 归属 / GA4 是否启用**：外部不可见，只能标"不确定（需后台）"。

## 影响

- 把"代码层没有"写成"线上没有/平台没有"，会得出相反的行动建议（例如漏掉隐私披露、误判可跳过 CMP）。
- 把"线上静态层正常"当成"用户看到正常"，会漏掉 JS 渲染/平台注入导致的问题。
- 审计报告的可信度取决于是否标注不确定；一旦发现"推断当事实"，后续所有结论都会被质疑。

## 根因

- 缺少统一的证据分层模型；每类问题按最方便的工具取证。
- 没有把"取证条件（URL、header、时间、工具版本）"写进证据，导致结论不可复现。
- 没有"不确定项清单"强制标注机制。

## 规则

以后必须：

1. 每条结论标注证据层：**[代码层] / [线上层] / [平台层]**；跨层结论要分别给证据。
2. 线上层必须记录：URL、HTTP 状态、重定向链、请求 header（尤其 `Accept`/`User-Agent`）、时间；涉及 JS 渲染的必须给渲染后 DOM/截图。
3. 平台层（Vercel/Cloudflare/AdSense/GA4/Cloudinary/GSC）能确认的写"已确认 + 确认方式"；不能确认的写"不确定（需要什么才能确认）"，并进入不确定项清单。
4. 审计/修复报告中禁止把推断写成事实；推断必须带"推断依据"和"验证方式"。
5. Preview/生产验收要区分"部署成功"与"行为正确"：部署成功只证明构建/上传，不证明重定向/头部/渲染正确。

禁止：

1. 禁止只用一个工具/一层证据下全站结论。
2. 禁止用 `curl` 默认请求头判断平台注入或浏览器行为。
3. 禁止在报告里省略"不确定"以显得结论完整。

## 检测方法

流程性检查（每条 finding 自检）：

```bash
# 证据里必须能回答：
# 1) 用的是哪一层？ 2) 命令/工具是什么？ 3) 时间与 header？ 4) 结论是事实还是推断？
# 示例：静态 vs 渲染对照
curl -s "https://www.mecollage.top/es/" > /tmp/static.html
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --disable-gpu --dump-dom "https://www.mecollage.top/es/" > /tmp/rendered.html
grep -o '<html[^>]*lang="[^"]*"' /tmp/static.html /tmp/rendered.html
```

判定标准：任一 finding 无法复现、未标注层、或"不确定"缺失 → 审计不合格，退回补充。

## 反例

- 反例样本：`audit/evidence/analytics/live-check-log.md` 首轮"无统计"结论（仅默认 curl）与 `02_page_weight.txt` 的 beacon 实测冲突。
- 错误做法：`curl URL | grep -i gtag` 无命中 → 报告写"站点没有任何统计/分析"。
- 正确做法：三层分别取证，平台层标注"很可能启用，待 Dashboard"；证据文件冲突时修正并标注。

## 关联证据

- `audit/AUDIT-REPORT.md` §0.5、§10（不确定项清单）
- `audit/sections/analytics.md` §1 三层表
- `audit/evidence/lead/`（Lead 独立复核矩阵）

## 后续动作与关闭条件

- [ ] 本教训的方法要求已写入 `GOVERNANCE.md` §证据标准；新审计按该标准执行。
- [ ] 关闭条件：下一次完整审计/修复报告全部 finding 满足分层与标注要求，且无"推断当事实"被复核发现。

## 变更记录

- 2026-11-05 open：审计过程中出现真实反例并纠正。
- 2026-11-05 mitigated：证据标准入库（GOVERNANCE），作为后续默认要求。
