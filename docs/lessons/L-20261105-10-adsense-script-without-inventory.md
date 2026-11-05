# L-20261105-10 — AdSense：55 页有脚本但 0 广告位，账户无站点记录，Publisher ID 归属未验证

| 字段 | 值 |
|---|---|
| ID | L-20261105-10 |
| 日期 | 2026-11-05 |
| 状态 | open |
| 严重度 | P0（合规/账户风险，非收入问题） |
| 证据层 | 代码层 + 线上层 + 平台层（AdSense 后台需维护者确认） |
| 关联文件 | `ads.txt`（`pub-9280689992387509`）；55 个 HTML 的 `pagead2.googlesyndication.com/.../adsbygoogle.js?client=ca-pub-9280689992387509`；`privacy.html`（无广告/Cookie 披露）；`404.html:27` |
| 发现来源 | 2026-11-05 审计；`audit/sections/adsense.md`；`audit/evidence/adsense/adsense-matrix.csv` |
| 负责人 | 维护者（后台核对/账户操作）；实施者（合规整改） |

## 症状

- 55/96 页在 `<head>` 加载 `adsbygoogle.js`（每页 1 次、带 `crossorigin`，但两种写法：39 页跨行 / 16 页单行）。
- 全站 **0 个 `<ins class="adsbygoogle">`、0 次 `adsbygoogle.push`、0 个 `data-ad-client`** → 没有任何广告位。
- `ads.txt` 格式正确、与脚本 ID 一致（`google.com, pub-9280689992387509, DIRECT, f08c47fec0942fa0`）。
- 用户陈述：AdSense 账户中**没有 MeCollage 站点记录**；历史申请状态不明（**不确定**，以维护者后台核对为准）。
- 合规硬阻断：隐私政策无第三方广告/Cookie/Google 数据使用披露；全站无 CMP/consent；无可用邮箱/运营主体；404 页也挂广告脚本。
- 脚本覆盖无序：首页/博客/政策页/工具页/404 都有脚本，**恰好跳过全部 40 个落地页**（模板批量加入，非按价值评估）。

## 影响

- "有脚本"不等于"有广告"：当前 AdSense 无收入、无广告展示；在没有 CMP/隐私披露前补广告位或开 Auto ads 只会放大违规风险。
- **Publisher ID 归属未确认**：若 ID 不属于维护者，ads.txt 等于授权他人账户售卖本域库存，违反 Authorized inventory 政策。这是审核与合规的前置项。
- 404/隐私页挂广告代码、无内容页挂广告，违反 ad placement policies。

## 根因

- 2026-01-13 `d332785`"添加 ads.txt"按模板批量给 17 页加脚本，后扩展到 55 页；只完成了"脚本 + ads.txt"，没有完成"账户验证 + 广告位 + 合规前置"。
- 没有广告/统计接入的审批与检查单（谁改 ID、加广告位、开 Auto ads 都需要维护者批准）。
- 隐私政策/联系信息与实际功能脱节（写着不存在的账号/订阅，却没有邮箱）。

## 规则

以后必须：

1. **禁止修改 Publisher ID**、禁止新增/替换 AdSense 脚本或广告位、禁止开启 Auto ads，除非维护者书面确认"ID 属于本人/本组织"并明确批准。
2. 广告/统计代码上线前必须完成：隐私政策披露、CMP/consent、可联系主体与邮箱；404/隐私/条款页禁止挂广告。
3. 加广告位前先确认广告不会覆盖工具画布/按钮（Ad interference / CLS 风险）。
4. 广告相关变更必须走 ADR + Preview + 维护者批准；账户级操作（AdSense 后台）只由维护者执行。
5. 任何"接入完成"的结论必须区分：脚本已加载 / 广告位已展示 / 账户已验证 / 收入已产生。

禁止：

1. 禁止把 Publisher ID 当作"配置"随意替换来"试试"。
2. 禁止在没有 CMP 的情况下给 EEA/UK 用户投个性化广告。
3. 禁止用"代码里没有新的广告位"来推断"账户状态正常"。

## 检测方法

```bash
cd /Users/keyi/mecollage
echo -n 'pages with adsbygoogle script: '; git grep -l 'adsbygoogle' -- '*.html' | wc -l        # 当前 55
echo -n 'ad slots (<ins>) / push calls: '
{ git grep -h '<ins class="adsbygoogle"' -- '*.html'; git grep -h 'adsbygoogle\.push' -- '*.html'; } | wc -l  # 当前 0
echo -n 'ads.txt: '; cat ads.txt
echo -n 'CMP/consent hits: '; git grep -ilE 'consent|cmp|tcf|gdpr' -- '*.html' | wc -l           # 当前 0
echo -n 'mailto: '; git grep -c 'mailto:' -- '*.html' | wc -l                                   # 当前 0
```

线上复核：`curl -s https://www.mecollage.top/ | grep -c 'adsbygoogle'`；账户归属只能在 AdSense 后台核对（**不确定项**）。

## 反例

- 反例样本：55 页脚本 / 0 广告位 / 0 CMP / 隐私政策无披露（2026-11-05）。
- 错误做法：因为"账户里没有站点"就直接替换成另一个 Publisher ID；或在没有 CMP 时补广告位"先跑起来"。
- 正确做法：维护者登录 AdSense 后台核对 ID/申请历史 → 确认归属后再决定继续申请或移除接入；同步做隐私政策 + CMP + 邮箱；最后才谈广告位与收入。

## 关联证据

- `audit/evidence/adsense/adsense-matrix.csv`、`audit/evidence/adsense/live/`、`ads.txt`
- `audit/sections/adsense.md` A-02/A-05/A-07；`audit/AUDIT-REPORT.md` §4
- 2026-11-05 全站扫描（55 / 0 / 0 / 0）

## 后续动作与关闭条件

- [ ] 维护者：AdSense 后台核对 Publisher ID 归属、历史申请、Auto ads 状态（P0-4，0.5–1h，**不改代码 ID**）。
- [ ] 实施者：隐私政策 5 语言重写 + CMP + 邮箱/主体 + 404/政策页去广告（与 GA4 合规共用）。
- [ ] 决策：ID 归属结论 + 广告接入是否继续，写入 ADR。
- [ ] 关闭条件：后台归属有明确结论、合规前置上线、全站无违规广告位、证据归档。

## 变更记录

- 2026-11-05 open：审计确认（P0-4 / §4）；Phase A 不触碰广告/账户，仅记录。
