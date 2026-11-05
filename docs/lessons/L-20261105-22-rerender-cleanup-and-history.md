# L-20261105-22 — 重渲染必须清理容器；撤销必须在变更前快照

| 字段 | 值 |
|---|---|
| ID | L-20261105-22 |
| 日期 | 2026-11-05 |
| 状态 | mitigated（Phase F 已修复首页撤销/重做与文字/贴纸容器残留） |
| 严重度 | P1 |
| 证据层 | 代码层 + 浏览器实测 |
| 关联文件 | `assets/js/mecollage-main.js`（`renderTextLayers/renderStickerLayers/saveState/startDrag`） |
| 发现来源 | Phase F 浏览器回归 IDX-20 持续 FAIL，排查发现根因不在键盘处理 |

## 症状

- 拖拽文字后 Ctrl+Z 位置不变；重做也无效；
- DOM 中同时存在多个 `.text-wrapper`/`.text-layers-container`，`document.querySelector('.text-wrapper')` 命中旧节点（旧坐标），表现为“撤销无效”；
- 贴纸每次切工具重复绑定 click → 点一次加多个；
- 撤销栈保存的是“操作后”状态，第一次撤销必然 no-op。

## 根因

1. `renderTextLayers()`/`renderStickerLayers()` 只删除 `.text-layer`/`.sticker-layer` 子元素，留下旧容器与 wrapper；
2. `saveState()` 唯一调用在 `mouseup`（拖拽结束）之后，栈里是操作后状态；
3. 重复 `addEventListener` 未加幂等保护。

## 规则（必须）

1. 重渲染时删除**整个图层容器**（或记录并复用），不能只删子元素；验收时断言 DOM 无残留。
2. 撤销栈必须在**变更前**记录快照（开始拖拽/添加/删除前），快照深拷贝可变对象。
3. 静态按钮的事件绑定必须幂等（只绑一次），或在每次渲染时重建（此时旧节点应已移除）。
4. 回归测试要读“用户可见位置/状态”，不要只读内部变量。

## 检测方法

```bash
node scripts/functional-audit/run-tests.mjs   # IDX-20：拖拽→Ctrl+Z→位置应回到拖拽前
# 代码层
grep -n "querySelectorAll('.text-layer')\|querySelectorAll('.sticker-layer')\|saveState()\|addEventListener('click'" assets/js/mecollage-main.js
```

## 反例 / 正确做法

- 反例：`existingTextLayers = querySelectorAll('.text-layer'); remove()` 留下 wrapper。
- 正确：`querySelectorAll('.text-layers-container').forEach(remove)`；`startDrag()` 开头 `saveState()`；`bindStickerEvents()` 用 `_stickerEventsBound` 幂等。

## 证据

- `audit/evidence/phase-f/browser/report.md` IDX-20（基线 FAIL → 修复后 PASS）；
- `audit/PHASE-F-REPORT.md` F-05/F-06。

## 后续动作

- [x] 修复首页撤销/重做核心路径与贴纸重复绑定。
- [ ] 完整 undo 覆盖（上传/删除/排序/比例/filter 等）需单独设计（Phase G）。
