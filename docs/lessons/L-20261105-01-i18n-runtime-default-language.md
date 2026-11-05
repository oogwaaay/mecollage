# L-20261105-01 — i18n 运行时默认语言写死 `en`，本地化页首访/爬虫渲染成英文

| 字段 | 值 |
|---|---|
| ID | L-20261105-01 |
| 日期 | 2026-11-05 |
| 状态 | open |
| 严重度 | P0 |
| 证据层 | 代码层 + 线上渲染层 |
| 关联文件 | `assets/js/i18n.js:4`、`:10-12`、`:52`、`:91`、`:112-118`；36 个本地化页加载该脚本（如 `zh/index.html:1371`）；`index.html:31`、`public/tools/square/index.html:10` |
| 发现来源 | 2026-11-05 审计；`audit/sections/seo.md` §5.1；`audit/evidence/seo/rendered-comparison.csv` |
| 负责人 | 实施者修复；审计者复验 |

## 症状

- 首访（新浏览器、无 localStorage）或爬虫打开 `/es/`、`/ja/`、`/tw/`、`/zh/` 时，页面先显示本地化 HTML，随后被 JS 覆盖成英文。
- headless Chrome `--dump-dom` 实测线上：4 个本地化首页渲染后 `<html lang="en">`，可见正文与英文首页相似度 **1.0000**（均 4,478 字符）；`/zh/` 的 description 渲染后变成英文 285 字符版本。
- 16 个本地化工具页渲染后 title/description 变为英文。

## 影响

- 36 个本地化页（4 首页 + 16 法务 + 16 工具）在 Googlebot 视角下与英文页重复，hreflang 集群失效，大概率落入 "Duplicate, Google chose different canonical" 或 "Crawled – currently not indexed"。
- 真实用户（新浏览器）打开中文/日文页会看到英文 UI，多语言版本形同虚设。
- 影响面：`es/ja/tw/zh` 下 68 页中的 36 页（其余 32 个专题页不加载 i18n.js）。

## 根因

- 直接原因：`assets/js/i18n.js:4` 的 `this.currentLang = this.getSavedLanguage() || 'en'` **只读 localStorage，从不读 `location.pathname`**；爬虫/首访 localStorage 为空 → 加载 `/i18n/en.json`。
- `:52` 把 `<html lang>` 强制改成 `currentLang`；`:91` 用 `element.textContent` 覆盖 `[data-i18n]` 文本（含 `<title>`）；`:112-118` 覆盖 `meta[data-i18n-content]`。
- 为什么发生：站点同时存在「每语言独立子目录静态页」和「运行时 JS 翻译」两套机制，没有统一；多语言改动只验证了 HTML 源码，没有人验证渲染后 DOM。
- 次要同类问题（同一根因）：`i18n.js` 在 54 页加载（36 个本地化页 + 18 个英文页），英文页也承担了不必要的运行时覆盖风险。

## 规则

以后必须：

1. 语言来源优先级固定为 `URL path → 用户显式选择（localStorage/URL 参数）`；任何运行时语言初始化必须能从 `location.pathname` 推导语言。
2. 服务端已输出本地化内容的页面，禁止再用运行时 i18n 覆盖正文、`<title>`、meta description；运行时 i18n 只用于真正的单页多语言场景。
3. 多语言改动验收必须做「渲染后检查」，不能只看 `curl` 到的静态 HTML。
4. 发现同类「静态 vs 渲染」差异时，同时检查 54 个加载 i18n.js 的页面，而不是只修报错页面。

禁止：

1. 禁止把 `localStorage`/浏览器偏好作为**默认**语言来源（只能作为覆盖）。
2. 禁止让 `data-i18n` 挂在 `<title>`、`meta[data-i18n-content]` 上做 SEO 关键元数据翻译。

## 检测方法

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for l in es ja tw zh; do
  printf '/%s/ lang=' "$l"
  "$CHROME" --headless=new --disable-gpu --dump-dom "https://www.mecollage.top/$l/" 2>/dev/null \
    | grep -o '<html[^>]*lang="[^"]*"' | head -1
done
```

判定标准：任一本地化 URL 渲染后 `lang` 不等于该目录语言（es/ja/tw/zh），即复发；同时用渲染后可见文本与英文首页对比，相似度 >0.9 视为复发。
（该检查在 Phase A 分支上仍会失败——i18n 修复属于 Phase B，不在本阶段范围。）

## 反例

- 反例样本：`assets/js/i18n.js:4`（2025-12 至 2026-11 一直存在）+ `zh/index.html:1371` 无条件加载该脚本。
- 错误做法：用 `curl https://www.mecollage.top/zh/` 看到中文标题就认为"多语言正常"——这是**静态 HTML**，不是 Googlebot/用户实际看到的 DOM。
- 正确做法：改 i18n 后必须用真实渲染（headless Chrome / GSC URL Inspection 渲染快照）复核，并检查 `lang`、正文、title、description 四项。

## 关联证据

- `audit/evidence/seo/rendered-comparison.csv`、`audit/evidence/seo/rendered/rendered_{es,ja,tw,zh}_home.html`
- `audit/sections/seo.md` §5.1 / §3.2.1
- 线上抓取时间：2026-11-05（Asia/Shanghai）

## 后续动作与关闭条件

- [ ] Phase B：按 URL 推导语言；本地化页移除运行时覆盖；meta 脱离 i18n（负责人：实施者；工时 4–6h）。
- [ ] 回归：`es/ja/tw/zh` 首页与对应工具页渲染后 `lang` 正确、正文为该语言、相似度 <0.2；记录到 `audit/evidence/phase-b/`。
- [ ] 关闭条件：上述渲染检查全部通过，且 5 语言抽样截图/快照入库。

## 变更记录

- 2026-11-05 open：审计发现（`audit/AUDIT-REPORT.md` P0-1），Phase A 不修复，仅记录。
