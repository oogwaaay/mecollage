# Phase F 功能真实性审查与修复 — 公开摘要

> 日期：2026-11-05｜分支：`fix/functional-integrity` → 已合并 `main` 并**上线生产**（维护者批准，手动部署）
> 一句话：把“宣称但没真正可用”的功能逐项验证并修复；真实浏览器回归 **42 PASS / 7 FAIL → 52 PASS / 0 FAIL**。

## 为什么做

用户反馈：很多功能没有真正实现或存在 bug，尤其是“按比例做圆/方、排列样式”。Phase F 用“静态代码审计 + 真实浏览器自动化”逐项核对功能承诺，而不是只看页面能不能打开。

## 找到的主要问题（已修复）

1. **首页比例失真**：1:1 / 3:4 / 9:16 被 CSS `max-height:500px` 截断（1:1 实际 600×500），导出继承错误尺寸。
2. **首页网格错配**：多图时行列容量不足 → 隐式行挤压图片、末格空白、宽比例多图重叠；单图被“+”按钮占掉一行。
3. **首页导出错误**：右/下各裁 20px、文字/贴纸偏移、单图残留空白行。
4. **撤销/重做无效**：只在拖拽结束后保存“操作后”状态；旧文字 wrapper 残留导致读到旧坐标。
5. **贴纸**：无法删除；每次切工具重复绑定，点一次加多个。
6. **AI 人脸居中**：把“人脸坐标%”直接当 `object-position`，数学上不居中；无成功/失败提示。
7. **工具页**：
   - square 的 blur / solid 模式被前景完全盖住（输出等于 crop）；
   - square / squarecrop 的导出几何与预览不一致（squarecrop 导出源矩形公式错误）；
   - square 选 WEBP 实际导出 JPEG；
   - roundedcorners “1080px” 对横图强制 1920×1080 并拉伸；
   - blurredframe 的 Aspect Ratio 对导出完全无效（输出恒正方形）、主图被拉伸、pan/模糊强度预览与导出不一致；
   - squarecrop 100% 是 contain（露透明边）且 pan 无边界。
8. **文案夸大**：HEIC 支持（多数浏览器无法解码）、20+ templates、PNG/JPG 导出、unlimited images、roundedcorners 的“纯色背景/color picker”、blurredframe 的“边框宽度 5–40%”等，已改为与实现一致。

## 修复后的可验证结果

| 分组 | 修复前 | 修复后 |
|---|---|---|
| 首页编辑器 | 18 PASS / 3 FAIL / 2 WARN | **23 / 0 / 0** |
| square | 4 / 2 / 1 | **7 / 0 / 0** |
| squarecrop | 7 / 1 / 0 | **8 / 0 / 0** |
| roundedcorners | 6 / 0 / 0 | **6 / 0 / 0** |
| blurredframe | 6 / 1 / 0 | **7 / 0 / 0** |
| 覆盖/人工清单 | 1 / 0 / 1 | 1 / 0 / 1 |
| **合计** | **42 / 7 / 4** | **52 / 0 / 1（exit 0）** |

- 回归命令：`node scripts/functional-audit/run-tests.mjs`（零依赖，Chrome headless + 本地 Vercel 模拟）。
- Preview 部署级验收：分支 `fix/functional-integrity` @ `5aa864a` → 部署层 **38 PASS / 0 FAIL / 5 WARN**（与 Phase A 一致），功能层浏览器回归 **52 PASS / 0 FAIL / 1 WARN**。
- **生产上线**（2026-11-05，维护者批准）：`fix/functional-integrity` @ `debfffe` → `mecollage-o89utzktl-…`，Aliased `https://www.mecollage.top/`；生产部署验收 **41 PASS / 0 FAIL / 2 WARN**；生产浏览器冒烟 **PASS**（首页 1:1/4:3 比例、square 纯色背景、squarecrop 拖拽不露底、rounded 1080×810、blurredframe 16:9→1200×675，0 未捕获异常）。
- 仍有 1 个 WARN：AI 成功路径、真实下载产物、触屏手势、真实指针拖拽、跨浏览器观感等需人工/真机确认。

## 规格变化

- 首页新增 **4:3** 比例（共 6 个比例按钮）。
- squarecrop 缩放下限 **10% → 100%**（100% 即 1:1 cover 裁剪），pan 有边界。
- blurredframe 输出**保持所选比例**（不再恒正方形）；默认 mainScale=80（默认可见模糊边框）。
- square resize 语义改为**真正拉伸铺满**（与原有文案一致）。

## 未包含（边界）

- Phase B：i18n 默认语言 bug、本地化页孤岛/内链/sitemap/SEO 内容结构；
- AdSense 合规（CMP/隐私）、GA4、Cloudinary preset 关闭、BackGone 联动；
- 完整 undo 历史（目前仅覆盖拖拽/文字/贴纸增删）、移动端拖拽排序、JPG/分辨率导出选项；
- 生产部署：已于 2026-11-05 上线（维护者批准；部署方式为手动 CLI）。

## 证据

- 完整报告：`audit/PHASE-F-REPORT.md`（本机）
- 基线/最终回归：`audit/evidence/phase-f/verification/browser-regression-{baseline,final}.{md,json}`
- 静态审计：`audit/evidence/phase-f/editor/`、`audit/evidence/phase-f/tools/`
- 决策：`docs/decisions/ADR-0002-functional-integrity-fixes.md`
