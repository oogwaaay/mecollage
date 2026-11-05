# L-20261105-15 — AGPL-3.0 依赖 + 无 LICENSE/第三方声明，商业站许可合规灰区

| 字段 | 值 |
|---|---|
| ID | L-20261105-15 |
| 日期 | 2026-11-05 |
| 状态 | open |
| 严重度 | P1 |
| 证据层 | 代码层 + 外部来源 |
| 关联文件 | `assets/js/mecollage-main.js:2236`（动态 `import('https://esm.sh/@imgly/background-removal@1.4.5')`）；仓库根目录无 `LICENSE`、无 `THIRD-PARTY-NOTICES`；Font Awesome 6.0.0（CC BY 4.0，需署名） |
| 发现来源 | 2026-11-05 审计；`audit/sections/tech-architecture.md` §5；`audit/evidence/tech/05_source_security_license.txt` §5 |
| 负责人 | 维护者（商业/法律决策）；实施者（补 LICENSE/notices 或替换依赖） |

## 症状

- 浏览器端 AI 去背景依赖 `@imgly/background-removal@1.4.5`，其许可证为 **AGPL-3.0**（已从 unpkg 官方 `LICENSE.md` 核实，2026-11-05）。
- 仓库没有 `LICENSE` 文件（GitHub API `license: null`），没有 `THIRD-PARTY-NOTICES.md`；Font Awesome 6.0.0 使用 CC BY 4.0 但站点未保留署名。
- 站点计划接入 AdSense（商业变现），AGPL 的网络服务条款与商业站组合存在合规灰区。

## 影响

- 若 AGPL 解释成立，商业使用可能需要开放对应源码或采购商业许可；不确定项不能当作"已合规"。
- 无 LICENSE = 默认"版权保留"，代码不可复用，第三方素材授权不明；对合作/审计/收并购都是减分项。
- Font Awesome 未署名违反 CC BY 4.0 的署名要求（低风险但可修复）。

## 根因

- 引入依赖时只看功能与体积，没有做许可证审查；依赖通过运行时 CDN `esm.sh` 动态加载，不在仓库中，容易被忽略。
- 没有 `LICENSE`/第三方声明文件；历史项目从个人工具站演化而来，没有合规基线。

## 规则

以后必须：

1. 新增任何第三方依赖（含运行时 CDN 动态 import）前，记录：名称、版本、许可证、引入方式、是否商用允许、署名要求；写入 `THIRD-PARTY-NOTICES.md`。
2. 站点含商业变现（AdSense/付费/导流）时，禁止在未确认许可证的情况下使用 AGPL/未知许可证依赖；必要时采购商业许可或换 MIT/Apache 类方案。
3. 仓库根目录必须有 `LICENSE`（明确版权与使用范围）与第三方声明；CC BY 素材保留署名。
4. 涉及法律判断的结论标注"需专业意见"，不得由 AI 断言"合法/不合法"。

禁止：

1. 禁止以"CDN 动态加载、仓库里没有"为由跳过许可证审查。
2. 禁止在无授权说明的情况下继续商用 AGPL 依赖。
3. 禁止把 AI 的许可分析当作法律意见。

## 检测方法

```bash
cd /Users/keyi/mecollage
# 1) 运行时动态依赖
git grep -nE "import\(['\"]https://|esm\.sh|unpkg|jsdelivr|cdnjs" -- '*.js' '*.html' | head -20
# 2) 许可证文件与声明
test -f LICENSE && echo 'LICENSE ok' || echo 'LICENSE missing'
test -f THIRD-PARTY-NOTICES.md && echo 'notices ok' || echo 'notices missing'
# 3) 仓库 license 元数据（应为非 null）
gh api repos/oogwaaay/mecollage --jq '.license'
# 4) 核对依赖许可证（外部一手来源）
curl -s 'https://unpkg.com/@imgly/background-removal@1.4.5/LICENSE.md' | head -5
```

判定标准：出现新的未登记第三方依赖、`LICENSE`/notices 缺失、或 AGPL 依赖仍在商业站使用且无决策记录 → 复发/未关闭。

## 反例

- 反例样本：`assets/js/mecollage-main.js:2236` 的 `@imgly/background-removal@1.4.5` + 仓库无 LICENSE（2026-11-05）。
- 错误做法：因为"代码不是我们写的、只是 CDN 引用"就认为没有许可证义务。
- 正确做法：维护者决策（采购 IMG.LY 商业许可 / 换 MIT 类方案 / 至少 AGPL 合规声明并评估），结论写入 ADR；同时补 `LICENSE` + `THIRD-PARTY-NOTICES.md`。

## 关联证据

- `audit/evidence/tech/05_source_security_license.txt` §5（unpkg LICENSE 链接与抓取日期 2026-11-05）
- `audit/sections/tech-architecture.md` §1.4/§5.2；`audit/AUDIT-REPORT.md` P1-12/P1-13
- GitHub API：`license: null`

## 后续动作与关闭条件

- [ ] 维护者决策 AGPL 处理路线；结论写入 ADR（可新建 ADR-0002）。
- [ ] 实施者补 `LICENSE`、`THIRD-PARTY-NOTICES.md`、Font Awesome 署名。
- [ ] 关闭条件：许可决策有 ADR + 声明文件上线 + 依赖清单可复核。

## 变更记录

- 2026-11-05 open：审计确认（P1-12/P1-13）。
