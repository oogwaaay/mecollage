#!/usr/bin/env node
/**
 * GitHub 链接图标化（导航右上角）
 * ============================================================================
 * 目标：顶部导航的 GitHub 入口从「图标+文字」改为「纯图标按钮」：
 *   - 内联 SVG（不依赖 Font Awesome CDN，断网/被拦截也可见）；
 *   - 44×44 触控热区；aria-label + title 提供可访问名称/提示；
 *   - 页脚保留 "GitHub Issues" 文字链接（发现性/无 JS 兜底）。
 *
 * 用法：
 *   node scripts/design-system/github-icon-link.mjs [--apply] [--json out.json] [--report out.md]
 * 退出码：0；幂等（已含 github-link__icon 的页面跳过）。
 */

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';

const ROOT = process.cwd();
const args = parseArgs({ options: { apply: { type: 'boolean', default: false }, json: { type: 'string' }, report: { type: 'string' }, help: { type: 'boolean', short: 'h', default: false } }, allowPositionals: false });
if (args.values.help) { console.log('GitHub 图标化 v1.0.0\n\n用法：node scripts/design-system/github-icon-link.mjs [--apply]'); process.exit(0); }

const LANGS = { '': 'en', zh: 'zh', tw: 'zh-tw', ja: 'ja', es: 'es' };
const I18N = {};
for (const [prefix, lang] of Object.entries(LANGS)) I18N[prefix] = JSON.parse(readFileSync(resolve(ROOT, `i18n/${lang}.json`), 'utf8'));
const GITHUB_PATH = 'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z';
const files = execFileSync('git', ['ls-files', '*.html'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n')
  .filter((f) => f && f !== '404.html' && !f.startsWith('docs/') && !f.startsWith('audit/') && !f.startsWith('scripts/'));

const actions = [];
const errors = [];
for (const file of files) {
  let html;
  try { html = readFileSync(resolve(ROOT, file), 'utf8'); } catch { errors.push({ file, error: 'read' }); continue; }
  if (!/class="[^"]*github-link[^"]*"/.test(html)) continue;
  if (html.includes('github-link__icon')) continue;
  const anchorRe = /<a\b[^>]*class="[^"]*github-link[^"]*"[\s\S]*?<\/a>/;
  const m = html.match(anchorRe);
  if (!m) { errors.push({ file, error: 'github-link anchor not found' }); continue; }
  const anchor = m[0];
  const href = (anchor.match(/href="([^"]+)"/) || [])[1] || 'https://github.com/oogwaaay/mecollage/issues';
  const prefix = (file.match(/^(zh|tw|ja|es)\//) || [])[1] || '';
  const title = (anchor.match(/title="([^"]+)"/) || [])[1] || (I18N[prefix]['nav.github_view'] || 'View on GitHub');
  const label = I18N[prefix]['nav.github_view'] || 'View on GitHub';
  const replacement = [
    `<a href="${href}"`,
    '                   target="_blank"',
    '                   rel="noopener noreferrer"',
    '                   class="nav-link github-link"',
    `                   title="${title}"`,
    '                   data-i18n-title="nav.github_view"',
    `                   aria-label="${label}"`,
    '                   data-i18n-aria-label="nav.github_view">',
    `                    <svg class="github-link__icon" viewBox="0 0 16 16" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="${GITHUB_PATH}"/></svg>`,
    '                </a>',
  ].join('\n');
  html = html.replace(anchor, replacement);
  actions.push({ file, action: 'github-link:icon-only' });
  if (args.values.apply) writeFileSync(resolve(ROOT, file), html);
}
const summary = { tool: 'github-icon-link', version: '1.0.0', mode: args.values.apply ? 'apply' : 'dry-run', generatedAt: new Date().toISOString(), filesScanned: files.length, actions, errors };
if (args.values.json) { const p = resolve(ROOT, args.values.json); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(summary, null, 2) + '\n'); }
if (args.values.report) { const md = ['# GitHub 图标化报告', '', `- 模式：**${summary.mode}**`, `- 变更：${actions.length} 处；异常：${errors.length}`, '', ...actions.map((a) => `- \`${a.file}\` ${a.action}`), errors.length ? '\n## 异常\n\n' + errors.map((e) => `- \`${e.file}\`: ${e.error}`).join('\n') : ''].join('\n') + '\n'; const p = resolve(ROOT, args.values.report); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, md); }
console.log(`[github-icon-link] ${summary.mode}: ${actions.length} 处 / ${errors.length} 异常（扫描 ${files.length} 页）`);
process.exit(errors.length ? 1 : 0);
