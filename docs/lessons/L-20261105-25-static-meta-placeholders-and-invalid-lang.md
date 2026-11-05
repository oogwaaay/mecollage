# L-20261105-25 — SEO meta 必须是静态真实文本；`html lang` 不得用 x-default

| 字段 | 值 |
|---|---|
| ID | L-20261105-25 |
| 日期 | 2026-11-05 |
| 状态 | closed（Phase B 修复；D3/A3 PASS） |
| 严重度 | P1 |
| 证据层 | 静态 HTML + 浏览器渲染 |
| 关联文件 | 100 个 `meta[data-i18n-content]` 标签；6 个 `<html lang="x-default">` 页面（about/blog/contact + 3 个工具页） |
| 发现来源 | Phase B SEO harness A1/A3/D3；审计 §3.3.1 |

## 症状

- 移除运行时 i18n 覆盖后，部分 `meta description/keywords` 的 `content` 仍是 key 占位（如 `tool.square_crop.meta.description`），SERP/分享会直接显示 key；
- 6 个页面 `<html lang="x-default">`，属非法/错误语言声明，影响渲染语言与 hreflang 一致性。

## 根因

静态页面把 SEO meta 的最终值“委托”给运行时 i18n（`data-i18n-content`），但运行时并不保证加载/覆盖；且 `x-default` 是 hreflang 专用值，被误写成 html lang。

## 规则（必须）

1. `<title>`、`meta description`、`meta keywords`、OG/Twitter 描述必须由静态 HTML 输出真实内容；不得依赖运行时 JS 填充。
2. 不再使用 `meta[data-i18n-content]` 作为 SEO 文案来源（可保留 `data-i18n` 在非 SEO 的 UI 元素）。
3. `<html lang>` 必须是合法语言标签（en/zh-CN/zh-TW/ja/es…），禁止 `x-default`。
4. 多语言页的 title/description 必须以对应语言静态输出；本地化页不得回退英文。
5. 修复后必须做“静态 vs 渲染后”对比（SEO harness A3）与全量 `html lang` 扫描（D3）。

## 检测方法

```bash
node scripts/seo-audit/run-seo-checks.mjs --label final   # A3 + D3
grep -rn 'data-i18n-content' --include='*.html' . | grep -v '^./audit'
grep -rn '<html lang="x-default"' --include='*.html' .
```

## 反例 / 正确做法

- 反例：`<meta name="description" content="tool.square_crop.meta.description">`。
- 正确：直接输出真实描述；`data-i18n-content` 从 meta 移除（Phase B 清理 100 个标签）。

## 证据

- `audit/evidence/phase-b/seo-report-final.*` A1/A3/D3 全 PASS；
- 6 个页面 lang 修正、100 个 meta 标签清理记录在 `audit/evidence/phase-b/codemod-log.txt`。

## 后续动作

- [x] 修复静态 meta 占位与非法 lang。
- [ ] 新增页面时 meta 直接写静态文本；禁止把 SEO 字段挂到运行时 i18n。
