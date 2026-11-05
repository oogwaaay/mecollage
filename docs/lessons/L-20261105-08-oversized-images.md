# L-20261105-08 — 3 个 1.19MB 相同图标 + 6 张 >1MB PNG 占仓库 73%

| 字段 | 值 |
|---|---|
| ID | L-20261105-08 |
| 日期 | 2026-11-05 |
| 状态 | open |
| 严重度 | P1 |
| 证据层 | 代码层 + 线上层 |
| 关联文件 | `index.html:5-7`（三个图标引用）、`index.html:17`（`og:image` 用 `favicon-192.png`）；`favicon.png`、`favicon-192.png`、`apple-touch-icon.png`、`wallImage.png`、`placeholder-icon.png`、`remove-icon.png` |
| 发现来源 | 2026-11-05 审计；`audit/sections/tech-architecture.md` §6.1/§6.2；`audit/evidence/tech/06_key_numbers.txt` |
| 负责人 | 实施者（重导出/压缩）；维护者确认品牌素材来源 |

## 症状

- `favicon.png`、`favicon-192.png`、`apple-touch-icon.png` **内容完全相同**（MD5 均为 `6468e92ebbbd7ac7a6e89139f29b1042`），各 1,186,660 B（1.19 MB），却分别声明为 32×32 favicon、192×192 icon、180×180 apple-touch-icon。
- 根目录 6 张 >1MB PNG（3 个图标 + `wallImage.png` 2,568,891 B + `placeholder-icon.png` 2,105,162 B + `remove-icon.png` 1,683,562 B）合计 9,917,595 B = tracked 总字节 13,557,290 B 的 **73%**。
- 按 HTML 声明资源全量计算，每页 3.8–4.3 MB；首页 18 请求 4,297.6 KB。`og:image` 直接引用 1.19MB 的 `favicon-192.png`。

## 影响

- 移动端首屏/社交分享抓取浪费带宽，LCP 风险显著（审计推断，真实 CWV 未测）。
- 仓库与部署体积被无意义放大；`git clone`、部署上传、CF 缓存成本都增加。
- 三份相同文件是"复制粘贴资源"的典型信号：没有按显示尺寸导出，也没有去重检查。

## 根因

- 设计/导出环节直接用 1024×1024 原图当 favicon/apple icon，未按用途缩放/压缩。
- 没有图片预算与提交前检查；`.gitignore` 也不处理资源体积。
- 历史遗留（文件日期 2026-01-27）一直未清理。

## 规则

以后必须：

1. 图标按用途导出多尺寸（32/48/180/192/512），单文件 ≤10KB；`og:image` 单独生成 1200×630 轻量图。
2. 大图按实际显示尺寸导出，优先 WebP/AVIF；任何单文件 >200KB 的图片必须说明理由并记录。
3. 提交前跑资源体积检查；同一 MD5 的资源不得重复入库。
4. 性能修复验收用"页面声明资源总传输量"指标，不能只凭肉眼。

禁止：

1. 禁止把 1024×1024 无损 PNG 直接当 favicon/OG 图。
2. 禁止为同一用途提交多份相同二进制。
3. 禁止用"浏览器会缓存"为超大资源辩护（首访/爬虫/社交抓取没有缓存）。

## 检测方法

```bash
cd /Users/keyi/mecollage
# 1) >1MB 的 tracked 资源
git ls-files -z | xargs -0 stat -f '%z %N' | awk '$1>1048576' | sort -rn
# 2) 重复二进制（同一 MD5）
git ls-files '*.png' '*.webp' '*.jpg' | xargs md5 -r | sort | awk '{print $1}' | uniq -d
# 3) tracked 总字节与图片占比
git ls-files -z | xargs -0 stat -f '%z' | awk '{s+=$1} END {printf "tracked total: %d bytes\n", s}'
```

当前基线：3 个图标 MD5 相同；6 张 PNG >1MB；图片占 73%。判定标准：出现新的 >1MB 文件、或重复 MD5、或 favicon 体积 >10KB → 复发。

## 反例

- 反例样本：`favicon.png`/`favicon-192.png`/`apple-touch-icon.png`（三份相同 1.19MB）；`index.html:17` 的 `og:image`。
- 错误做法：只压缩其中一张；或把 PNG 转 WebP 但保留原图一起提交。
- 正确做法：按尺寸重导出、删旧文件、更新引用、跑页面权重检查；把结果写入证据。

## 关联证据

- `audit/evidence/tech/06_key_numbers.txt`（体积统计）
- `audit/sections/tech-architecture.md` §6.1/§6.2；`audit/AUDIT-REPORT.md` P1-9
- 2026-11-05 `md5` 实测

## 后续动作与关闭条件

- [ ] 阶段 0/性能包：压缩 3 图标 + 3 张大图，生成 og 图，更新引用（实施者，约 5h）。
- [ ] 验收：无 >1MB 图片（或有理由清单）、无重复 MD5、页面声明总传输量显著下降；记录到证据。
- [ ] 关闭条件：上述验收通过 + 品牌素材授权来源已确认。

## 变更记录

- 2026-11-05 open：审计确认（P1-9）。
