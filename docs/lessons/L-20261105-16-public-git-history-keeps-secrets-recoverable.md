# L-20261105-16 — 公开仓库的 git 历史/分支会让已删除代码继续可得

| 字段 | 值 |
|---|---|
| ID | L-20261105-16 |
| 日期 | 2026-11-05 |
| 状态 | mitigated（本案例 preset 已由维护者删除 2026-11-05；通用规则仍有效：公开历史保留字符串，需账户侧失效化） |
| 严重度 | P2 |
| 证据层 | 代码层（git 历史）+ 平台层（Cloudinary 控制台，未验证） |
| 关联文件 | `assets/js/index-CurY6_0Y.js`（已在 `b2a3924` 从 HEAD 删除）；`git log --all` 历史；`origin/gh-pages` 分支（33 个文件） |
| 发现来源 | Phase A 遗留资源只读审计（`audit/evidence/phase-a/legacy/README.md`、`cloudinary-refs.md`） |
| 负责人 | 维护者（凭据/账户处置） |

## 症状

- 从 HEAD 删除含 Cloudinary unsigned preset 的死 bundle 后，通过 `git show b4089b5:assets/js/index-CurY6_0Y.js` 或 `origin/gh-pages` 分支仍能取得同一段代码。
- 仓库是 public，任何人都能克隆历史；文件删除只影响当前部署面，不改变"代码已公开"的事实。

## 影响

- 仅靠"删除文件"无法消除第三方上传 preset 被滥用的风险；如果 preset 仍有效，公开历史持续提供利用方式。
- 容易给维护者造成"已修复"的错觉（删除 ≠ 失效）。

## 根因

- 历史上把构建产物（含第三方配置）直接提交进公开仓库；
- 删除操作只针对 HEAD，未评估 git 历史与并行分支的可得性；
- 处置顺序颠倒：应先禁用/轮换凭据，再清理代码与部署面。

## 规则

必须：

1. 处置暴露的凭据/preset 时，**先禁用/轮换**，再删代码、再验收；无法轮换时明确记录风险与期限。
2. 收到"公开仓库含敏感配置"报告时，同时检查：HEAD、`git log --all -S'<needle>'`、所有远程分支（`git branch -r`）、GitHub Pages/gh-pages 分支。
3. 公开仓库的 git 历史默认视为**永久公开**；不要在历史中寻找"安全感"。

禁止：

1. 禁止仅凭"HEAD 已删除"关闭凭据类教训。
2. 禁止为"清理历史"擅自 `filter-repo`/force-push（需维护者批准 + 全量备份 + 协作方协调，见 AGENTS H10）。

## 检测方法

```bash
# 历史与所有分支中是否仍含目标字符串
git log --all -S'public_works_unsigned' --oneline | head
git grep -n 'public_works_unsigned' $(git rev-list --all) -- 2>/dev/null | head
# 远程分支
git branch -r
git ls-tree -r --name-only origin/gh-pages | head -50
```

## 反例

- 反例：删除 HEAD 文件后在交付说明写"Cloudinary 风险已消除"——历史仍可取得，preset 未关闭。
- 正确：`b2a3924` 删除文件 + 本文记录"历史仍含代码" + 维护者关闭 preset 的独立动作 + 部署后 404 验证。

## 关联证据

- `audit/evidence/phase-a/legacy/README.md` §5（公开可得性）
- `audit/evidence/phase-a/legacy/cloudinary-refs.md`
- `git log --all --oneline -- assets/js/index-CurY6_0Y.js`

## 后续动作与关闭条件

- [x] 维护者删除 Cloudinary `public_works_unsigned` preset（2026-11-05；截图归档；删除后可选列表复核/curl 400 未做）。
- [ ] 评估是否清理 `gh-pages` 分支（H10：需维护者批准；不影响当前生产）。
- [x] 关闭条件：preset 已删除 + 截图归档 + 部署面 404 验证完成（2026-11-05）。
