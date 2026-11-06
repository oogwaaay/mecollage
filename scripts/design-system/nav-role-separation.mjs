#!/usr/bin/env node
/**
 * 导航角色分离（R2 Phase 1）迁移脚本
 * ============================================================================
 * 目标（方案 B：1 全局 + 1 局部）：
 *   1) 工具页 `.tool-nav` 去掉 Home（全局导航已有 Home；局部只负责工具切换）；
 *   2) 内容页（about/contact）移除 `.tool-nav`（它们不是工具页，局部导航无意义）；
 *   3) 首页移除 `.home-tool-entry` 重复工具卡（工具入口只出现一次）；
 *   4) 所有页面 footer 增加 Tools 导航（5 个真实链接，保住内链/SEO，为 Phase 2 准备）；
 *   5) 页面文案使用当前语言（生成时读取 i18n JSON，无 JS 也正确）；data-i18n 键保留供切换语言。
 *
 * 用法：
 *   node scripts/design-system/nav-role-separation.mjs            # dry-run（默认）
 *   node scripts/design-system/nav-role-separation.mjs --apply    # 写盘
 *   node scripts/design-system/nav-role-separation.mjs --json out.json --report out.md
 * 退出码：0 成功；1 有异常；2 参数/环境错误。
 *
 * 约束：不改 URL / 重定向 / canonical / hreflang / 文章链接；幂等；只处理站点 HTML（排除 404）。
 */

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve, relative } from 'node:path';

const ROOT = process.cwd();
const args = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    json: { type: 'string' },
    report: { type: 'string' },
    help: { type: 'boolean', short: 'h', default: false },
  },
  allowPositionals: false,
});
if (args.values.help) {
  console.log(`导航角色分离（R2 Phase 1） v1.0.0

用法：node scripts/design-system/nav-role-separation.mjs [--apply] [--json out.json] [--report out.md]
  --apply   写盘（默认 dry-run）
退出码：0 成功；1 有异常；2 参数/环境错误。`);
  process.exit(0);
}

const LANGS = {
  '': 'en',
  zh: 'zh',
  tw: 'zh-tw',
  ja: 'ja',
  es: 'es',
};
const PREFIX_RE = /^(zh|tw|ja|es)\//;
const I18N = {};
for (const [prefix, lang] of Object.entries(LANGS)) I18N[prefix] = JSON.parse(readFileSync(resolve(ROOT, `i18n/${lang}.json`), 'utf8'));

const TOOLS = [
  { key: 'tool.collage_maker', path: '', label: 'Collage Maker' },
  { key: 'tool.square_crop', path: 'tools/squarecrop/', label: 'Square Crop' },
  { key: 'tool.rounded_corners', path: 'tools/roundedcorners/', label: 'Rounded Corners' },
  { key: 'tool.square_image', path: 'tools/square/', label: 'Square Image' },
  { key: 'tool.blurred_frame', path: 'tools/blurredframe/', label: 'Blurred Frame' },
];

const files = execFileSync('git', ['ls-files', '*.html'], { cwd: ROOT, encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter((f) => f && f !== '404.html' && !f.startsWith('docs/') && !f.startsWith('audit/') && !f.startsWith('scripts/'));

const actions = [];
const errors = [];
const summarySkippedFooter = [];

function prefixOf(file) {
  const m = file.match(PREFIX_RE);
  return m ? m[1] : '';
}
function labelFor(prefix, key) {
  return I18N[prefix][key] || I18N.en[key] || key;
}
function homeHref(prefix) {
  return prefix ? `/${prefix}/` : '/';
}
function toolHref(prefix, path) {
  return path ? `/${prefix ? prefix + '/' : ''}${path}` : homeHref(prefix);
}

function footerNav(prefix) {
  const links = TOOLS.map((t) => {
    const label = labelFor(prefix, t.key);
    return `                <a href="${toolHref(prefix, t.path)}" data-i18n="${t.key}">${label}</a>`;
  }).join('\n');
  return [
    '            <nav class="footer-tools" aria-label="' + (labelFor(prefix, 'nav.tools') || 'Tools') + '" data-i18n-aria-label="nav.tools">',
    links,
    '            </nav>',
  ].join('\n');
}

function findAll(haystack, needle) {
  const out = [];
  let idx = 0;
  while ((idx = haystack.indexOf(needle, idx)) !== -1) {
    out.push(idx);
    idx += needle.length;
  }
  return out;
}

function removeBalancedDiv(html, startNeedle) {
  const start = html.indexOf(startNeedle);
  if (start === -1) return { html, removed: false };
  const openEnd = html.indexOf('>', start);
  if (openEnd === -1) return { html, removed: false };
  // 该块内只有 <a>/<strong>/<span>，没有嵌套 div；仍做一次深度扫描以防未来变化
  let depth = 1;
  let i = openEnd + 1;
  const tagRe = /<(\/?)div\b[^>]*>/gi;
  tagRe.lastIndex = i;
  let m;
  while ((m = tagRe.exec(html))) {
    if (m[1] === '/') depth -= 1; else depth += 1;
    if (depth === 0) {
      const end = m.index + m[0].length;
      return { html: html.slice(0, start) + html.slice(end), removed: true };
    }
  }
  return { html, removed: false };
}

function removeNavBlock(html, cls) {
  const startNeedle = `<nav class="${cls}"`;
  const start = html.indexOf(startNeedle);
  if (start === -1) return { html, removed: false };
  const end = html.indexOf('</nav>', start);
  if (end === -1) return { html, removed: false };
  const endLen = '</nav>'.length;
  // 吃掉行首缩进
  let lineStart = html.lastIndexOf('\n', start) + 1;
  return { html: html.slice(0, lineStart) + html.slice(end + endLen).replace(/^[ \t]*\n?/, ''), removed: true };
}

function removeToolNavHome(html) {
  const start = html.indexOf('<nav class="tool-nav"');
  if (start === -1) return { html, removed: false };
  const end = html.indexOf('</nav>', start);
  if (end === -1) return { html, removed: false };
  const block = html.slice(start, end);
  const homeIdx = block.indexOf('fa-home');
  if (homeIdx === -1) return { html, removed: false };
  const aStart = block.lastIndexOf('<a ', homeIdx);
  if (aStart === -1) return { html, removed: false };
  const aEnd = block.indexOf('</a>', homeIdx);
  if (aEnd === -1) return { html, removed: false };
  const removeFrom = start + aStart;
  const removeTo = start + aEnd + '</a>'.length;
  let lineStart = html.lastIndexOf('\n', removeFrom) + 1;
  let lineEnd = html.indexOf('\n', removeTo);
  if (lineEnd === -1) lineEnd = removeTo;
  return { html: html.slice(0, lineStart) + html.slice(lineEnd + 1), removed: true };
}

for (const file of files) {
  let html;
  try {
    html = readFileSync(resolve(ROOT, file), 'utf8');
  } catch (e) {
    errors.push({ file, error: 'read: ' + e.message });
    continue;
  }
  // 40 个本地化/指南页没有 <footer>（历史现状），跳过 footer-tools 注入；
  // 其余导航改造（tool-nav/home cards）仍需处理。
  const hasFooter = /<footer>/.test(html);
  if (!hasFooter) summarySkippedFooter.push(file);
  const prefix = prefixOf(file);
  const before = html;

  // 4) footer Tools（有 footer 的页面；幂等）
  if (hasFooter && !html.includes('class="footer-tools')) {
    const footerIdx = html.indexOf('<footer>');
    const pIdx = html.indexOf('<p>', footerIdx);
    if (pIdx === -1) {
      errors.push({ file, error: 'footer has no <p>' });
      continue;
    }
    html = html.slice(0, pIdx) + footerNav(prefix) + '\n' + html.slice(pIdx);
    actions.push({ file, action: 'footer-tools:insert' });
  }

  // 2) about/contact：移除局部工具导航
  if (/^(zh\/|tw\/|ja\/|es\/)?(about|contact)\.html$/.test(file) && html.includes('class="tool-nav"')) {
    const r = removeNavBlock(html, 'tool-nav');
    if (r.removed) {
      html = r.html;
      actions.push({ file, action: 'tool-nav:remove(content-page)' });
    }
  }

  // 1) 工具页：tool-nav 去掉 Home
  if (/^(zh\/|tw\/|ja\/|es\/)?tools\//.test(file) || /^public\/tools\//.test(file)) {
    const r = removeToolNavHome(html);
    if (r.removed) {
      html = r.html;
      actions.push({ file, action: 'tool-nav:remove-home' });
    }
  }

  // 3) 首页：移除重复工具卡
  if (/^(zh\/|tw\/|ja\/|es\/)?index\.html$/.test(file) && html.includes('class="home-tool-entry"')) {
    const r = removeBalancedDiv(html, '<div class="home-tool-entry"');
    if (r.removed) {
      html = r.html;
      actions.push({ file, action: 'home-tool-entry:remove' });
    }
  }

  if (html !== before) {
    if (args.values.apply) {
      writeFileSync(resolve(ROOT, file), html);
      actions[actions.length - 1].written = true;
    }
  }
}

const summary = {
  tool: 'nav-role-separation',
  version: '1.0.0',
  mode: args.values.apply ? 'apply' : 'dry-run',
  generatedAt: new Date().toISOString(),
  filesScanned: files.length,
  actions,
  errors,
  byAction: actions.reduce((acc, a) => ((acc[a.action] = (acc[a.action] || 0) + 1), acc), {}),
  skippedNoFooter: summarySkippedFooter,
};
const md = [
  '# 导航角色分离（R2 Phase 1）迁移报告',
  '',
  `- 模式：**${summary.mode}**`,
  `- 时间：${summary.generatedAt}`,
  `- 扫描页面：${summary.filesScanned}`,
  `- 变更：${actions.length} 处；异常：${errors.length} 处；无 footer 跳过：${summarySkippedFooter.length} 页`,
  '',
  '## 变更统计',
  '',
  '| 动作 | 数量 |',
  '|---|---:|',
  ...Object.entries(summary.byAction).map(([k, v]) => `| \`${k}\` | ${v} |`),
  '',
  '## 明细',
  '',
  '| 文件 | 动作 | 写盘 |',
  '|---|---|---|',
  ...actions.map((a) => `| \`${a.file}\` | ${a.action} | ${a.written ? 'yes' : 'dry-run'} |`),
  '',
  errors.length ? '## 异常\n\n' + errors.map((e) => `- \`${e.file}\`: ${e.error}`).join('\n') : '## 异常\n\n无。',
];
if (args.values.json) {
  const p = resolve(ROOT, args.values.json);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(summary, null, 2) + '\n');
}
if (args.values.report) {
  const p = resolve(ROOT, args.values.report);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, md.join('\n') + '\n');
}
console.log(`[nav-role-separation] ${summary.mode}: ${actions.length} 处变更 / ${errors.length} 异常（扫描 ${files.length} 页）`);
for (const [k, v] of Object.entries(summary.byAction)) console.log(`  ${k}: ${v}`);
if (args.values.apply) console.log('已写盘（--apply）');
else console.log('dry-run：未写盘，确认后加 --apply');
process.exit(errors.length ? 1 : 0);
