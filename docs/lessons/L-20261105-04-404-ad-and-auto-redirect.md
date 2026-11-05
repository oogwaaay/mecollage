# L-20261105-04 — 404 页挂 AdSense + JS 自动跳转，且 `/404/` 返回 200（软 404）

| 字段 | 值 |
|---|---|
| ID | L-20261105-04 |
| 日期 | 2026-11-05 |
| 状态 | mitigated + **Preview 验证 PASS**（`9b950c5`；2026-11-05；待生产复验） |
| 严重度 | P1 |
| 证据层 | 代码层 + 线上层 |
| 关联文件 | `404.html:8-27`（`location.replace('/index.html'…)`；`:27` AdSense 脚本）；`vercel.json` 的 `cleanUrls`/`trailingSlash` 行为 |
| 发现来源 | 2026-11-05 审计；`audit/sections/adsense.md` A-07；`audit/sections/seo.md` §1.3；`audit/evidence/adsense/live/404.html` |
| 负责人 | 实施者（Phase A 改造）；审计者复验 |

## 症状

- 不存在的 URL 返回 **404 状态码**，但响应体是 `404.html`：正文只有 `Redirecting...`，内联 JS 在加载时 `location.replace` 跳回首页，同时 `<head>` 加载 AdSense（`client=ca-pub-9280689992387509`）。
- `https://www.mecollage.top/404/`（以及 `/404` 经 308）返回 **200**，被当作普通可索引页面；`/test-section/` 同样 200（内部测试页）。
- 2026-11-05 复核线上不存在的 URL：`status=404`，响应体命中 `adsbygoogle|location.replace` 共 3 处。

## 影响

- 违反 AdSense ad placement policies（禁止在 auto-redirect 页面放广告；无内容页挂广告影响审核），是 AdSense 整改清单 P1 项。
- 软 404：`/404/` 200 可被索引，浪费抓取预算、稀释质量信号；错误 URL 被 JS 强制跳首页，用户与爬虫都拿不到有效错误提示。
- 404 页本应是"帮助用户找到正确页面"的导航页，当前完全无法导航。

## 根因

- `404.html` 是 GitHub Pages 时代的 SPA fallback 逻辑（历史提交 `b4089b5` 即存在，`d332785`"添加 ads.txt"时又加了 AdSense 脚本），迁移 Vercel 后未清理。
- Vercel 对根目录 `404.html` 的两种行为叠加：不存在的路径用它作为 404 响应体；而 `/404/` 路径又能直接命中该文件并返回 200（cleanUrls + trailingSlash）。
- 没有"错误页/内部页不能进生产"的检查项。

## 规则

以后必须：

1. 404 页面：返回 404 状态码；不含广告/统计脚本；不做 JS 自动跳转；提供正常导航（首页/工具/帮助链接）；带 `noindex`。
2. `/404/` 这类"404 页自身的 URL"必须显式处理：`noindex` + 不进 sitemap + 验收脚本检查其状态与标记；平台无法把它变 404 时，把残余风险写入 ADR。
3. 错误页验收必须用「不存在的 URL」实测，而不是只看 `404.html` 源码。
4. 任何页面模板新增广告/统计代码时，排除 `404.html`、隐私/条款页。

禁止：

1. 禁止在 404 页放广告、GA4、CMP 弹窗或自动跳转。
2. 禁止用 JS `location.replace` 把 404 变成"隐形重定向"。
3. 禁止把内部测试页（`test-section.html`）部署到生产。

## 检测方法

```bash
BASE="${1:-https://www.mecollage.top}"
# 1) 不存在的 URL 应为 404，且响应体无 ads/redirect
curl -s -o /tmp/404-check.html -w 'status=%{http_code}\n' "$BASE/governance-probe-does-not-exist/"
grep -cE 'adsbygoogle|location\.replace|pagead2' /tmp/404-check.html   # 期望 0
grep -ci 'noindex' /tmp/404-check.html                                 # 期望 >=1
# 2) /404/ 的状态与标记（Phase A 后应 200 + noindex，残余风险见 ADR-0001）
curl -s -o /tmp/404path.html -w '/404/ status=%{http_code}\n' "$BASE/404/"
grep -ci 'noindex' /tmp/404path.html
# 3) 内部测试页应 404
curl -s -o /dev/null -w '/test-section/ => %{http_code}\n' "$BASE/test-section/"
```

判定标准：不存在 URL 非 404、或响应体出现 ads/redirect、或 `/test-section/` 非 404、或 `/404/` 无 noindex → 复发。

## 反例

- 反例样本：`404.html:8-27`（GitHub Pages fallback + AdSense）；线上 `/404/` 200、`/test-section/` 200（2026-11-05 复核）。
- 错误做法：只把 AdSense 脚本删了，保留 `location.replace`；或只改文件不看 `/404/` 200。
- 正确做法（Phase A 决策，见 ADR-0001 D1）：移除广告与自动跳转、加 `noindex`、加正常导航、保留 404 状态；`/404/` 的 200 属于 Vercel 平台行为，用 noindex + 验收脚本 + ADR 记录残余风险。

## 关联证据

- `audit/evidence/adsense/live/404.html`（线上 404 响应体原文）
- `audit/sections/adsense.md` A-07；`audit/sections/seo.md` §1.3
- 2026-11-05 复核命令输出（`adsbygoogle|location.replace` 命中 3）

## 后续动作与关闭条件

- [ ] Phase A：重写 `404.html`（去广告/去 JS 跳转/正常导航/noindex）；删除 `test-section.html`；`/404/` 加 noindex（实施者）。
- [ ] Preview 验收：上述 3 条检测全部通过，证据存 `audit/evidence/phase-a/verification/`。
- [ ] 关闭条件：生产验收通过 + 残余风险（`/404/` 200）在 ADR 中记录并接受。

## 变更记录

- 2026-11-05 open：审计发现（`audit/AUDIT-REPORT.md` P0-6 / P2-3）；Phase A 分支实施中。
- 2026-11-05 进展（待验收）：`9b950c5` 重写 404 页（去广告/去 JS 跳转/正常导航/noindex）；`b2a3924` 删除 `test-section.html`；`1f9ad4c` 为 `/404`、`/404/` 加 `X-Robots-Tag: noindex`。未部署生产，状态仍 open。
