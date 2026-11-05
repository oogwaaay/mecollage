# L-20261105-09 — 68 个本地化页不在 sitemap、52 页零入链，语言切换器不是链接

| 字段 | 值 |
|---|---|
| ID | L-20261105-09 |
| 日期 | 2026-11-05 |
| 状态 | **closed**（Phase B：语言切换锚点 + 68 页 sitemap + 本地化内链 + 语言 nav；BFS 94/94） |
| 严重度 | P0（多语言投入无效） |
| 证据层 | 代码层 + 线上层 |
| 关联文件 | `index.html:1043-1055`（`<button data-lang=...>` 语言切换器）；`assets/js/i18n.js:145-161`（只改内存/localStorage，不改 URL）；`sitemap.xml`（26 条 `<loc>`）；`es/ja/tw/zh` 各 17 页 |
| 发现来源 | 2026-11-05 审计；`audit/sections/seo.md` §5.2/§8；`audit/evidence/seo/page-inventory.csv`、`internal-links.csv` |
| 负责人 | 实施者（Phase B 修内链/sitemap）；维护者决策低价值页去留 |

## 症状

- sitemap 只有 **26 条英文 URL**；68 个本地化页（4 语言 × 17 页）**0 条**作为 `<loc>` 出现，仅作为 hreflang alternate 被引用。
- 52 个本地化页入链 = 0；从首页做 BFS，70 个文件（68 本地化页 + `test-section.html` + `404.html`）没有 `<a>` 路径可达。
- 语言切换器是纯 JS `<button>`（`index.html:1043-1055`），点击后 `i18n.js` 只 `loadTranslation` + `applyTranslation`，**不改变 URL**；英文页没有任何指向本地化页的 `<a>`。
- 反向导流：本地化首页把用户导向英文专题页（如 `es/index.html:1250-1278` 锚文本西语、`href` 是英文页）。

## 影响

- 即使修好 i18n 渲染 bug（L-20261105-01），Google 也缺少内链与 sitemap 信号把本地化页当正式版本；多语言投入（68 页）几乎无效。
- 用户无法通过语言切换 URL 到达对应语言页；分享/收藏的语言版本不可寻址。
- hreflang 集群只有"单向 alternate"，与 sitemap/内链不一致。

## 根因

- 多语言实现停留在"运行时翻译"：语言切换是纯前端状态，不产生可抓取 URL。
- 迁移子目录静态页（2026-06-09 `4943220`）后，只生成了本地化 HTML 与 hreflang，没有同步：
  - sitemap `<loc>`；
  - 语言切换器 `<a href>`；
  - 本地化页之间的内链/导航；
  - 低价值页的 noindex/去留决策。
- 没有"站点链接图"验收（从首页 BFS 是否可达全部可索引页）。

## 规则

以后必须：

1. 每个可索引 URL 必须至少有一个入口：sitemap `<loc>` 或站内 `<a href>`；新增页面时两者至少补一个，并跑 BFS 验收。
2. 语言切换必须是真实链接（`<a href>` + `hreflang`），JS 只做增强；禁止纯 button 切换作为唯一入口。
3. sitemap/hreflang/内链/语言切换器必须由同一份「页面 × 语言」数据生成或同一变更同步更新。
4. 本地化页上线的同一变更内，必须决定：进 sitemap 并做内链，或 noindex 且从 hreflang/sitemap 移除；不允许"存在但不可达也不 noindex"。
5. 从首页 BFS 验收：所有可索引页必须可达。

禁止：

1. 禁止只加 hreflang 就认为本地化页会被收录。
2. 禁止新增语言页却不改语言切换器、sitemap、内链。
3. 禁止本地化页的锚文本指向其他语言的 URL（语言错配导流）。

## 检测方法

```bash
cd /Users/keyi/mecollage
# 1) 各语言页数 vs sitemap 条目数（当前应为 17 vs 0）
for d in es ja tw zh; do
  printf '%s: html=%s sitemap_loc=%s\n' "$d" \
    "$(git ls-files "$d/*.html" | wc -l | tr -d ' ')" \
    "$(grep -c "mecollage.top/$d/" sitemap.xml)"
done
# 2) 语言切换器是否为真实链接（当前 <button> 数量 = 5，<a> 指向本地化页 = 0）
grep -c 'class="lang-option"' index.html
grep -o '<a [^>]*href="/\(es\|ja\|tw\|zh\)/' index.html | wc -l
# 3) 粗略入链复算（精确结论以 audit/evidence/seo/internal-links.csv 为准）
python3 - <<'PY'
import re, pathlib, collections
pages = [p for p in pathlib.Path('.').rglob('*.html') if 'audit' not in p.parts]
refs = collections.Counter()
for p in pages:
    for h in re.findall(r'href="(/[^"#?]*)"', p.read_text('utf-8', errors='ignore')):
        refs[h.rstrip('/') or '/'] += 1
loc = [p for p in pages if p.parts[0] in {'es','ja','tw','zh'}]
def url(p):
    s = '/' + p.as_posix(); s = re.sub(r'index\.html$', '', s); return s.rstrip('/')
zero = [u for p in loc if refs.get(url(p), 0) == 0 for u in [url(p)]]
print('localized pages:', len(loc), 'zero-inlink:', len(zero))
PY
```

期望（Phase B 后）：sitemap 条目与内链覆盖所有决定索引的本地化页；零入链 = 0（被 noindex 的页不计）。
当前：`es: html=17 sitemap=0` 等；零入链约 52。

## 反例

- 反例样本：sitemap 仅 26 条英文 URL；`index.html:1043-1055` 的 button 切换器；`es/index.html:1250-1278` 的西语锚文本指向英文页。
- 错误做法：只改 sitemap 加 68 条，但不解决内链/内容质量 → 变成"提交一堆不可达薄页"。
- 正确做法：先决策哪些本地化页值得索引（36 个核心页 vs 32 个模板专题页），再统一生成 sitemap/hreflang/内链，最后用 BFS 验收。

## 关联证据

- `audit/evidence/seo/page-inventory.csv`、`internal-links.csv`、`sitemap-issues.csv`
- `audit/sections/seo.md` §5.2、§8；`audit/AUDIT-REPORT.md` P0-2
- sitemap 26 条与线上 26/26 200：`audit/evidence/seo/live-status.csv`

## 后续动作与关闭条件

- [x] Phase B：语言切换器改 `<a href>`；本地化内链 348 处；sitemap 94 URL；BFS 94/94 可达（2026-11-05）。
- [ ] 维护者决策：32 个本地化专题页 noindex/删除 vs 重写（本轮先全部保留索引，观察 GSC；属内容质量阶段）。
- [x] 关闭条件达成（2026-11-05）：可索引页全部有入口、sitemap/hreflang/内链一致、BFS 94/94、证据归档；内容质量决策另列。

## 变更记录

- 2026-11-05 open：审计发现（P0-2）。
- 2026-11-05 closed：语言切换锚点 + 语言 nav + 94 URL sitemap + 本地化内链；SEO harness C/D/E 全 PASS。
