#!/usr/bin/env node
/**
 * MeCollage 布局 / 触控 / 壁纸 / 反馈门禁 v1.0.0
 * ============================================================================
 * 背景：交互审计发现 4 类会反复回归的问题，这里把它们变成可执行检查：
 *   1) 移动端横向溢出（曾导致固定壁纸层只覆盖视口、横向拖动露出深色兜底）；
 *   2) 固定壁纸层缺失/被覆盖（position 不是 fixed 或 rect 不覆盖视口）；
 *   3) 触控目标过小（< 44×44，Apple HIG / WCAG 2.5.5 目标尺寸）；
 *   4) 代码层"反模式"：alert() 产品反馈、初始 HTML 里提前加载 AI 大库
 *      （onnxruntime / face-api）。
 *
 * 依赖：Node ≥ 20 + 本地 Chrome + 复用 scripts/seo-audit/server.mjs（Vercel 路由模拟）
 *      与 scripts/functional-audit/cdp.mjs（CDP）。不联网：外部 https 请求全部阻断。
 *
 * 用法：
 *   node scripts/design-audit/check-layout.mjs                 # 390 全量 + 代表页 360/320/1440
 *   node scripts/design-audit/check-layout.mjs --full           # 四宽度全量（慢）
 *   node scripts/design-audit/check-layout.mjs --strict-touch   # 触控目标不足也判 FAIL
 *   node scripts/design-audit/check-layout.mjs --json out.json --md out.md
 *
 * 退出码：0 = 无 FAIL（WARN 允许）；1 = 存在 FAIL；2 = 环境/用法错误。
 */

import { parseArgs } from 'node:util';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const TOOL = 'layout-check';
const VERSION = '1.0.0';

const args = parseArgs({
  options: {
    full: { type: 'boolean', default: false },
    'strict-touch': { type: 'boolean', default: false },
    'max-list': { type: 'string', default: '25' },
    json: { type: 'string' },
    md: { type: 'string' },
    help: { type: 'boolean', short: 'h', default: false },
  },
  allowPositionals: false,
});
if (args.values.help) {
  console.log(`MeCollage 布局/触控/壁纸门禁 v${VERSION}

用法：node scripts/design-audit/check-layout.mjs [--full] [--strict-touch] [--json out.json] [--md out.md] [--max-list N]
  --full          四宽度（1440/390/360/320）全量扫描（慢，默认 390 全量 + 代表页其余宽度）
  --strict-touch  触控目标 <44px 也判 FAIL（默认 WARN）
退出码：0 无 FAIL；1 有 FAIL；2 环境/用法错误。`);
  process.exit(0);
}
const MAX_LIST = Number.parseInt(args.values['max-list'], 10);
if (!Number.isFinite(MAX_LIST) || MAX_LIST <= 0) {
  console.error(`[${TOOL}] --max-list 必须是正整数`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// 页面清单（git 跟踪；排除 404 之外的全部站点 HTML）
// ---------------------------------------------------------------------------
function listPages() {
  let files;
  try {
    files = execFileSync('git', ['ls-files', '*.html'], { cwd: ROOT, encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter((f) => f && !f.startsWith('audit/') && !f.startsWith('docs/') && !f.startsWith('scripts/'));
  } catch (e) {
    console.error(`[${TOOL}] 无法列出页面：${e.message}`);
    process.exit(2);
  }
  const toUrl = (f) => {
    if (f === 'index.html') return '/';
    if (f.startsWith('public/tools/')) {
      return '/tools/' + f.split('/').slice(2, -1).join('/') + '/';
    }
    if (f.endsWith('/index.html')) return '/' + f.replace(/index\.html$/, '');
    return '/' + f.replace(/\.html$/, '/');
  };
  return files.map((file) => ({ file, url: toUrl(file) }));
}

const REPRESENTATIVE = [
  '/', '/zh/', '/blog/', '/blog/how-to-make-photo-collage/', '/about/', '/contact/',
  '/tools/square/', '/tools/roundedcorners/', '/privacy/', '/free-collage-maker/',
  '/es/christmas-collage-maker/', '/__no_such_page__/',
];

const pages = listPages();
const widths = args.values.full ? [1440, 390, 360, 320] : [390];
const widthsRepresentative = args.values.full ? [1440, 390, 360, 320] : [1440, 360, 320];

const { startStaticServer } = await import(pathToFileURL(resolve(ROOT, 'scripts/seo-audit/server.mjs')).href);
const { launchChrome, ChromePage } = await import(pathToFileURL(resolve(ROOT, 'scripts/functional-audit/cdp.mjs')).href);

const server = await startStaticServer({ root: ROOT, verbose: false });
const chrome = await launchChrome({ width: 390, height: 844 });
const page = await ChromePage.connect(chrome.pageWsUrl);

const results = { tool: TOOL, version: VERSION, generatedAt: new Date().toISOString(), checks: [] };
const add = (check) => { results.checks.push(check); };

async function measure(url, width, height) {
  await page.enableDomains({ blockedUrls: ['https://*', 'wss://*'], width, height });
  await page.navigate(server.url + url, { timeoutMs: 25000 });
  return page.eval(`(() => {
    const vw = innerWidth;
    const doc = document.documentElement;
    const is404 = location.pathname.includes('__no_such_page__') || location.pathname === '/404/' || location.pathname === '/404';
    const bg = document.querySelector('.ghibli-background');
    let bgInfo = null;
    if (bg) {
      const cs = getComputedStyle(bg);
      const r = bg.getBoundingClientRect();
      bgInfo = { position: cs.position, bgImage: cs.backgroundImage, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } };
    }
    // 触控目标：只检查"独立控件"，不把正文里的行内链接算进来
    const controlSel = 'button, .toolbar-btn, .lang-selector-toggle, .nav-link, .tool-nav-link, .remove-btn, .mode-btn, .size-option, .radius-preset, .download-btn, .btn, .apply-grid-btn, .layout-mode-btn, .sticky-btn, select, input[type="range"], input[type="number"], input[type="checkbox"], a.btn, a.cta-button, a.cta-btn';
    const small = [];
    for (const el of document.querySelectorAll(controlSel)) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (r.width < 44 || r.height < 44) {
        small.push({ tag: el.tagName.toLowerCase(), cls: String(el.className || '').split(/\s+/).slice(0,2).join('.'), w: Math.round(r.width), h: Math.round(r.height), text: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30) });
      }
    }
    return {
      url: location.pathname,
      viewport: { w: vw, h: innerHeight },
      scrollWidth: doc.scrollWidth,
      overflow: doc.scrollWidth - vw,
      is404,
      wallpaper: bgInfo,
      smallTargets: small,
      alertCount: 0,
    };
  })()`);
}

// ---------------------------------------------------------------------------
// 1) 溢出 + 壁纸 + 触控（渲染层）
// ---------------------------------------------------------------------------
const repSet = new Set(REPRESENTATIVE);
const pageWidths = pages.map((p) => ({
  ...p,
  widths: repSet.has(p.url) ? [...new Set([...widths, ...widthsRepresentative])] : [...widths],
}));

const overflowFails = [];
const wallpaperFails = [];
const touchWarns = [];

for (const p of pageWidths) {
  for (const width of p.widths) {
    const height = width <= 390 ? 844 : 900;
    let r;
    try {
      r = await measure(p.url, width, height);
    } catch (e) {
      overflowFails.push({ url: p.url, width, error: String(e.message || e).slice(0, 140) });
      continue;
    }
    if (r.overflow > 1) overflowFails.push({ url: p.url, width, overflow: r.overflow, scrollWidth: r.scrollWidth });
    if (r.is404) continue; // 404 独立主题，不做壁纸要求
    if (!r.wallpaper) wallpaperFails.push({ url: p.url, width, reason: '缺少 .ghibli-background' });
    else {
      const { position, rect } = r.wallpaper;
      const covers = position === 'fixed' && rect.x === 0 && rect.y === 0 && Math.abs(rect.w - r.viewport.w) <= 1 && Math.abs(rect.h - r.viewport.h) <= 1;
      const hasImg = /wallImage/.test(r.wallpaper.bgImage);
      if (!covers || !hasImg) wallpaperFails.push({ url: p.url, width, reason: `position=${position} rect=${rect.w}x${rect.h} img=${hasImg}` });
    }
    if (width === 390 && r.smallTargets.length) touchWarns.push({ url: p.url, small: r.smallTargets.slice(0, 6), count: r.smallTargets.length });
  }
}

add({
  name: 'A. 横向溢出（scrollWidth > innerWidth）',
  level: overflowFails.length ? 'FAIL' : 'PASS',
  detail: overflowFails,
});
add({
  name: 'B. 固定壁纸层（非 404 页：position fixed + 覆盖视口 + wallImage）',
  level: wallpaperFails.length ? 'FAIL' : 'PASS',
  detail: wallpaperFails,
});
add({
  name: 'C. 触控目标 ≥44×44（独立控件；正文行内链接除外）',
  level: touchWarns.length ? (args.values['strict-touch'] ? 'FAIL' : 'WARN') : 'PASS',
  detail: touchWarns,
});

// ---------------------------------------------------------------------------
// 1b) 导航角色分离（静态；R2 Phase 1，无需浏览器）
//     规则：全局导航负责 wayfinding；工具切换是页面上下文。
//     - tool-nav 里不得再有 Home（fa-home / data-i18n=nav.home）
//     - about/contact 内容页不得有 tool-nav
//     - 首页不得有 home-tool-entry 重复工具卡
//     - 有 <footer> 的页面必须有 footer-tools 且恰好 5 个链接
// ---------------------------------------------------------------------------
const navRoleFails = [];
{
  const siteFiles = execFileSync('git', ['ls-files', '*.html'], { cwd: ROOT, encoding: 'utf8' })
    .trim().split('\n').filter((f) => f && f !== '404.html' && !f.startsWith('docs/') && !f.startsWith('audit/') && !f.startsWith('scripts/'));
  for (const f of siteFiles) {
    const html = readFileSync(resolve(ROOT, f), 'utf8');
    const prefix = (f.match(/^(zh|tw|ja|es)\//) || [])[1] || '';
    if (html.includes('<nav class="tool-nav"')) {
      const start = html.indexOf('<nav class="tool-nav"');
      const end = html.indexOf('</nav>', start);
      const block = html.slice(start, end === -1 ? undefined : end);
      if (/data-i18n="nav\.home"/.test(block) || />\s*Home\s*</.test(block)) {
        navRoleFails.push({ file: f, rule: 'tool-nav 仍包含 Home' });
      }
      if (/^(zh\/|tw\/|ja\/|es\/)?(about|contact)\.html$/.test(f)) {
        navRoleFails.push({ file: f, rule: 'about/contact 内容页不应有 tool-nav' });
      }
    }
    if (/^(zh\/|tw\/|ja\/|es\/)?index\.html$/.test(f) && html.includes('class="home-tool-entry"')) {
      navRoleFails.push({ file: f, rule: '首页仍有重复工具卡 home-tool-entry' });
    }
    // GitHub 图标化：纯图标 + 内联 SVG + aria-label，且不得再带文字
    const gh = html.match(/<a\b[^>]*github-link[^>]*>[\s\S]*?<\/a>/);
    if (gh) {
      if (!/github-link__icon/.test(gh[0])) navRoleFails.push({ file: f, rule: 'GitHub 链接缺少内联 SVG 图标' });
      if (!/aria-label="/.test(gh[0])) navRoleFails.push({ file: f, rule: 'GitHub 图标缺少 aria-label' });
      if (/data-i18n="nav\.github"/.test(gh[0]) || />GitHub</.test(gh[0])) navRoleFails.push({ file: f, rule: 'GitHub 链接仍带文字' });
    }

    // 全局导航：wayfinding（品牌/Home/Blog/About/Contact），不得再放具体工具
    if (html.includes('<div class="nav-left"')) {
      const s0 = html.indexOf('<div class="nav-left"');
      const e0 = html.indexOf('</div>', s0);
      const navBlock = html.slice(s0, e0 === -1 ? undefined : e0);
      if (!/data-page="contact"/.test(navBlock)) navRoleFails.push({ file: f, rule: '全局导航缺少 Contact（wayfinding 收口）' });
      if (/data-page="square"/.test(navBlock) || /href="[^"]*\/tools\//.test(navBlock)) navRoleFails.push({ file: f, rule: '全局导航仍包含具体工具链接' });
    }
    // 所有站点页都必须有 footer-tools（有 footer 的放在 footer 内；无 footer 的用 standalone）
    const m = html.match(/<nav class="footer-tools[^"]*"[\s\S]*?<\/nav>/);
    if (!m) navRoleFails.push({ file: f, rule: '缺少 footer-tools（所有页面都必须有工具入口/内链）' });
    else {
      const links = (m[0].match(/<a\s/g) || []).length;
      // Phase AR（2026-11-06）：英文页新增 Aspect Ratio Calculator（6 个工具）；
      // 本地化页要等 4 语言页面同批上线后再改成 6，避免链接到未发布/404 页面。
      const expectedFooterLinks = prefix ? 5 : 6;
      if (links !== expectedFooterLinks) navRoleFails.push({ file: f, rule: `footer-tools 链接数 ${links} != ${expectedFooterLinks}` });
      const hasPrefix = prefix ? m[0].includes(`href="/${prefix}/`) : !m[0].includes('href="/zh/');
      if (!hasPrefix) navRoleFails.push({ file: f, rule: 'footer-tools 链接前缀与页面语言不一致' });
    }
  }
}
add({
  name: 'F. 导航角色分离（tool-nav 无 Home / 内容页无 tool-nav / 无重复工具卡 / footer-tools）',
  level: navRoleFails.length ? 'FAIL' : 'PASS',
  detail: navRoleFails,
});

// ---------------------------------------------------------------------------
// 2) 代码层反模式：alert() 产品反馈 / 初始 HTML 预加载 AI 库
// ---------------------------------------------------------------------------
const jsFiles = execFileSync('git', ['ls-files', 'assets/js/*.js'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
const alertHits = [];
for (const f of jsFiles) {
  const text = readFileSync(resolve(ROOT, f), 'utf8');
  const lines = text.split('\n');
  lines.forEach((ln, i) => {
    const trimmed = ln.trim();
    if (/^(\/\/|\*|\/\*)/.test(trimmed)) return; // 跳过注释（含“禁止 alert”说明）
    if (/\balert\s*\(/.test(ln)) alertHits.push({ file: f, line: i + 1, text: trimmed.slice(0, 100) });
  });
}
add({ name: 'D. 禁止 alert() 作为产品反馈（应使用 toast）', level: alertHits.length ? 'FAIL' : 'PASS', detail: alertHits });

const indexFiles = execFileSync('git', ['ls-files', 'index.html', '*/index.html'], { cwd: ROOT, encoding: 'utf8' })
  .trim().split('\n').filter((f) => /(^|\/)(index)\.html$/.test(f));
const aiPreload = [];
for (const f of indexFiles) {
  const text = readFileSync(resolve(ROOT, f), 'utf8');
  if (/<script[^>]*src="[^"]*(onnxruntime|face-api)[^"]*"/i.test(text)) aiPreload.push({ file: f });
  else if (/<script[^>]*src="[^"]*onnxruntime|face-api/i.test(text)) aiPreload.push({ file: f });
}
add({ name: 'E. 首屏 HTML 不得预加载 AI 大库（onnxruntime / face-api 懒加载）', level: aiPreload.length ? 'FAIL' : 'PASS', detail: aiPreload });

// ---------------------------------------------------------------------------
// 报告
// ---------------------------------------------------------------------------
const fails = results.checks.filter((c) => c.level === 'FAIL');
const passes = results.checks.filter((c) => c.level === 'PASS');
const warns = results.checks.filter((c) => c.level === 'WARN');
const verdict = fails.length ? 'FAIL' : 'PASS';

const md = [];
const mdAdd = (s = '') => md.push(s);
mdAdd(`# MeCollage 布局 / 触控 / 反馈门禁报告`);
mdAdd();
mdAdd(`- 工具：${TOOL} v${VERSION}`);
mdAdd(`- 时间：${results.generatedAt}`);
mdAdd(`- 页面：${pages.length} 个；宽度：${args.values.full ? '1440/390/360/320 全量' : '390 全量 + 代表页 1440/360/320'}`);
mdAdd(`- 结论：**${verdict}** — PASS ${passes.length} / FAIL ${fails.length} / WARN ${warns.length}`);
mdAdd();
mdAdd(`## 检查结果`);
mdAdd();
for (const c of results.checks) {
  mdAdd(`### ${c.level} — ${c.name}`);
  mdAdd();
  if (c.name.startsWith('C.') && c.detail.length) {
    mdAdd(`| 页面 | 不足数量 | 示例 |`);
    mdAdd(`|---|---:|---|`);
    for (const x of c.detail.slice(0, MAX_LIST)) mdAdd(`| \`${x.url}\` | ${x.count} | ${x.small.map((s) => `${s.tag}.${s.cls}(${s.w}×${s.h})`).join(', ')} |`);
  } else if (c.detail.length) {
    mdAdd(`| 项目 | 详情 |`);
    mdAdd(`|---|---|`);
    for (const d of c.detail.slice(0, MAX_LIST)) mdAdd(`| \`${d.url || d.file || ''}\` | ${JSON.stringify(d).slice(0, 180)} |`);
  } else {
    mdAdd('无问题。');
  }
  mdAdd();
}
const mdText = md.join('\n') + '\n';

if (args.values.json) {
  const p = resolve(ROOT, args.values.json);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(results, null, 2) + '\n');
}
if (args.values.md) {
  const p = resolve(ROOT, args.values.md);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, mdText);
}

console.log(`[${TOOL}] ${verdict}: PASS ${passes.length} / FAIL ${fails.length} / WARN ${warns.length}（${pages.length} 页）`);
for (const c of results.checks) console.log(`  [${c.level}] ${c.name}${c.level === 'FAIL' ? ` — ${c.detail.length} 项` : c.level === 'WARN' ? ` — ${c.detail.length} 页` : ''}`);
if (args.values.json) console.log(`[${TOOL}] JSON: ${relative(ROOT, resolve(ROOT, args.values.json))}`);
if (args.values.md) console.log(`[${TOOL}] MD:   ${relative(ROOT, resolve(ROOT, args.values.md))}`);

await page.close();
await chrome.close();
await server.close();
process.exit(fails.length ? 1 : 0);
