# L-20261105-23 — 运行时 i18n 不得覆盖静态本地化页（语言必须从 URL 推导）

| 字段 | 值 |
|---|---|
| ID | L-20261105-23 |
| 日期 | 2026-11-05 |
| 状态 | closed（Phase B 修复；SEO harness 20/0/0） |
| 严重度 | P0 |
| 证据层 | 代码层 + 浏览器渲染层 |
| 关联文件 | `assets/js/i18n.js`（旧版 `:4` 默认 en、`:52` 改 lang、`:91` 覆盖 textContent、`:112-118` 覆盖 meta）；36 个本地化页加载该脚本 |
| 发现来源 | 审计 P0-1；L-01；`audit/evidence/seo/rendered-comparison.csv` |

## 症状

- 新用户/Googlebot 打开 `/zh/`、`/es/`、`/ja/`、`/tw/` 时，静态本地化 HTML 被 JS 覆盖成英文；
- 4 个语言首页渲染后与英文首页可见正文相似度 1.0000；本地化工具页 title/description 变英文；
- `<html lang>` 被强制改成 `en`。

## 根因

`i18n.js` 仅从 localStorage 读取语言（默认 en），从不读 URL path；随后无条件执行 DOM 文本/title/meta 覆盖。站点同时存在“每语言静态子目录”和“运行时整页翻译”两套机制并互相打架。

## 规则（必须）

1. 运行时语言必须**首先**从 URL 路径推导（`/zh/` ` /es/` `/ja/` `/tw/`），localStorage 只能作为非 URL 场景的补充，不能是默认来源。
2. 服务端已输出本地化内容的页面，**禁止**运行时覆盖正文、`<title>`、`meta description`、`html lang`。
3. 运行时 i18n 只保留 `t()` 给动态文案（滑块单位、下载文件名、alert），不得承担 SEO/静态内容翻译。
4. 多语言改动验收必须做真实渲染（headless Chrome），不能只看 curl 静态 HTML。

## 检测方法

```bash
node scripts/seo-audit/run-seo-checks.mjs --label final   # A1/A2/A3：渲染 lang/正文/title/desc
# 判定：本地化页渲染后 lang 正确；正文与英文首页相似度 <0.3；title/desc 与静态一致
```

## 反例 / 正确做法

- 反例：`this.currentLang = this.getSavedLanguage() || 'en'` + `documentElement.setAttribute('lang', currentLang)`。
- 正确：路径匹配 `/^\/(zh|tw|ja|es)(?:\/|$)/` → 加载对应 JSON；不再改 DOM/title/meta；仅 `t()` 使用该语言。

## 证据

- 修复后：`audit/evidence/phase-b/seo-report-final.{json,md}` A1/A2/A3 全 PASS；25 页渲染快照/截图；
- 代码：`assets/js/i18n.js`；ADR-0003 D1。

## 后续动作

- [x] 重写 i18n.js；回归 52/0/1 功能 + 20/0/0 SEO。
- [ ] 新增语言页时沿用“URL 路径 = 语言”约定；禁止给本地化页加 `data-i18n` 做整页覆盖。
