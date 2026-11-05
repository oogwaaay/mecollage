# L-20261105-14 — `.gitignore` 不等于部署忽略：被跟踪的内部文档/备份全部线上可下载

| 字段 | 值 |
|---|---|
| ID | L-20261105-14 |
| 日期 | 2026-11-05 |
| 状态 | mitigated（分支 `460c39a` 新增 `.vercelignore`、`b2a3924` 删除遗留；待 404 矩阵验收） |
| 严重度 | P2 |
| 证据层 | 代码层 + 线上层 |
| 关联文件 | `.gitignore`（只影响 git，不影响 Vercel 部署）；线上 200 的 `design-system.md`、`需求理解确认.txt`、`.htaccess`、`.nojekyll`、`check_keys.js`、`sync_keys.js`、`zh-tw.json`、`assets/js/index-CurY6_0Y.js.backup`、`test-section.html`；本治理体系新增的 `AGENTS.md`、`GOVERNANCE.md`、`docs/`、`scripts/` |
| 发现来源 | 2026-11-05 审计；`audit/sections/tech-architecture.md` §4.3；`audit/evidence/tech/03_urls_and_platform.txt` §E |
| 负责人 | 实施者（`.vercelignore` + 删除）；维护者确认公开面清单 |

## 症状

- 线上可直接下载：`design-system.md`（4,570B）、`需求理解确认.txt`（6,873B）、`.htaccess`（2,530B）、`.nojekyll`、`check_keys.js`、`sync_keys.js`、`zh-tw.json`（50,263B）、`assets/js/index-CurY6_0Y.js.backup`（26,062B）、`test-section.html`。
- 这些文件**都被 git 跟踪**，所以 Vercel 部署时全部作为静态文件发布。
- 反例：`.DS_Store`、`.vercel/` 线上 404 —— 但它们只是因为未被跟踪/被 gitignore，不代表"内部文件安全"。
- 本治理体系新增的 `AGENTS.md`、`GOVERNANCE.md`、`docs/lessons/*.md`、`scripts/verify-site.mjs` 若不在 `.vercelignore` 内，同样会被公开下载并可能被索引。

## 影响

- 内部实现、产品需求、设计系统、部署配置、废弃翻译、旧 bundle 备份全部公开；竞品可推断产品路线；`.backup` 是死 bundle 尾部片段（不含 Cloudinary 配置，见 L-03 更正）。
- 增加不必要的攻击面/抓取面（`.md`、`.txt`、`.js` 被爬虫发现）。
- 治理文档本身包含安全策略、审计结论；公开会暴露站点弱点与操作手册。

## 根因

- 误以为 `.gitignore` 控制"是否发布"，实际 Vercel 部署 = 仓库中被跟踪的文件 + 构建产物。
- 没有部署面清单/`.vercelignore`；也没有"提交内部文件前先想它会不会上线"的检查。
- 迁移 Vercel 后未清理 GitHub Pages/Apache 时代遗留文件。

## 规则

以后必须：

1. 内部文件（文档、审计、备份、工具脚本、治理文件、`.htaccess`/`.nojekyll` 等遗留配置）必须：移出部署目录，或加入 `.vercelignore`；两者同时做更稳。
2. `.vercelignore` 必须在 Preview 上实测：内部路径返回 404，站点关键资源仍 200（避免误排 `i18n/`、`assets/`、`public/`）。
3. 任何"提交到仓库"的内部文件，默认按"会公开"对待；不能公开的不要提交到本仓库（或使用私有仓库/独立存储）。
4. 新增顶层目录（如 `docs/`、`scripts/`、`audit/`）时，同一变更内更新 `.vercelignore` 并验证。
5. 部署后跑内部文件 404 矩阵作为发布检查单必检项。

禁止：

1. 禁止用 `.gitignore` 代替 `.vercelignore` 处理部署面。
2. 禁止把内部文档/备份放在会被部署的根目录而不做排除。
3. 禁止在没有验证 404 的情况下声称"已排除"。

## 检测方法

```bash
BASE="${1:-https://www.mecollage.top}"
for p in design-system.md 需求理解确认.txt .htaccess .nojekyll check_keys.js sync_keys.js \
         zh-tw.json test-section/ assets/js/index-CurY6_0Y.js \
         assets/js/index-CurY6_0Y.js.backup AGENTS.md GOVERNANCE.md docs/lessons/README.md scripts/verify-site.mjs; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/$p")
  printf '%-50s %s\n' "/$p" "$code"
done
```

期望（Phase A 后）：内部文件全为 404；`/ads.txt`、`/sitemap.xml`、`/robots.txt`、`/i18n/zh.json`、`/assets/js/mecollage-main.js` 仍为 200。
判定标准：任一内部文件 200 → 复发/未排除。

## 反例

- 反例样本：2026-11-05 线上 `design-system.md`、`需求理解确认.txt`、`.htaccess`、`.backup` 全部 200。
- 错误做法：把内部文档加进 `.gitignore` 就认为安全；实际上它们已 tracked，仍会部署。
- 正确做法（ADR-0001 D4）：`.vercelignore` 排除 + 删除/迁移；Preview/生产跑 404 矩阵 + 关键资产 200 检查。

## 关联证据

- `audit/evidence/tech/03_urls_and_platform.txt` §E（线上 200 清单）
- `audit/sections/tech-architecture.md` §4.3
- 2026-11-05 线上实测

## 后续动作与关闭条件

- [ ] Phase A：新增 `.vercelignore`；删除/迁移内部遗留文件；治理文件纳入排除（实施者）。
- [ ] 验收：内部文件 404 矩阵全 404，关键资源 200（预览 + 生产）。
- [ ] 关闭条件：上述验收通过 + 发布检查单加入该矩阵。

## 变更记录

- 2026-11-05 open：审计确认（P2-5）。
- 2026-11-05 进展（待验收）：`460c39a` 新增 `.vercelignore`（排除 audit/docs/scripts/AGENTS/GOVERNANCE/内部说明/遗留配置/工具脚本/备份）；`b2a3924` 删除死 bundle、test-section、根 zh-tw.json；仍待 Preview/生产 404 矩阵验收。
