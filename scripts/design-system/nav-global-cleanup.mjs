#!/usr/bin/env node
/**
 * 导航角色分离 Phase 2A：全局导航收口（R2）
 * ============================================================================
 * 全局导航只负责 wayfinding：品牌(Home) + Blog + About + Contact + 语言。
 * 具体工具不再出现在全局导航（工具切换在页面内 `.tool-nav` / footer Tools）。
 *
 * 本脚本把全局导航里的 `data-page="square"`（Square Image 工具链接）
 * 替换为对应语言的 Contact 链接（真实 <a href>，5 语言，静态文案 + data-i18n）。
 *
 * 用法：
 *   node scripts/design-system/nav-global-cleanup.mjs            # dry-run
 *   node scripts/design-system/nav-global-cleanup.mjs --apply
 *   node scripts/design-system/nav-global-cleanup.mjs --apply --json out.json --report out.md
 * 退出码：0 成功；1 异常；2 参数错误。
 */

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';

const ROOT = process.cwd();
const args = parseArgs({
  options: { apply: { type: 'boolean', default: false }, json: { type: 'string' }, report: { type: 'string' }, help: { type: 'boolean', short: 'h', default: false } },
  allowPositionals: false,
});
if (args.values.help) {
  console.log('导航全局收口 Phase 2A v1.0.0\n\n用法：node scripts/design-system/nav-global-cleanup.mjs [--apply] [--json out.json] [--report out.md]');
  process.exit(0);
}

const LANGS = { '': 'en', zh: 'zh', tw: 'zh-tw', ja: 'ja', es: 'es' };
const I18N = {};
for (const [prefix, lang] of Object.entries(LANGS)) I18N[prefix] = JSON.parse(readFileSync(resolve(ROOT, `i18n/${lang}.json`), 'utf8'));
const files = execFileSync('git', ['ls-files', '*.html'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n')
  .filter((f) => f && f !== '404.html' && !f.startsWith('docs/') && !f.startsWith('audit/') && !f.startsWith('scripts/'));

const actions = [];
const errors = [];
for (const file of files) {
  let html;
  try { html = readFileSync(resolve(ROOT, file), 'utf8'); } catch (e) { errors.push({ file, error: 'read' }); continue; }
  const prefix = (file.match(/^(zh|tw|ja|es)\//) || [])[1] || '';
  const label = I18N[prefix]['nav.contact'] || I18N[prefix]['footer.contact'] || 'Contact';
  const contactHref = prefix ? `/${prefix}/contact/` : '/contact/';
  // 只在 nav-left 内替换 data-page="square" 的 <a>
  const start = html.indexOf('<div class="nav-left"');
  if (start === -1) continue;
  const end = html.indexOf('</div>', start);
  if (end === -1) { errors.push({ file, error: 'nav-left unclosed' }); continue; }
  const block = html.slice(start, end);
  if (!/data-page="square"/.test(block)) continue;
  const newBlock = block.replace(/<a\b[^>]*data-page="square"[^>]*>[\s\S]*?<\/a>/, (m) => {
    const quote = m.includes("'") ? "'" : '"';
    return `<a href="${contactHref}" class="nav-link" data-page="contact" rel="noopener noreferrer" data-i18n="nav.contact">${label}</a>`;
  });
  if (newBlock !== block) {
    html = html.slice(0, start) + newBlock + html.slice(end);
    actions.push({ file, action: 'global-nav:square->contact', href: contactHref });
    if (args.values.apply) writeFileSync(resolve(ROOT, file), html);
  }
}
const summary = { tool: 'nav-global-cleanup', version: '1.0.0', mode: args.values.apply ? 'apply' : 'dry-run', generatedAt: new Date().toISOString(), filesScanned: files.length, actions, errors };
if (args.values.json) { const p = resolve(ROOT, args.values.json); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(summary, null, 2) + '\n'); }
if (args.values.report) {
  const md = ['# 导航全局收口（Phase 2A）报告', '', `- 模式：**${summary.mode}**`, `- 扫描：${summary.filesScanned} 页`, `- 变更：${actions.length} 处；异常：${errors.length}`, '', '| 文件 | 动作 | 新 href |', '|---|---|---|', ...actions.map((a) => `| \`${a.file}\` | ${a.action} | ${a.href} |`)].join('\n') + '\n';
  const p = resolve(ROOT, args.values.report); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, md);
}
console.log(`[nav-global-cleanup] ${summary.mode}: ${actions.length} 处 / ${errors.length} 异常（扫描 ${files.length} 页）`);
process.exit(errors.length ? 1 : 0);
