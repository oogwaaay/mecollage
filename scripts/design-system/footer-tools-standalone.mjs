#!/usr/bin/env node
/**
 * FooterTools for pages without <footer>（R2 Phase 2B-1）
 * ============================================================================
 * 39 个本地化/指南页没有 <footer>（历史现状）。按用户要求：不重建整站 footer，
 * 只给这些页面加一个轻量页脚 Tools 导航（5 个真实工具链接，本地化前缀/文案），
 * 让全站每页都有工具入口与内链（SEO），不改变现有内容结构/URL。
 *
 * 用法：
 *   node scripts/design-system/footer-tools-standalone.mjs            # dry-run
 *   node scripts/design-system/footer-tools-standalone.mjs --apply
 *   node scripts/design-system/footer-tools-standalone.mjs --apply --json out.json --report out.md
 * 幂等；只处理无 <footer> 且无 footer-tools 的站点 HTML（排除 404）。
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
  console.log('FooterTools（无 footer 页面）v1.0.0\n\n用法：node scripts/design-system/footer-tools-standalone.mjs [--apply] [--json out.json] [--report out.md]');
  process.exit(0);
}

const LANGS = { '': 'en', zh: 'zh', tw: 'zh-tw', ja: 'ja', es: 'es' };
const I18N = {};
for (const [prefix, lang] of Object.entries(LANGS)) I18N[prefix] = JSON.parse(readFileSync(resolve(ROOT, `i18n/${lang}.json`), 'utf8'));
const TOOLS = [
  ['tool.collage_maker', ''],
  ['tool.square_crop', 'tools/squarecrop/'],
  ['tool.rounded_corners', 'tools/roundedcorners/'],
  ['tool.square_image', 'tools/square/'],
  ['tool.blurred_frame', 'tools/blurredframe/'],
];
const files = execFileSync('git', ['ls-files', '*.html'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n')
  .filter((f) => f && f !== '404.html' && !f.startsWith('docs/') && !f.startsWith('audit/') && !f.startsWith('scripts/'));

const actions = [];
const errors = [];
for (const file of files) {
  let html;
  try { html = readFileSync(resolve(ROOT, file), 'utf8'); } catch { errors.push({ file, error: 'read' }); continue; }
  if (/<footer>/.test(html) || html.includes('class="footer-tools')) continue;
  const prefix = (file.match(/^(zh|tw|ja|es)\//) || [])[1] || '';
  const label = (key) => I18N[prefix][key] || I18N.en[key] || key;
  const href = (path) => (path ? `/${prefix ? prefix + '/' : ''}${path}` : (prefix ? `/${prefix}/` : '/'));
  const links = TOOLS.map(([key, path]) => `    <a href="${href(path)}" data-i18n="${key}">${label(key)}</a>`).join('\n');
  const nav = [
    '    <nav class="footer-tools footer-tools--standalone" aria-label="' + (I18N[prefix]['nav.tools'] || 'Tools') + '" data-i18n-aria-label="nav.tools">',
    links,
    '    </nav>',
    '',
  ].join('\n');
  // 插入到 </body> 前（若页尾有 ui.js script，插到它之前，保持脚本最后）
  const scriptIdx = html.lastIndexOf('<script src="/assets/js/ui.js"');
  const before = scriptIdx !== -1 ? scriptIdx : html.lastIndexOf('</body>');
  if (before === -1) { errors.push({ file, error: 'no insertion point' }); continue; }
  html = html.slice(0, before) + nav + html.slice(before);
  actions.push({ file, action: 'footer-tools-standalone:insert' });
  if (args.values.apply) writeFileSync(resolve(ROOT, file), html);
}
const summary = { tool: 'footer-tools-standalone', version: '1.0.0', mode: args.values.apply ? 'apply' : 'dry-run', generatedAt: new Date().toISOString(), filesScanned: files.length, actions, errors };
if (args.values.json) { const p = resolve(ROOT, args.values.json); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(summary, null, 2) + '\n'); }
if (args.values.report) {
  const md = ['# FooterTools（无 footer 页面）报告', '', `- 模式：**${summary.mode}**`, `- 扫描：${files.length} 页`, `- 变更：${actions.length} 处；异常：${errors.length}`, '', '| 文件 | 动作 |', '|---|---|', ...actions.map((a) => `| \`${a.file}\` | ${a.action} |`)].join('\n') + '\n';
  const p = resolve(ROOT, args.values.report); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, md);
}
console.log(`[footer-tools-standalone] ${summary.mode}: ${actions.length} 处 / ${errors.length} 异常（扫描 ${files.length} 页）`);
process.exit(errors.length ? 1 : 0);
