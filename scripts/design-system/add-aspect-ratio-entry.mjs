#!/usr/bin/env node
/**
 * add-aspect-ratio-entry.mjs — 站内入口注入（Aspect Ratio Calculator，Phase AR-2 五语言）
 *
 * 目标：
 *   1) 每个页面 footer-tools 追加第 6 个工具链接（已存在则跳过）；
 *   2) 首页 + 工具页 tool-nav 追加 Aspect Ratio 链接（本地化页用本地化 URL/标签）；
 *   3) 英文页 → /tools/aspectratiocalculator/；zh/tw/ja/es 页 → /<prefix>/tools/aspectratiocalculator/；
 *   4) 标签取 i18n/{lang}.json 的 tool.aspect_ratio_calculator 词条。
 * 幂等：已含目标 href 的页面跳过；重复跑 --apply 不会重复插入。
 *
 * 用法：
 *   node scripts/design-system/add-aspect-ratio-entry.mjs            # dry-run
 *   node scripts/design-system/add-aspect-ratio-entry.mjs --apply    # 写盘
 *   node scripts/design-system/add-aspect-ratio-entry.mjs --json out.json --report out.md
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const ROOT = process.cwd();
const LANGS = { '': 'en', zh: 'zh', tw: 'zh-tw', ja: 'ja', es: 'es' };
const I18N = {};
for (const [prefix, lang] of Object.entries(LANGS)) {
  I18N[prefix] = JSON.parse(readFileSync(resolve(ROOT, `i18n/${lang}.json`), 'utf8'));
}

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
  .filter((file) => file && file !== '404.html' && !/^(docs|audit|scripts)\//.test(file));

const actions = [];
const errors = [];
const skipped = [];

function localeOf(file) {
  const match = file.match(/^(zh|tw|ja|es)\//);
  return match ? match[1] : '';
}

function targetHref(prefix) {
  return prefix ? `/${prefix}/tools/aspectratiocalculator/` : '/tools/aspectratiocalculator/';
}

function labelFor(prefix) {
  return I18N[prefix]['tool.aspect_ratio_calculator'] || I18N['']['tool.aspect_ratio_calculator'];
}

function insertFooterLink(html, href, label) {
  const match = html.match(/<nav class="footer-tools[^"]*"[\s\S]*?<\/nav>/);
  if (!match) return { html, changed: false };
  if (match[0].includes(`href="${href}"`)) return { html, changed: false };
  const block = match[0];
  const updated = block.replace(/<\/nav>\s*$/, `                    <a href="${href}" data-i18n="tool.aspect_ratio_calculator">${label}</a>\n            </nav>`);
  return { html: html.replace(block, updated), changed: true };
}

function insertToolNavLink(html, href) {
  const match = html.match(/<nav class="tool-nav"[\s\S]*?<\/nav>/);
  if (!match) return { html, changed: false };
  if (match[0].includes(`href="${href}"`)) return { html, changed: false };
  const block = match[0];
  const close = block.lastIndexOf('</div>');
  if (close === -1) return { html, changed: false };
  const label = I18N[currentPrefix]['tool.common.nav_aspect_ratio'] || 'Aspect Ratio';
  const link = `                    <a href="${href}" class="tool-nav-link"><i class="fas fa-expand"></i> <span data-i18n="tool.common.nav_aspect_ratio">${label}</span></a>`;
  const updated = block.slice(0, close) + link + '\n                ' + block.slice(close);
  return { html: html.replace(block, updated), changed: true };
}

let currentPrefix = '';
for (const file of files) {
  currentPrefix = localeOf(file);
  let html;
  try {
    html = readFileSync(resolve(ROOT, file), 'utf8');
  } catch (error) {
    errors.push({ file, error: `read: ${error.message}` });
    continue;
  }
  const before = html;
  const href = targetHref(currentPrefix);
  const label = labelFor(currentPrefix);

  const footer = insertFooterLink(html, href, label);
  html = footer.html;
  if (footer.changed) actions.push({ file, action: 'footer-tools:add-aspect-ratio' });

  const toolNav = insertToolNavLink(html, href);
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
  version: '2.0.0',
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
  const lines = ['# Aspect Ratio 站内入口注入报告', '', `- 模式：**${summary.mode}**`, `- 扫描页面：${files.length}`, `- 变更：${actions.length} 处；跳过：${skipped.length}；异常：${errors.length}`, '', '| 文件 | 动作 |', '|---|---|', ...actions.map((a) => `| \`${a.file}\` | ${a.action} |`)];
  if (errors.length) lines.push('', '## 异常', '', ...errors.map((e) => `- \`${e.file}\`: ${e.error}`));
  const path = resolve(ROOT, args.values.report);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${lines.join('\n')}\n`);
}
console.log(`[add-aspect-ratio-entry] ${summary.mode}: ${actions.length} 处变更 / ${skipped.length} 跳过 / ${errors.length} 异常（扫描 ${files.length} 页）`);
for (const action of actions) console.log(`  - ${action.file} → ${action.action}`);
for (const error of errors) console.error(`  ! ${error.file}: ${error.error}`);
process.exit(errors.length ? 1 : 0);
