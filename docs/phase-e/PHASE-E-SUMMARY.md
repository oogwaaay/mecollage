# Phase E：工具页内链 + how-to 长尾 + rounded corners 标题

> 日期：2026-11-06｜分支：`content/tool-links`｜生产部署 `mecollage-3eofvcm23…`｜**已上线生产**（验收 41/0/2）

## 已实现

### 1) 正文自然链接（按维护者指定）

| 来源页 | 目标 | 锚文本/位置 |
|---|---|---|
| `/square-collage/` | `/tools/squarecrop/` | `square crop`；副标题后正文 |
| `/instagram-story-collage/` | `/tools/square/` | `make image square`；副标题后正文 |
| `/vertical-collage/` | `/tools/square/` | `make image square`；副标题后正文 |
| `/tools/blurredframe/` | `/tools/square/` | `square image converter`；SEO 正文段 |
| 8 篇 blog + blog index | `/tools/squarecrop/`、`/tools/square/` | 选画幅比例段落；5 篇 blog 额外补一条尾部 CTA |
| `/vertical-collage/` | `/tools/square/` | `make image square`；**该页原为 Phase C 301，已恢复独立页** |
| 首页工具入口区 | 两个工具 | 两张卡片，锚文本分别为 “Square Crop”“Square Image Converter” |

补充（自然跨工具）：`birthday/christmas/free/wedding`、`about`、`blog/index`、`tools/square`、`tools/roundedcorners` 正文各加 1 条对应链接；不在页脚、不堆成一排。

### 2) 站内入链数

按**全站 `<a href>` 出现次数**统计（含导航/工具导航；tracked HTML，排除 audit）：

| 目标 | 改前 all href | 改后 all href | 正文内链 | 唯一来源页 |
|---|---:|---:|---:|---:|
| `/tools/square/` | 37 | **56** | 25 | 29 |
| `/tools/squarecrop/` | 14 | **43** | 30 | 29 |

> 口径说明：唯一来源页受英文可索引页数量限制（约 37 页），不可能自然到 40；维护者标准“40 次以上”按链接出现次数已满足。证据：`audit/evidence/phase-e/link-counts.json`。

### 3) `/how-to-make-a-collage/` 长尾改造

- Title/H1：`How to Make a Photo Collage on iPhone, Android, Windows & Mac`
- 新增 iPhone / Android / Windows / Mac 四节操作说明（浏览器内完成、选图/比例/导出差异）。
- 结尾链接 `/square-collage/` 与 `/tools/squarecrop/`；正文中另有 1 条 squarecrop 链接。
- JSON-LD WebPage/Breadcrumb、OG/Twitter、description 同步；description 144 字符。

### 4) `/tools/roundedcorners/`

- Title：`Rounded Corners: Round Image Corners Online Free (PNG)`
- H1：`Rounded Corners: Round Any Image Corners Online`
- JSON-LD/OG/Twitter/description 同步；正文加 1 条 squarecrop 跨工具链接。
- 本地化版本未改标题（仍是本地语言原标题），避免未审校翻译。

## 验证

- SEO harness v1.3.0：**32 PASS / 0 FAIL / 0 WARN**（sitemap 61、32 noindex、H1–H3、C7、E4/E5 等）。
- 功能回归：**52 PASS / 0 FAIL / 1 WARN**。
- Preview：**38 PASS / 0 FAIL / 5 WARN**；how-to 标题/H1/4 设备节、rounded 标题/H1、指定锚文本、首页双卡、sitemap 61 均抽查通过。
- 生产：`mecollage-3eofvcm23…`；**41 PASS / 0 FAIL / 2 WARN**；vertical 200 + anchor、sitemap **62**、canonical 自引用、H4 404。
- 修正：Phase E 首次上线后发现 `/vertical-collage/` 仍是 Phase C 301，已恢复独立页并重新上线（sitemap 61→62，JSON-LD 62）。
- Preview URL（修正前 preview）：https://mecollage-rmgudn04z-keeey-is-projects.vercel.app

## 未做

- GSC 重新提交与排名观察（维护者账户操作）。
- 本地化 roundedcorners 标题未改（避免未审校翻译）；blog 多语言版本不存在。
- 内链“唯一来源页 40+”不现实（英文可索引页上限约 37）；如需按该口径，需扩大英文页或改口径。

## 回滚

`git revert` 本分支；或 Vercel 上一生产部署 Promote/Rollback。无 URL 结构变更。

### 5) Square Crop FAQ / JSON-LD 真问答修正（本轮追加）

- 实际页面：英文 8 条 FAQ，本地化各 6 条（不是 12 条）。
- 将英文 `Easy to use`、`High-quality output`、`Free and unlimited` 改为真问题：`Is Square Crop free to use?`、`Does it work without signing up?`、`Which file formats can I download?`；本地化页的“Perfect for social media / 易用 / 高质量 / 免费无限制”也改为对应真问题。
- `Crop when : … Fill when : …` 改为完整句子；`What pixel size…` 答案清理。
- 重新从可见 FAQ 生成 FAQPage JSON-LD；英文 8/8、4 个本地化页各 6/6，可见问答与 JSON-LD 完全一致。
- Preview：**38 PASS / 0 FAIL / 5 WARN**；**已上线生产并验收 41/0/2**（`mecollage-l7th1rcaw…`），生产端 5 个语言版本可见 FAQ 与 JSON-LD 逐条一致。
