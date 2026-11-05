# L-20261105-17 — 死资源判定：CSS class 名 ≠ 文件引用，WebP fallback ≠ 死资源

| 字段 | 值 |
|---|---|
| ID | L-20261105-17 |
| 日期 | 2026-11-05 |
| 状态 | mitigated（Phase A 采用该口径；删除 `upload-icon.*`） |
| 严重度 | P3 |
| 证据层 | 代码层 |
| 关联文件 | `upload-icon.png`、`upload-icon.webp`（0 引用，`b2a3924` 后删除）；`wallImage.png`（WebP fallback，保留）；`placeholder-icon.png`（fallback，保留） |
| 发现来源 | Phase A 遗留资源只读审计 `audit/evidence/phase-a/legacy/dead-assets.csv` |
| 负责人 | 实施者 |

## 症状

- 用 `grep -r upload-icon` 会得到大量命中（`.upload-icon` 是 CSS class 名、DOM class），误以为图片仍被引用；实际 `upload-icon.png/.webp` 0 引用。
- `wallImage.png` 只在"浏览器不支持 WebP"时被 JS 用作 fallback；静态检索容易把它判成死资源，误删会导致旧浏览器背景丢失。

## 影响

- 误删"看似死"的资源 → 功能/兼容性回归（WebP fallback、主题图、PWA 图标）。
- 误留真死资源 → 继续增加部署面/仓库体积。

## 根因

- 只按子串 grep，没有区分"文件名（含扩展名）"与"CSS class/JS 变量名"；
- 没有覆盖 `url()`、`srcset`、`data-*`、JS 模板字符串、特性检测 fallback 分支；
- 没有第二人/第二方法复核。

## 规则

必须：

1. 判定资源引用时按**完整文件名（含扩展名）**检索，并单独检查 CSS `url()`、`src/srcset`、JS 字符串/模板、`site.webmanifest`、PWA/canonical/OG 等约定。
2. 检查动态/fallback 分支（如 `webp-supported`、`url(/wallImage.webp)` : `url(/wallImage.png)`），确认两种格式的用途。
3. 删除前用两种独立方法交叉验证（静态扫描 + 线上真实请求/浏览器 Network 或服务器访问日志），并在交付说明记录命令与结果。
4. 只删"确认 0 引用且不属于浏览器/平台约定"的资源；不确定则改为 `.vercelignore` 排除（可回滚）。

禁止：

1. 禁止用 class 名命中证明图片仍在使用。
2. 禁止把 WebP/AVIF fallback 当成"未引用"删除。

## 检测方法

```bash
# 精确文件名（含扩展名）
git grep -n --fixed-strings 'upload-icon.png' -- . ':!audit' || echo '0 refs'
git grep -n --fixed-strings 'upload-icon.webp' -- . ':!audit' || echo '0 refs'
# 动态/fallback 检查
git grep -n 'wallImage\.\(webp\|png\)' | head
# 线上复验（部署后）
curl -s -o /dev/null -w '%{http_code}\n' https://www.mecollage.top/upload-icon.png
```

## 反例

- 反例：`grep -r upload-icon` 命中 50+ 次 → 结论"仍在使用"（实际全是 CSS class）。
- 反例：`wallImage.png` 未出现在 HTML `<img>` → 结论"死资源"（实际是 WebP fallback）。
- 正确：`b2a3924` 仅删除 `upload-icon.png/.webp`（0 引用），保留 `wallImage.png`、`placeholder-icon.png` 等 fallback。

## 关联证据

- `audit/evidence/phase-a/legacy/dead-assets.csv`
- `audit/evidence/phase-a/legacy/README.md` §3（判定规则）
- `git show b2a3924 --stat`

## 后续动作与关闭条件

- [x] Phase A：按该口径删除 2 个真死资源，保留 fallback。
- [x] 将规则写入本教训与 `scripts/verify-site.mjs` 的关键资源 200 断言（wallImage.webp 等）。
- [ ] 关闭条件：下一次资源清理仍复用该口径并记录结果。
