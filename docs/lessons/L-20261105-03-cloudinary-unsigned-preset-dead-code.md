# L-20261105-03 — 死代码 bundle 内置 Cloudinary 无签名上传 preset，且线上公开可下载

| 字段 | 值 |
|---|---|
| ID | L-20261105-03 |
| 日期 | 2026-11-05 |
| 状态 | mitigated（代码侧 `b2a3924` 已删除死文件；preset 关闭仍需维护者；部署验收待 Preview bypass） |
| 严重度 | P1（preset 若仍有效则 P0） |
| 证据层 | 代码层 + 线上层 + 平台层（Cloudinary 控制台待人工确认） |
| 关联文件 | `assets/js/index-CurY6_0Y.js:1517`（`const ve="dztbpf6ke", xe="public_works_unsigned"`）；同文件上传函数 POST `https://api.cloudinary.com/v1_1/dztbpf6ke/image/upload`（`.backup` 经解码核实为同文件尾部片段，**不含** Cloudinary 配置；删除建议不变） |
| 发现来源 | 2026-11-05 审计；`audit/sections/tech-architecture.md` §2.3；`audit/evidence/tech/05_source_security_license.txt` §4 |
| 负责人 | 维护者（Cloudinary 控制台操作）；实施者（删死代码） |

## 症状

- 仓库里有一个 245,382 B 的旧 Vite bundle `assets/js/index-CurY6_0Y.js`，**0 个页面引用**，但线上 `https://www.mecollage.top/assets/js/index-CurY6_0Y.js` 返回 200 可直接下载。
- 文件内硬编码 Cloudinary `cloudName=dztbpf6ke` 与 unsigned upload preset `public_works_unsigned`，以及匿名上传端点；另有 26,062 B 的 `.backup` 同样线上 200（经 UTF-16LE 解码核实，它只是该 bundle 第 1582 行起的尾部片段，**不含** Cloudinary 配置——删除它是因为死文件暴露面，不是因为凭据）。
- 当前页面没有调用入口，但 preset 若仍开启，任何拿到这段代码的人都能匿名向该 Cloudinary 账号上传任意图片。

## 影响

- **不确定但需按最坏情况处理**：preset 当前是否有效、配额多少，只能登录 Cloudinary 控制台确认；审计为只读，未做上传测试（避免滥用）。
- 若有效：配额/带宽被消耗、可被用于托管违规内容，账号被封会连带影响站点图片 CDN；属于"授权滥用面"，不是传统密钥泄漏。
- 死代码/备份被部署是根因的一半：`git ls-files` 里存在 = Vercel 会发布。

## 根因

- 历史遗留：首提交直接提交 Vite 构建产物，后续功能下线但文件未删；`.backup` 也未清理。
- 没有"死代码/死资源"清理机制，也没有把第三方上传能力（unsigned preset）列入安全评审。
- `.gitignore` 不控制部署面（见 L-20261105-14），所以被跟踪的旧文件必然上线。

## 规则

以后必须：

1. 前端代码**禁止**出现任何第三方上传 preset、API key、service token；上传必须走服务端签名/短时凭证，或完全不走第三方。
2. 下线功能时，同一变更内删除其前端代码、bundle、备份、i18n 键；"先留着以后可能用"不是保留理由。
3. 发现疑似凭据/上传通道时：**只做静态取证，不做上传测试**；立即报告维护者，由维护者在第三方控制台核对/关闭。
4. 新增第三方 SDK 前，必须记录其标识符是否公开、是否可被滥用、许可是否允许商用（见 L-20261105-15）。

禁止：

1. 禁止把"没有页面引用"当作安全（死代码同样被部署）。
2. 禁止为了验证 preset 是否有效而执行上传请求。
3. 禁止把 Cloudinary/图床凭据写进任何会被部署的文件（包括注释、备份、sourcemap）。

## 检测方法

```bash
cd /Users/keyi/mecollage
# 1) 找出所有第三方上传通道/凭据样式
git grep -nE 'upload_preset|api\.cloudinary\.com|cloudinary|unsigned|api[_-]?key|secret' -- . ':!audit' | head -40
# 2) 死文件是否被任何页面引用（期望 0）
git grep -c 'index-CurY6_0Y' -- '*.html' '*.js' '*.css' | grep -v ':0' || echo 'no references'
# 3) 线上是否可下载（返回 200 即需处理）
for p in assets/js/index-CurY6_0Y.js assets/js/index-CurY6_0Y.js.backup; do
  curl -s -o /dev/null -w "$p => %{http_code}\n" "https://www.mecollage.top/$p"
done
```

判定标准：出现 upload preset / cloudName + unsigned 组合，或死 bundle 线上 200 → 复发；两者都消失才算关闭代码面。

## 反例

- 反例样本：`assets/js/index-CurY6_0Y.js:1517`（审计在 2026-11-05 仍线上可下载）。
- 错误做法：看到"页面没调用"就判定低风险、不处理；或直接拿 preset 上传一张图"测试一下"。
- 正确做法：删除死文件 + `.backup`（Phase A 计划）+ 维护者在 Cloudinary 控制台关闭/删除 `public_works_unsigned`（人工，Phase A 不做账户操作）+ 线上验证 404。

## 关联证据

- `audit/evidence/tech/05_source_security_license.txt` §4（代码片段）
- `audit/sections/tech-architecture.md` §2.3 / §4.3（公开可下载清单）
- 线上状态：2026-11-05 审计证据；Cloudinary preset 有效性：**不确定**（需控制台）

## 后续动作与关闭条件

- [x] Phase A：删除 `assets/js/index-CurY6_0Y.js` 与 `.backup`（`b2a3924`），`.vercelignore` 已排除 `*.backup` 作为双保险。
- [ ] 维护者：Cloudinary 控制台关闭/删除 `public_works_unsigned`；部署后验证两文件 404。
- [ ] 维护者：登录 Cloudinary → Settings → Upload presets，确认/关闭 `public_works_unsigned`；把结论与截图时间记录到 `audit/evidence/phase-a/cloudinary/`（人工步骤，不在本阶段代码内）。
- [ ] 复验：线上死文件 404；全站 grep 无 upload preset。
- [ ] 关闭条件：代码面删除 + 线上 404 + 维护者确认 preset 已关闭（或确认无效并记录）。

## 变更记录

- 2026-11-05 open：审计发现；Phase A 代码删除与 `.vercelignore` 已在分支计划中，Cloudinary 账户操作待维护者。
- 2026-11-05 进展（部分关闭）：分支 `phase-a/security-hardening` 提交 `b2a3924` 删除 `index-CurY6_0Y.js` 与 `.backup`；`.vercelignore` 排除 `*.backup`；另删除 0 引用的 `upload-icon.png/.webp`。仍待：维护者关闭 preset、Preview/生产 404 验证。
- 2026-11-05 更正：经 UTF-16LE 解码核实，`.backup` **不含** Cloudinary 配置（只是死 bundle 尾部片段）；删除它是因为死文件暴露面，不是因为凭据。
