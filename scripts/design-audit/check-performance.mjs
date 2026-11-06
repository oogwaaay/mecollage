#!/usr/bin/env node
/**
 * MeCollage 性能预算门禁 v1.0.0
 * ============================================================================
 * 背景（R2）：移动端性能不能靠"感觉"或 headless FPS 优化——headless Chrome 的
 * rAF 锁 60fps、GPU 合成被虚拟化，A/B 缩减 blur 实测无差异（ADR-0008 记录）。
 * 因此把"性能预算"落在可复现、能防回归的指标上：
 *   A. 静态资源 gzip 体积（tokens/components/JS/HTML/wallpaper）
 *   B. 渲染结构（390×844 离线）：DOM 节点数、最大深度、backdrop-filter 元素数、
 *      样式表数量、外部/本地脚本数量
 *   C. 参考基准：首页 48 个 backdrop 元素、A/B blur 无差异；FPS/长任务只记录不设门槛
 *
 * 用法：
 *   node scripts/design-audit/check-performance.mjs
 *   node scripts/design-audit/check-performance.mjs --json out.json --md out.md
 *   node scripts/design-audit/check-performance.mjs --bench     # 额外跑滚动 A/B 参考
 * 退出码：0 = 全部在预算内（WARN 允许）；1 = 超预算；2 = 环境/用法错误。
 */

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const TOOL = 'performance-budget';
const VERSION = '1.0.0';

const args = parseArgs({
  options: {
    bench: { type: 'boolean', default: false },
    json: { type: 'string' },
    md: { type: 'string' },
    help: { type: 'boolean', short: 'h', default: false },
  },
  allowPositionals: false,
});
if (args.values.help) {
  console.log(`MeCollage 性能预算门禁 v${VERSION}

用法：node scripts/design-audit/check-performance.mjs [--bench] [--json out.json] [--md out.md]
  --bench   额外跑 390 宽滚动 A/B（默认 blur vs 缩减 blur）参考数据（不作为门槛）
退出码：0 预算内；1 超预算；2 环境/用法错误。`);
  process.exit(0);
}

const budget = JSON.parse(readFileSync(resolve(ROOT, 'scripts/design-audit/performance-budget.json'), 'utf8'));
const results = { tool: TOOL, version: VERSION, generatedAt: new Date().toISOString(), checks: [] };
const add = (c) => results.checks.push(c);

// ---------------------------------------------------------------------------
// A. 静态资源 gzip 体积
// ---------------------------------------------------------------------------
const assetRows = [];
for (const [file, cfg] of Object.entries(budget.assets)) {
  let buf;
  try {
    buf = readFileSync(resolve(ROOT, file));
  } catch {
    assetRows.push({ file, error: 'missing' });
    continue;
  }
  const raw = buf.length;
  const gzip = gzipSync(buf, { level: 9 }).length;
  if (cfg.budgetBytes) {
    assetRows.push({ file, raw, gzip, metric: 'bytes', budget: cfg.budgetBytes, value: raw, level: raw > cfg.budgetBytes ? 'FAIL' : raw > cfg.budgetBytes * 0.9 ? 'WARN' : 'PASS' });
  } else {
    assetRows.push({ file, raw, gzip, metric: 'gzip', budget: cfg.budgetGzip, value: gzip, level: gzip > cfg.budgetGzip ? 'FAIL' : gzip > cfg.budgetGzip * 0.9 ? 'WARN' : 'PASS' });
  }
}
add({ name: 'A. 静态资源体积预算（gzip / raw）', level: assetRows.some((r) => r.level === 'FAIL') ? 'FAIL' : assetRows.some((r) => r.level === 'WARN') ? 'WARN' : 'PASS', rows: assetRows });

// ---------------------------------------------------------------------------
// B. 渲染结构（390×844 离线 CDP）
// ---------------------------------------------------------------------------
let renderedRows = [];
try {
  const { startStaticServer } = await import(pathToFileURL(resolve(ROOT, 'scripts/seo-audit/server.mjs')).href);
  const { launchChrome, ChromePage } = await import(pathToFileURL(resolve(ROOT, 'scripts/functional-audit/cdp.mjs')).href);
  const server = await startStaticServer({ root: ROOT, verbose: false });
  const { width, height } = budget.rendered.viewport;
  const chrome = await launchChrome({ width, height });
  const page = await ChromePage.connect(chrome.pageWsUrl);
  await page.enableDomains({ blockedUrls: ['https://*', 'wss://*'], width, height });

  for (const path of budget.rendered.pages) {
    await page.navigate(server.url + path, { timeoutMs: 30000 });
    await page.eval('new Promise((r) => setTimeout(r, 500))');
    const m = await page.eval(`(() => {
      const all = document.querySelectorAll('body *');
      let maxDepth = 0;
      for (const el of all) { let d = 0, n = el; while (n) { d++; n = n.parentElement; } if (d > maxDepth) maxDepth = d; }
      const backdrop = [...all].filter((e) => { const cs = getComputedStyle(e); return cs.backdropFilter && cs.backdropFilter !== 'none' && cs.display !== 'none'; }).length;
      const scripts = [...document.scripts].filter((s) => s.src);
      return {
        nodes: all.length,
        maxDepth,
        backdrop,
        stylesheets: document.querySelectorAll('link[rel=stylesheet]').length,
        externalScripts: scripts.filter((s) => !s.src.startsWith(location.origin)).length,
        localScripts: scripts.filter((s) => s.src.startsWith(location.origin)).length,
      };
    })()`);
    const b = budget.rendered.budgets;
    const over = [];
    if (m.nodes > b.nodes) over.push(`nodes ${m.nodes}>${b.nodes}`);
    if (m.maxDepth > b.maxDepth) over.push(`maxDepth ${m.maxDepth}>${b.maxDepth}`);
    if (m.backdrop > b.backdrop) over.push(`backdrop ${m.backdrop}>${b.backdrop}`);
    if (m.stylesheets > b.stylesheets) over.push(`stylesheets ${m.stylesheets}>${b.stylesheets}`);
    if (m.externalScripts > b.externalScripts) over.push(`externalScripts ${m.externalScripts}>${b.externalScripts}`);
    if (m.localScripts > b.localScripts) over.push(`localScripts ${m.localScripts}>${b.localScripts}`);
    renderedRows.push({ path, ...m, over });
  }
  await page.close();
  await chrome.close();
  await server.close();
} catch (error) {
  renderedRows = [{ path: '(render failed)', over: [String(error && error.message || error).slice(0, 200)] }];
}
add({ name: 'B. 390 宽渲染结构预算（DOM/深度/backdrop/样式表/脚本）', level: renderedRows.some((r) => r.over.length) ? 'FAIL' : 'PASS', rows: renderedRows });

// ---------------------------------------------------------------------------
// C. 参考：390 宽滚动 A/B（headless 仅记录，不作门槛）
// ---------------------------------------------------------------------------
let bench = null;
if (args.values.bench) {
  try {
    const { startStaticServer } = await import(pathToFileURL(resolve(ROOT, 'scripts/seo-audit/server.mjs')).href);
    const { launchChrome, ChromePage } = await import(pathToFileURL(resolve(ROOT, 'scripts/functional-audit/cdp.mjs')).href);
    const server = await startStaticServer({ root: ROOT, verbose: false });
    const chrome = await launchChrome({ width: 390, height: 844 });
    const page = await ChromePage.connect(chrome.pageWsUrl);
    await page.enableDomains({ blockedUrls: ['https://*', 'wss://*'], width: 390, height: 844 });
    const measure = () => page.eval(`(() => new Promise((resolve) => {
      const frames = []; let last = performance.now();
      const target = Math.min(document.documentElement.scrollHeight - innerHeight, 2400);
      let y = 0; const step = Math.max(8, Math.round(target / 150));
      const tick = () => {
        const now = performance.now(); frames.push(now - last); last = now;
        y += step; window.scrollTo(0, y);
        if (y < target && frames.length < 900) requestAnimationFrame(tick);
        else { const s = frames.slice(2).sort((a, b) => a - b); const p = (q) => +(s[Math.min(s.length - 1, Math.floor(s.length * q))] || 0).toFixed(2);
          resolve({ frames: frames.length, avg: +(frames.slice(2).reduce((a, b) => a + b, 0) / Math.max(1, frames.length - 2)).toFixed(2), p95: p(0.95), p99: p(0.99) }); }
      };
      requestAnimationFrame(tick);
    }))()`);
    await page.navigate(server.url + '/');
    await page.eval('new Promise((r) => setTimeout(r, 600))');
    const baseline = await measure();
    await page.eval(`(() => { const s = document.createElement('style'); s.id = 'mc-blur-bench'; s.textContent = '@media (max-width:768px){:root{--mc-blur-xs:3px;--mc-blur-sm:4px;--mc-blur-md:5px;--mc-blur-lg:6px;--mc-blur-xl:8px;--mc-glass-backdrop:8px;--mc-card-blur:6px}}'; document.head.appendChild(s); return true; })()`);
    await page.eval('new Promise((r) => setTimeout(r, 300))');
    const reduced = await measure();
    await page.eval("document.getElementById('mc-blur-bench')?.remove()");
    bench = { page: '/', baseline, reduced, note: 'headless 下 rAF 锁 60fps，差异不代表真实 GPU 成本；不作为门槛（见 ADR-0008）' };
    add({ name: 'C. 390 宽滚动 A/B 参考（信息项）', level: 'INFO', detail: bench });
    await page.close(); await chrome.close(); await server.close();
  } catch (error) {
    add({ name: 'C. 390 宽滚动 A/B 参考（信息项）', level: 'WARN', detail: { error: String(error && error.message || error).slice(0, 200) } });
  }
}

// ---------------------------------------------------------------------------
// 报告
// ---------------------------------------------------------------------------
const fails = results.checks.filter((c) => c.level === 'FAIL');
const warns = results.checks.filter((c) => c.level === 'WARN');
const verdict = fails.length ? 'FAIL' : 'PASS';

const md = [];
md.push(`# MeCollage 性能预算报告`);
md.push('');
md.push(`- 工具：${TOOL} v${VERSION}`);
md.push(`- 时间：${results.generatedAt}`);
md.push(`- 预算文件：\`scripts/design-audit/performance-budget.json\``);
md.push(`- 结论：**${verdict}** — ${results.checks.map((c) => `${c.level}(${c.name.split('.')[0]})`).join(' / ')}`);
md.push('');
md.push('## A. 静态资源体积');
md.push('');
md.push('| 文件 | raw | gzip | 预算 | 级别 |');
md.push('|---|---:|---:|---:|---|');
for (const r of assetRows) {
  if (r.error) { md.push(`| \`${r.file}\` | — | — | — | FAIL(缺失) |`); continue; }
  md.push(`| \`${r.file}\` | ${r.raw} | ${r.gzip} | ${r.budget} ${r.metric} | ${r.level} |`);
}
md.push('');
md.push('## B. 390×844 渲染结构');
md.push('');
md.push('| 页面 | nodes | maxDepth | backdrop | stylesheets | extScripts | localScripts | 级别 |');
md.push('|---|---:|---:|---:|---:|---:|---:|---|');
for (const r of renderedRows) md.push(`| \`${r.path}\` | ${r.nodes ?? '—'} | ${r.maxDepth ?? '—'} | ${r.backdrop ?? '—'} | ${r.stylesheets ?? '—'} | ${r.externalScripts ?? '—'} | ${r.localScripts ?? '—'} | ${r.over.length ? 'FAIL: ' + r.over.join('; ') : 'PASS'} |`);
if (bench) {
  md.push('');
  md.push('## C. 滚动 A/B 参考（headless，仅信息）');
  md.push('');
  md.push('```json');
  md.push(JSON.stringify(bench, null, 2));
  md.push('```');
}
md.push('');
md.push('> 说明：headless Chrome 的 rAF 锁 60fps、GPU 合成被虚拟化，A/B 缩减 blur 无差异不代表真机无收益；本门禁只防"可测量回归"（体积、DOM、backdrop 数量、脚本数量）。真机性能需在 Preview/真机用 Safari/Chrome DevTools 复核（ADR-0008）。');
const mdText = md.join('\n') + '\n';

if (args.values.json) { const p = resolve(ROOT, args.values.json); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(results, null, 2) + '\n'); }
if (args.values.md) { const p = resolve(ROOT, args.values.md); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, mdText); }

console.log(`[${TOOL}] ${verdict}: FAIL ${fails.length} / WARN ${warns.length}（资产 ${assetRows.length} 项 + 页面 ${renderedRows.length} 个）`);
for (const c of results.checks) console.log(`  [${c.level}] ${c.name}`);
for (const r of assetRows) if (r.level !== 'PASS') console.log(`    ${r.level} ${r.file}: ${r.value}/${r.budget} ${r.metric}`);
for (const r of renderedRows) if (r.over.length) console.log(`    FAIL ${r.path}: ${r.over.join('; ')}`);
if (args.values.json) console.log(`[${TOOL}] JSON: ${relative(ROOT, resolve(ROOT, args.values.json))}`);
if (args.values.md) console.log(`[${TOOL}] MD:   ${relative(ROOT, resolve(ROOT, args.values.md))}`);
process.exit(fails.length ? 1 : 0);
