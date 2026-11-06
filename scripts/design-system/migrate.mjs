#!/usr/bin/env node
/**
 * MeCollage 设计统一迁移脚本 v1.0.0（2026-11-06）
 * ============================================================================
 * 目标（G1）：把存量 95 个手写页面上「同语义、不同实现」的设计值，接入
 *   assets/css/design-tokens.css + assets/css/components.css，并做**精确等价**
 *   的 token 化（视觉零变化），为 G2/G3 的进一步收敛铺路。
 *
 * 两个独立步骤：
 *   --inject    在 94 个站点 HTML 的 </head> 前（最后一个 </style> 之后）插入：
 *                 <link rel="stylesheet" href="/assets/css/design-tokens.css">
 *                 <link rel="stylesheet" href="/assets/css/components.css">
 *   --tokenize  把 <style> 块与 style="" 属性里的字面值替换为 var(--mc-*)：
 *                 颜色（含渐变/阴影中的颜色）、font-size、border-radius、
 *                 backdrop-filter blur、整段 box-shadow / text-shadow。
 *
 * 安全约定：
 *   - 只在「精确等价」时替换（值相同 → 视觉零变化）；不等的值保持不动。
 *   - 不处理 404.html（独立实底主题，不加载统一层）。
 *   - 不处理压缩 bundle（assets/*.css 构建产物，禁止手改）与 JS。
 *   - 幂等：已是 var() 的值不会再次替换；重复运行不产生新变化。
 *   - 先 --dry-run 看统计；--apply 才写盘。回滚：git checkout -- '*.html'。
 *
 * 用法：
 *   node scripts/design-system/migrate.mjs --dry-run --report audit/design-migration/migrate-dryrun.md --json ...
 *   node scripts/design-system/migrate.mjs --apply --report ...
 *   node scripts/design-system/migrate.mjs --inject --apply
 *   node scripts/design-system/migrate.mjs --tokenize --dry-run
 *   默认（不带 --inject/--tokenize）= 两步都执行。
 *
 * 退出码：0 = 成功；1 = 有文件被跳过或校验失败；2 = 环境/用法错误。
 */

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const TOKEN_FILE = 'assets/css/design-tokens.css';
const EXCLUDE_PAGE = '404.html';
const VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// 颜色归一化（与 run-token-audit.mjs 口径一致）
// ---------------------------------------------------------------------------

const NAMED = { white: [255, 255, 255, 1], black: [0, 0, 0, 1], transparent: [0, 0, 0, 0] };
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b(?:white|black|transparent)\b/g;

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function parseColor(raw) {
  const s = String(raw).trim().toLowerCase();
  if (!s) return null;
  if (NAMED[s]) {
    const [r, g, b, a] = NAMED[s];
    return { key: `${r},${g},${b},${round3(a)}`, raw };
  }
  if (s.startsWith('#')) {
    let hex = s.slice(1);
    if (![3, 4, 6, 8].includes(hex.length) || /[^0-9a-f]/.test(hex)) return null;
    if (hex.length <= 4) hex = hex.split('').map((c) => c + c).join('');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return { key: `${r},${g},${b},${round3(a)}`, raw };
  }
  const fn = s.match(/^(rgba?|hsla?)\(([^)]*)\)$/);
  if (!fn) return null;
  const parts = fn[2].replace(/\//g, ' ').replace(/,/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 3 || parts.length > 4) return null;
  const nums = parts.map((p) => (p.endsWith('%') ? { n: parseFloat(p), pct: true } : { n: parseFloat(p), pct: false }));
  if (nums.some((x) => Number.isNaN(x.n))) return null;
  let r, g, b;
  if (fn[1].startsWith('rgb')) {
    r = nums[0].pct ? (nums[0].n * 255) / 100 : nums[0].n;
    g = nums[1].pct ? (nums[1].n * 255) / 100 : nums[1].n;
    b = nums[2].pct ? (nums[2].n * 255) / 100 : nums[2].n;
  } else {
    [r, g, b] = hslToRgb(nums[0].n, nums[1].n / 100, nums[2].n / 100);
  }
  let a = 1;
  if (nums.length === 4) a = nums[3].pct ? nums[3].n / 100 : nums[3].n;
  r = Math.round(r);
  g = Math.round(g);
  b = Math.round(b);
  a = Math.max(0, Math.min(1, a));
  return { key: `${r},${g},${b},${round3(a)}`, raw };
}

// ---------------------------------------------------------------------------
// 读取 token 并建立「值 → token」映射
// ---------------------------------------------------------------------------

function readTokens() {
  const raw = readFileSync(resolve(ROOT, TOKEN_FILE), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const defs = new Map();
  const order = [];
  for (const m of raw.matchAll(/(--mc-[a-zA-Z0-9-]+)\s*:\s*([^;{}]+);/g)) {
    if (!defs.has(m[1])) {
      defs.set(m[1], m[2].trim().replace(/\s+/g, ' '));
      order.push(m[1]);
    }
  }
  const resolved = new Map();
  const resolveToken = (name, seen = new Set()) => {
    if (resolved.has(name)) return resolved.get(name);
    if (seen.has(name)) return null;
    seen.add(name);
    let v = defs.get(name);
    if (v == null) return null;
    v = v.replace(/var\(\s*(--mc-[a-zA-Z0-9-]+)\s*(?:,[^)]*)?\)/g, (_, ref) => resolveToken(ref, seen) ?? `var(${ref})`);
    resolved.set(name, v);
    return v;
  };
  const sorted = [...order].sort((a, b) => preferenceScore(a) - preferenceScore(b));
  for (const n of order) resolveToken(n);

  // 颜色映射：语义 token 优先于原始色板；渐变/阴影 token 不参与颜色映射
  const colorMap = new Map();
  const shadowTokens = new Map();
  const gradientTokens = new Map();
  for (const name of sorted) {
    const value = resolved.get(name) ?? defs.get(name) ?? '';
    if (/shadow/.test(name)) {
      shadowTokens.set(normalizeValueForCompare(value), name);
      continue;
    }
    if (/gradient/.test(name)) continue; // 渐变整体替换风险高，不做
    for (const m of value.matchAll(COLOR_RE)) {
      const parsed = parseColor(m[0]);
      if (!parsed) continue;
      if (parsed.key === '0,0,0,0') continue; // transparent：不 token 化，保持可读
      const key = parsed.key;
      const existing = colorMap.get(key);
      // preferenceScore 排序后先到先得；同一 key 若已有语义 token 则不覆盖
      if (!existing) colorMap.set(key, name);
      else if (preferenceScore(name) < preferenceScore(existing)) colorMap.set(key, name);
    }
  }

  // 字号：rem/px 精确映射
  const fontSizeMap = new Map();
  for (const name of order.filter((n) => n.startsWith('--mc-font-size-'))) {
    const px = toPx(resolved.get(name) ?? '');
    if (px != null && !fontSizeMap.has(px)) fontSizeMap.set(px, name);
  }

  // 圆角：px / 50% / 999px
  const radiusMap = new Map();
  for (const name of order.filter((n) => n.startsWith('--mc-radius-'))) {
    const v = (resolved.get(name) ?? '').trim();
    if (v.endsWith('%')) {
      const pct = parseFloat(v);
      if (!Number.isNaN(pct) && !radiusMap.has(`${pct}%`)) radiusMap.set(`${pct}%`, name);
    } else {
      const px = toPx(v);
      if (px != null && !radiusMap.has(px)) radiusMap.set(px, name);
    }
  }

  // 模糊：blur(Xpx)
  const blurMap = new Map();
  for (const name of order.filter((n) => n.startsWith('--mc-blur-'))) {
    const px = toPx(resolved.get(name) ?? '');
    if (px != null && !blurMap.has(px)) blurMap.set(px, name);
  }

  return { defs, resolved, colorMap, shadowTokens, fontSizeMap, radiusMap, blurMap, tokenCount: defs.size };
}

/** 颜色映射优先级：语义色 > 文字/表面/边框 > 组件 > 原始色板 */
function preferenceScore(name) {
  const rules = [
    [/^--mc-color-(brand|success|action|danger)/, 10],
    [/^--mc-text-/, 20],
    [/^--mc-surface-/, 30],
    [/^--mc-border/, 40],
    [/^--mc-overlay-/, 50],
    [/^--mc-(green|blue|purple|orange|yellow|pink|white|slate|ink|black|solid)/, 90],
  ];
  for (const [re, score] of rules) if (re.test(name)) return score;
  return 60;
}

function toPx(value) {
  const v = String(value).trim().toLowerCase();
  let m = v.match(/^(-?\d*\.?\d+)rem$/);
  if (m) return round3(parseFloat(m[1]) * 16);
  m = v.match(/^(-?\d*\.?\d+)px$/);
  if (m) return round3(parseFloat(m[1]));
  return null;
}

/** 用于整段值比较：小写、颜色归一、空白折叠、逗号后不留空格 */
function normalizeValueForCompare(value) {
  const colors = [];
  const noColor = String(value).replace(COLOR_RE, (m) => {
    const p = parseColor(m);
    if (!p) return m;
    colors.push(p.key);
    return `@@${colors.length - 1}@@`;
  });
  return noColor
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .trim()
    .replace(/@@(\d+)@@/g, (_, i) => `c:${colors[Number(i)]}`);
}

// ---------------------------------------------------------------------------
// 值替换
// ---------------------------------------------------------------------------

function replaceColors(value, tokens, stats, ctx) {
  // 保护 url(...) 与 var(...) 段
  const guards = [];
  let protectedValue = String(value).replace(/url\([^)]*\)|var\([^)]*\)/gi, (m) => {
    guards.push(m);
    return `\u0000${guards.length - 1}\u0000`;
  });
  let changed = false;
  protectedValue = protectedValue.replace(COLOR_RE, (m) => {
    const parsed = parseColor(m);
    if (!parsed) return m;
    const token = tokens.colorMap.get(parsed.key);
    if (!token) {
      stats.unmapped[m] = stats.unmapped[m] || { count: 0, type: 'color' };
      stats.unmapped[m].count++;
      return m;
    }
    changed = true;
    stats.colors++;
    stats.byToken[token] = (stats.byToken[token] ?? 0) + 1;
    if (stats.samples.colors.length < 5) stats.samples.colors.push({ ...ctx, value: m, token });
    return `var(${token})`;
  });
  if (!changed) return value;
  return protectedValue.replace(/\u0000(\d+)\u0000/g, (_, i) => guards[Number(i)]);
}

function replaceValue(prop, value, tokens, stats, ctx) {
  const p = prop.toLowerCase();
  const important = /\s*!important\s*$/i.test(value);
  const core = value.replace(/\s*!important\s*$/i, '').trim();
  const tail = important ? ' !important' : '';

  // font-size
  if (p === 'font-size') {
    const px = toPx(core);
    if (px != null) {
      const token = tokens.fontSizeMap.get(px);
      if (!token) {
        stats.unmapped[core] = stats.unmapped[core] || { count: 0, type: 'font-size' };
        stats.unmapped[core].count++;
      }
      if (token) {
        stats.fontSizes++;
        stats.byToken[token] = (stats.byToken[token] ?? 0) + 1;
        if (stats.samples.fontSizes.length < 5) stats.samples.fontSizes.push({ ...ctx, value: core, token });
        return `var(${token})${tail}`;
      }
    }
    return value;
  }

  // border-radius
  if (p === 'border-radius') {
    const parts = core.split(/(\s+|\/)/);
    let changed = false;
    const next = parts
      .map((part) => {
        if (!part || /^\s+$|^\/$/.test(part)) return part;
        const pct = part.match(/^(\d*\.?\d+)%$/);
        if (pct) {
          const token = tokens.radiusMap.get(`${parseFloat(pct[1])}%`);
          if (token) {
            changed = true;
            stats.radii++;
            stats.byToken[token] = (stats.byToken[token] ?? 0) + 1;
            if (stats.samples.radii.length < 5) stats.samples.radii.push({ ...ctx, value: part, token });
            return `var(${token})`;
          }
          return part;
        }
        const px = toPx(part);
        if (px == null) return part;
        const token = tokens.radiusMap.get(px);
        if (!token) {
          stats.unmapped[part] = stats.unmapped[part] || { count: 0, type: 'radius' };
          stats.unmapped[part].count++;
          return part;
        }
        changed = true;
        stats.radii++;
        stats.byToken[token] = (stats.byToken[token] ?? 0) + 1;
        if (stats.samples.radii.length < 5) stats.samples.radii.push({ ...ctx, value: part, token });
        return `var(${token})`;
      })
      .join('');
    return changed ? `${next}${tail}` : value;
  }

  // backdrop-filter: blur(Xpx) → var(--mc-blur-*)
  if (p === 'backdrop-filter') {
    let changed = false;
    const next = core.replace(/blur\(\s*(\d*\.?\d+)px\s*\)/gi, (m, pxStr) => {
      const token = tokens.blurMap.get(round3(parseFloat(pxStr)));
      if (!token) return m;
      changed = true;
      stats.blurs++;
      stats.byToken[token] = (stats.byToken[token] ?? 0) + 1;
      if (stats.samples.blurs.length < 5) stats.samples.blurs.push({ ...ctx, value: m, token });
      return `blur(var(${token}))`;
    });
    return changed ? `${next}${tail}` : value;
  }

  // box-shadow / text-shadow：整段精确匹配 → 整套 token
  if (p === 'box-shadow' || p === 'text-shadow' || p === '-webkit-box-shadow') {
    const key = normalizeValueForCompare(core);
    const token = tokens.shadowTokens.get(key);
    if (token) {
      stats.shadows++;
      stats.byToken[token] = (stats.byToken[token] ?? 0) + 1;
      if (stats.samples.shadows.length < 5) stats.samples.shadows.push({ ...ctx, value: core, token });
      return `var(${token})${tail}`;
    }
    const replaced = replaceColors(core, tokens, stats, ctx);
    return replaced === core ? value : `${replaced}${tail}`;
  }

  // 其他可能含颜色的属性
  if (/color|background|border|outline|fill|stroke|filter|caret|accent|text-decoration|column-rule|text-emphasis/i.test(p)) {
    const next = replaceColors(core, tokens, stats, ctx);
    return next === core ? value : `${next}${tail}`;
  }

  return value;
}

// ---------------------------------------------------------------------------
// HTML 处理
// ---------------------------------------------------------------------------

function lineOf(text, offset) {
  return text.slice(0, offset).split('\n').length;
}

function processDeclarations(cssText, file, tokens, stats) {
  const ctx = { file, line: 0 };
  const comments = [];
  const guarded = cssText.replace(/\/\*[\s\S]*?\*\//g, (m) => {
    comments.push(m);
    return `\u0001C${comments.length - 1}C\u0001`;
  });
  const processed = guarded.replace(/([a-zA-Z-]+)\s*:\s*([^;{}]+)(;?)/g, (full, prop, value, semi) => {
    if (prop.startsWith('--')) return full;
    const next = replaceValue(prop, value, tokens, stats, ctx);
    if (next === value) return full;
    return `${prop}: ${next}${semi || ';'}`;
  });
  return processed.replace(/\u0001C(\d+)C\u0001/g, (_, i) => comments[Number(i)]);
}

function processStyleAttribute(attrValue, file, tokens, stats) {
  return attrValue
    .split(';')
    .map((part) => {
      const idx = part.indexOf(':');
      if (idx < 0) return part;
      const prop = part.slice(0, idx).trim();
      const value = part.slice(idx + 1);
      if (!prop || !value.trim()) return part;
      const next = replaceValue(prop, value.trim(), tokens, stats, { file, line: 0 });
      return next === value.trim() ? part : `${part.slice(0, idx + 1)} ${next}`;
    })
    .join(';');
}

function processHtml(html, file, tokens, stats) {
  let out = html;
  // 1) <style> 块
  out = out.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (full, open, inner, close) => {
    const nextInner = processDeclarations(inner, file, tokens, stats);
    if (nextInner !== inner) stats.filesTouched.add(file);
    return open + nextInner + close;
  });
  // 2) style="" 属性
  out = out.replace(/\bstyle="([^"]*)"/gi, (full, attr) => {
    const next = processStyleAttribute(attr, file, tokens, stats);
    if (next !== attr) stats.filesTouched.add(file);
    return `style="${next}"`;
  });
  return out;
}

/** 修复历史遗留的「head 内游离 CSS 文本」：</style> 之后直接跟一段裸 .ghibli-background 规则。
 *  这些文本在旧白底上不可见（白字白底），统一层启用深色壁纸后会暴露成页面顶部的样式文本。
 *  统一层 components.css 已定义同等背景规则，因此直接删除该游离 CSS 文本即可。 */
function repairStrayCss(html, file, stats) {
  const lastStyle = html.lastIndexOf('</style>');
  const headEnd = html.indexOf('</head>');
  if (lastStyle < 0 || headEnd < 0 || lastStyle > headEnd) return html;
  const head = html.slice(0, headEnd);
  const pattern = /\n[ \t]*\.ghibli-background\s*\{[\s\S]*?\n[ \t]*\}/;
  const idx = head.indexOf('</style>');
  const tail = head.slice(idx + '</style>'.length);
  if (!pattern.test(tail)) return html;
  stats.strayCssRepaired++;
  return html.slice(0, idx + '</style>'.length) + tail.replace(pattern, '') + html.slice(headEnd);
}

function injectLinks(html, file) {
  if (html.includes('/assets/css/components.css') || html.includes('/assets/css/design-tokens.css')) {
    return { html, injected: false };
  }
  const links = [
    '<link rel="stylesheet" href="/assets/css/design-tokens.css">',
    '<link rel="stylesheet" href="/assets/css/components.css">',
  ];
  const headEnd = html.indexOf('</head>');
  if (headEnd < 0) return { html, injected: false, skipped: 'no </head>' };
  const lastStyleEnd = html.lastIndexOf('</style>', headEnd);
  const indentMatch = html.slice(0, headEnd).match(/\n([ \t]+)<\/head>\s*$/);
  const indent = indentMatch ? indentMatch[1] : '    ';
  if (lastStyleEnd >= 0) {
    const insertAt = lastStyleEnd + '</style>'.length;
    const block = '\n' + links.map((l) => indent + l).join('\n');
    return { html: html.slice(0, insertAt) + block + html.slice(insertAt), injected: true };
  }
  const block = links.map((l) => indent + l).join('\n') + '\n';
  return { html: html.slice(0, headEnd) + block + html.slice(headEnd), injected: true, fallback: 'no <style>' };
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

function parseCli() {
  const { values } = parseArgs({
    options: {
      inject: { type: 'boolean', default: false },
      tokenize: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      apply: { type: 'boolean', default: false },
      report: { type: 'string' },
      json: { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  if (values.help) {
    console.log(`MeCollage 设计统一迁移脚本 v${VERSION}

用法：
  node scripts/design-system/migrate.mjs [--inject] [--tokenize] [--dry-run|--apply] [--report path] [--json path]

  --inject    注入 tokens/components 两个 <link>（94 页，404.html 除外）
  --tokenize  精确等价 token 化（视觉零变化）
  不带 --inject/--tokenize 时两步都执行
  默认 --dry-run（只统计不写盘）；--apply 才写盘
  --report <path>  写 Markdown 报告
  --json <path>    写 JSON 统计
  -h, --help       帮助

回滚：git checkout -- '*.html'
`);
    process.exit(0);
  }
  const dryRun = values.apply ? false : true;
  return {
    doInject: values.inject || !values.tokenize,
    doTokenize: values.tokenize || !values.inject,
    dryRun,
    report: values.report ? resolve(ROOT, values.report) : null,
    json: values.json ? resolve(ROOT, values.json) : null,
  };
}

function listPages() {
  try {
    return execFileSync('git', ['ls-files', '-z', '*.html'], { cwd: ROOT, encoding: 'utf8' })
      .split('\0')
      .filter(Boolean)
      .filter((f) => !f.startsWith('audit/') && !f.startsWith('docs/') && !f.startsWith('scripts/'))
      .filter((f) => f !== EXCLUDE_PAGE)
      .sort();
  } catch {
    exitWith(`无法执行 git ls-files（cwd=${ROOT}）`, 2);
  }
}

function exitWith(msg, code) {
  console.error(`[migrate] ${msg}`);
  process.exit(code);
}

function main() {
  const opts = parseCli();
  const tokens = readTokens();
  const files = listPages();
  const stats = {
    files: files.length,
    injected: 0,
    strayCssRepaired: 0,
    skipped: [],
    filesTouched: new Set(),
    colors: 0,
    fontSizes: 0,
    radii: 0,
    blurs: 0,
    shadows: 0,
    byToken: {},
    unmapped: {},
    samples: { colors: [], fontSizes: [], radii: [], blurs: [], shadows: [] },
  };
  const planned = [];
  const skipList = [];

  for (const rel of files) {
    const abs = resolve(ROOT, rel);
    let html;
    try {
      html = readFileSync(abs, 'utf8');
    } catch (err) {
      skipList.push({ file: rel, reason: 'read failed' });
      continue;
    }
    html = repairStrayCss(html, rel, stats);
    if (opts.doInject) {
      const res = injectLinks(html, rel);
      if (res.injected) stats.injected++;
      if (res.skipped) skipList.push({ file: rel, reason: res.skipped });
      html = res.html;
    }
    if (opts.doTokenize) {
      html = processHtml(html, rel, tokens, stats);
    }
    if (html !== readFileSync(abs, 'utf8')) planned.push({ rel, abs, html });
  }

  const totalReplacements = stats.colors + stats.fontSizes + stats.radii + stats.blurs + stats.shadows;

  // 报告
  const lines = [];
  const add = (s = '') => lines.push(s);
  add('# MeCollage 设计统一迁移报告（--' + (opts.dryRun ? 'dry-run' : 'apply') + '）');
  add();
  add(`- 工具：scripts/design-system/migrate.mjs v${VERSION}`);
  add(`- 时间：${new Date().toISOString()}`);
  add(`- token：${tokens.tokenCount} 个（${TOKEN_FILE}）`);
  add(`- 处理页面：${stats.files} 个（排除 404.html、audit/docs/scripts）`);
  add(`- 注入 link：${stats.injected} 页`);
  add(`- 修复 head 内游离 CSS 文本：${stats.strayCssRepaired} 页`);
  add(`- 将修改文件：${planned.length} 页`);
  add(`- 精确等价替换：${totalReplacements} 处（颜色 ${stats.colors} / font-size ${stats.fontSizes} / 圆角 ${stats.radii} / 模糊 ${stats.blurs} / 整段阴影 ${stats.shadows}）`);
  add();
  add('## 按 token 统计（Top 30）');
  add();
  add('| token | 替换数 |');
  add('|---|---:|');
  Object.entries(stats.byToken)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .forEach(([k, v]) => add(`| \`${k}\` | ${v} |`));
  add();
  if (skipList.length) {
    add('## 跳过文件');
    add();
    for (const s of skipList) add(`- \`${s.file}\`：${s.reason}`);
    add();
  }
  add('## 无法映射的高频字面值（Top 20，供后续 token 提案参考）');
  add();
  add('| 值 | 出现次数 | 类型 |');
  add('|---|---:|---|');
  // 统计未映射值：重新扫描非常简单——这里用 samples 不足，改为在 tokenize 时统计
  if (stats.unmapped) {
    Object.entries(stats.unmapped)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20)
      .forEach(([k, v]) => add(`| \`${k}\` | ${v.count} | ${v.type} |`));
  } else {
    add('| - | - | - |');
  }
  add();
  add('## 示例替换');
  add();
  for (const [kind, arr] of Object.entries(stats.samples)) {
    if (!arr.length) continue;
    add(`### ${kind}`);
    add();
    add('| 文件 | 原值 | token |');
    add('|---|---|---|');
    for (const s of arr) add(`| \`${s.file}${s.line ? ':' + s.line : ''}\` | \`${s.value}\` | \`${s.token}\` |`);
    add();
  }
  const report = lines.join('\n') + '\n';

  if (opts.report) {
    mkdirSync(dirname(opts.report), { recursive: true });
    writeFileSync(opts.report, report);
  }
  if (opts.json) {
    mkdirSync(dirname(opts.json), { recursive: true });
    writeFileSync(
      opts.json,
      JSON.stringify(
        {
          tool: 'design-system-migrate',
          version: VERSION,
          mode: opts.dryRun ? 'dry-run' : 'apply',
          generatedAt: new Date().toISOString(),
          tokenCount: tokens.tokenCount,
          pages: stats.files,
          injected: stats.injected,
          strayCssRepaired: stats.strayCssRepaired,
          plannedFiles: planned.length,
          replacements: {
            colors: stats.colors,
            fontSizes: stats.fontSizes,
            radii: stats.radii,
            blurs: stats.blurs,
            shadows: stats.shadows,
            total: totalReplacements,
          },
          byToken: stats.byToken,
          skipped: skipList,
        },
        null,
        2,
      ) + '\n',
    );
  }

  console.log(
    `[migrate] ${opts.dryRun ? 'DRY-RUN' : 'APPLY'}: pages=${stats.files} injected=${stats.injected} toModify=${planned.length} replacements=${totalReplacements}` +
      ` (colors=${stats.colors} fontSizes=${stats.fontSizes} radii=${stats.radii} blurs=${stats.blurs} shadows=${stats.shadows})`,
  );

  if (opts.dryRun) {
    if (opts.report) console.log(`[migrate] 报告：${relative(ROOT, opts.report)}`);
    process.exit(0);
  }

  // 写盘：先全部读入内存，再逐个写（失败即停）
  try {
    for (const p of planned) writeFileSync(p.abs, p.html);
  } catch (err) {
    exitWith(`写盘失败：${err.message}；请 git checkout -- '*.html' 回滚后重试`, 1);
  }
  console.log(`[migrate] 已写入 ${planned.length} 个 HTML（回滚：git checkout -- '*.html'）`);
  process.exit(0);
}

main();
