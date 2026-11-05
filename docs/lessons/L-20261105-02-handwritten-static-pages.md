# L-20261105-02 — 96 个静态页手写复制、无构建，改一处要改多份并已产生漂移

| 字段 | 值 |
|---|---|
| ID | L-20261105-02 |
| 日期 | 2026-11-05 |
| 状态 | open |
| 严重度 | P1 |
| 证据层 | 代码层 |
| 关联文件 | 仓库根目录 96 个 `*.html`；`public/tools/{square,squarecrop,roundedcorners,blurredframe}/index.html` 与其 4 个语言副本；`assets/js/index-CurY6_0Y.js`（带 hash 但被手改） |
| 发现来源 | 2026-11-05 审计；`audit/sections/tech-architecture.md` §1.1/§7、`audit/sections/seo.md` |
| 负责人 | 维护者决策（是否做最小构建化）；实施者执行 codemod |

## 症状

- 仓库**无 `package.json`、无 `src/`、无构建脚本、无 CI**，首提交直接提交 Vite 构建产物（`assets/index-vAuRGWiM.css`、`assets/js/index-CurY6_0Y.js` 等），源工程不在仓库中。
- 96 个 HTML 全部手写：root 15 + blog 9 + `es/ja/tw/zh` 各 17 + `public/tools` 4。4 个工具页在 5 个位置各存一份，约 83% 内容相同。
- 已经出现的漂移：
  - AdSense 脚本同一站内两种写法（39 页跨行 / 16 页单行）；
  - hreflang 语言代码存在 4 套写法（`zh`/`zh-CN`、`zh-tw`/`zh-TW` 等）；
  - about/contact 的描述 5 种语言共用英文；
  - 构建产物 `index-CurY6_0Y.js` 与首提交 md5 不同（`fbeba6d…` → `c12ebbb…`），说明被手工编辑过，content hash 文件名已失去缓存指纹意义；仓库还留有 UTF-16LE 编码的 `.backup`（26,062 B）。

## 影响

- 任何跨页面改动（安全头除外，可走 `vercel.json`）都要人工改 96 个文件，漏改/改错概率高，且无法用 diff 证明一致性。
- SEO/合规整改（title/description、hreflang、sitemap、广告脚本、隐私页）成本被放大 5 倍，是审计中约 90% 问题需要逐文件修改的根本原因。
- 无构建 = 无法自动生成 sitemap/hreflang；无 CI = 无自动回归门槛。

## 根因

- 历史路径依赖：GitHub Pages 时代直接提交 Vite 构建产物，之后迁移 Vercel 并在产物上手工改造成多语言静态站。
- 没有模板/数据源，页面内容、meta、hreflang、sitemap 各自为政。
- 缺少「改动影响面枚举」这一步骤：改脚本/广告/导航时直接逐个文件改，没有统计"这段代码出现多少次"。

## 规则

以后必须：

1. 任何跨页面改动前，先量化影响面：`git grep -l '<锚点>' -- '*.html' | wc -l`，并记录到变更说明。
2. 同一改动涉及 **>3 个文件**时，必须写一次性脚本/codemod（幂等、dry-run、输出 diff），禁止纯手工逐个编辑；脚本执行后跑抽样 diff 并留证据。
3. 涉及 5 种语言的改动，必须给出「语言 × 页面类型」矩阵，逐格确认（至少首页 + 4 工具 + 4 法务 + 1 专题）。
4. 新页面/新内容优先考虑"最小构建化"（模板 + 数据驱动）；在构建化之前，新增页面必须同步更新 sitemap、hreflang、内链、语言切换器四处。
5. 带 content hash 的构建产物视为**只读**；确需修改时必须重新命名或重建，不得原地编辑后继续使用旧 hash 名。

禁止：

1. 禁止继续用"复制一份 HTML 改文字"的方式新增页面而不登记到页面清单。
2. 禁止手工改 96 个文件却只在 1–2 个页面验证。
3. 禁止在没有 dry-run/diff 的情况下用脚本批量替换。

## 检测方法

```bash
cd /Users/keyi/mecollage
echo "HTML 页面数: $(git ls-files '*.html' | wc -l)"        # 审计日 96；Phase A 删除 test-section 后 95
echo "工具页副本数（应始终 = 5 套）:"
git ls-files '*tools/*/index.html' | sed -E 's#^(es|ja|tw|zh)/##' | sort | uniq -c
# 漂移抽查：同一段 AdSense 引入的写法是否一致
git grep -h 'adsbygoogle.js?client=' -- '*.html' | sed -E 's/^[[:space:]]+//' | sort | uniq -c | head
```

判定标准：影响面统计缺失、或同一模板片段出现 >1 种写法、或 5 套副本内容差异无法解释 → 视为复发/风险。

## 反例

- 反例样本：`assets/js/index-CurY6_0Y.js` 手改后仍叫 `index-CurY6_0Y.js`（hash 名与实际内容不符），并附带 `.backup` 一起被部署（线上 200）。
- 错误做法：改广告脚本时直接 `sed` 全站替换，不做 dry-run、不检查 39/16 两种格式，不记录改了哪些文件。
- 正确做法：先 `git grep` 统计、写幂等脚本、dry-run 输出 diff、抽样 5 语言页面、把清单写进 commit message/证据。

## 关联证据

- `audit/sections/tech-architecture.md` §1.1、§7.3；`audit/sections/seo.md` §1.1
- `audit/evidence/tech/04_local_inventory.txt`、`05_source_security_license.txt` §1–3
- `git log --reverse`（首提交即构建产物）；`git show b4089b5 --stat`

## 后续动作与关闭条件

- [ ] 维护者决策：是否投入 24–40h 做"最小构建化"（模板 + i18n 数据 + sitemap/hreflang 生成器）；决策写入 ADR。
- [ ] 在构建化之前，所有批量改动必须附 codemod 脚本与 dry-run 输出。
- [ ] 关闭条件：页面可由单一数据源生成（或至少 sitemap/hreflang/meta 自动生成），且 CI/本地检查能在合并前发现漂移。

## 变更记录

- 2026-11-05 open：审计确认（`audit/AUDIT-REPORT.md` P2-9 / §1.1）。
