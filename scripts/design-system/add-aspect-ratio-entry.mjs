#!/usr/bin/env node
/**
 * add-aspect-ratio-entry.mjs — 英文站内入口注入（Aspect Ratio Calculator 上线，Phase AR-1）
 *
 * 目标（维护者 2026-11-06 决策：三处都加 + 上线当天 ≥8 页入链）：
 *   1) 所有英文页 footer-tools 追加第 6 个工具链接（已存在则跳过）；
 *   2) 首页 + 4 个英文工具页的 tool-nav 追加 Aspect Ratio 链接；
 *   3) 只处理英文页（不含 zh/tw/ja/es 前缀），本地化版本等 4 语言翻译完成后同批处理。
 * 幂等：已含 /tools/aspectratiocalculator/ 的页面跳过；重复跑 --apply 不会重复插入。
 *
 * 用法：
 *   node scripts/design-system/add-aspect-ratio-entry.mjs            # dry-run
 *   node scripts/design-system/add-aspect-ratio-entry.mjs --apply    # 写盘
 *   node scripts/design-system/add-aspect-ratio-entry.mjs --json out.json --report out.md
 *
 * 写范围：仅 git 跟踪的英文 HTML（不碰 404.html / docs / audit / scripts）。
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const ROOT = process.cwd();
const HREF = '/tools/aspectratiocalculator/';
const FOOTER_LINK = `                    <a href="${HREF}" data-i18n="tool.aspect_ratio_calculator">Aspect Ratio Calculator</a>`;
const TOOL_NAV_LINK = `                    <a href="${HREF}" class="tool-nav-link"><i class="fas fa-expand"></i> <span data-i18n="tool.common.nav_aspect_ratio">Aspect Ratio</span></a>`;

const args = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    json: { type: 'string' },
    report: { type: 'string' },
  },
});

const files = execFileSync('git', ['ls-files', '*.html'], { cwd: ROOT, encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter((file) => file && file !== '404.html' && !/^(zh|tw|ja|es)\//.test(file) && !/^(docs|audit|scripts)\//.test(file));

const actions = [];
const errors = [];
const skipped = [];

function insertFooterLink(html) {
  const match = html.match(/<nav class="footer-tools[^"]*"[\s\S]*?<\/nav>/);
  if (!match) return { html, changed: false };
  if (match[0].includes(HREF)) return { html, changed: false };
  const block = match[0];
  const updated = block.replace(/<\/nav>\s*$/, `${FOOTER_LINK}\n            </nav>`);
  return { html: html.replace(block, updated), changed: true };
}

function insertToolNavLink(html) {
  const match = html.match(/<nav class="tool-nav"[\s\S]*?<\/nav>/);
  if (!match) return { html, changed: false };
  if (match[0].includes(HREF)) return { html, changed: false };
  const block = match[0];
  const close = block.lastIndexOf('</div>');
  if (close === -1) return { html, changed: false };
  const updated = block.slice(0, close) + `${TOOL_NAV_LINK}\n                ` + block.slice(close);
  return { html: html.replace(block, updated), changed: true };
}

for (const file of files) {
  let html;
  try {
    html = readFileSync(resolve(ROOT, file), 'utf8');
  } catch (error) {
    errors.push({ file, error: `read: ${error.message}` });
    continue;
  }
  const before = html;

  const footer = insertFooterLink(html);
  html = footer.html;
  if (footer.changed) actions.push({ file, action: 'footer-tools:add-aspect-ratio' });

  // tool-nav 只在首页与工具页存在；内容页有 tool-nav 属于历史问题，不在此脚本处理。
  const toolNav = insertToolNavLink(html);
  html = toolNav.html;
  if (toolNav.changed) actions.push({ file, action: 'tool-nav:add-aspect-ratio' });

  if (html === before) {
    skipped.push(file);
    continue;
  }
  if (args.values.apply) writeFileSync(resolve(ROOT, file), html, 'utf8');
}

const summary = {
  tool: 'add-aspect-ratio-entry',
  version: '1.0.0',
  generatedAt: new Date().toISOString(),
  mode: args.values.apply ? 'apply' : 'dry-run',
  filesScanned: files.length,
  actions,
  errors,
  skippedCount: skipped.length,
};
if (args.values.json) {
  const path = resolve(ROOT, args.values.json);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(summary, null, 2)}\n`);
}
if (args.values.report) {
  const lines = ['# Aspect Ratio 英文站内入口注入报告', '', `- 模式：**${summary.mode}**`, `- 扫描英文页：${files.length}`, `- 变更：${actions.length} 处；跳过：${skipped.length}；异常：${errors.length}`, '', '| 文件 | 动作 |', '|---|---|', ...actions.map((a) => `| \`${a.file}\` | ${a.action} |`)];
  if (errors.length) lines.push('', '## 异常', '', ...errors.map((e) => `- \`${e.file}\`: ${e.error}`));
  const path = resolve(ROOT, args.values.report);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${lines.join('\n')}\n`);
}
console.log(`[add-aspect-ratio-entry] ${summary.mode}: ${actions.length} 处变更 / ${skipped.length} 跳过 / ${errors.length} 异常（扫描 ${files.length} 页）`);
for (const action of actions) console.log(`  - ${action.file} → ${action.action}`);
for (const error of errors) console.error(`  ! ${error.file}: ${error.error}`);
process.exit(errors.length ? 1 : 0);
