#!/usr/bin/env node
/**
 * MeCollage Design Token 审计 / 防漂移门禁 v1.0.0
 * ============================================================================
 * 目标：在「无构建、95 个手写页面、5 套语言副本」的现状下，用零依赖脚本
 *       守住一件事——**新的 UI 代码不得再引入设计 token 之外的裸值**。
 *
 * 事实来源（单一事实源）：assets/css/design-tokens.css 的 --mc-* 定义。
 * 扫描范围：git 跟踪 + 未跟踪（--exclude-standard）的站点源文件：
 *   *.html / *.css / *.js（排除 audit/ docs/ scripts/ node_modules/ 等）。
 *   HTML 只扫描 <style> 块与 style="" 属性；CSS 只扫描声明值；JS 只扫描
 *   赋值/对象字面量中的样式颜色（v1 限制，见 README）。
 *
 * 判定：
 *   - 颜色 / font-size / border-radius 的值若不在 token 集合内 → 记一条违规；
 *   - 违规按文件计数，与 scripts/design-audit/baseline-design-tokens.json 比对：
 *       新增文件有违规、或既有文件违规数上涨 → FAIL（漂移）；
 *       违规数下降 → INFO，提示跑 --update-baseline 固化（需人工复核）；
 *   - inline style 属性数量同样按基线比对（新代码不得新增内联样式）；
 *   - --check-docs：DESIGN-TOKENS.md 必须覆盖全部 token，且不出现不存在的 token。
 *
 * 用法：
 *   node scripts/design-audit/run-token-audit.mjs
 *   node scripts/design-audit/run-token-audit.mjs --report-all --json out.json --md out.md
 *   node scripts/design-audit/run-token-audit.mjs --update-baseline   # 人工复核后固化
 *   node scripts/design-audit/run-token-audit.mjs --list-tokens       # 输出 token 清单（md 行）
 *
 * 退出码：0 = 无漂移 / 文档一致；1 = 有漂移或文档不一致；2 = 环境/用法错误。
 */

import { parseArgs } from 'node:util';
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

const TOOL = 'design-token-audit';
const VERSION = '1.1.0';
const ROOT = process.cwd();

const TOKEN_FILE = 'assets/css/design-tokens.css';
const DOC_FILE = 'docs/design/DESIGN-TOKENS.md';
const BASELINE_FILE = 'scripts/design-audit/baseline-design-tokens.json';

const EXCLUDE_PREFIXES = [
  'audit/',
  'docs/',
  'scripts/',
  'node_modules/',
  '.git/',
  '.vercel/',
  '.trae/',
];
const EXCLUDE_FILES = new Set([
  TOKEN_FILE,
  'check_keys.js',
  'sync_keys.js',
]);

const SITE_EXT = /\.(html|css|js)$/;

/** 会承载颜色值的 CSS 属性（减少误报；不在此列表的值不参与颜色扫描） */
const COLOR_PROP_RE =
  /^(?:color|background|background-color|background-image|border|border-(?:top|right|bottom|left|color|image)|border-color|box-shadow|text-shadow|outline|outline-color|fill|stroke|filter|backdrop-filter|caret-color|accent-color|text-decoration-color|column-rule|column-rule-color)$/i;

const COLOR_RE =
  /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b(?:white|black|transparent)\b/g;

const NAMED_COLORS = {
  white: [255, 255, 255, 1],
  black: [0, 0, 0, 1],
  transparent: [0, 0, 0, 0],
};

// ---------------------------------------------------------------------------
// 小工具
// ---------------------------------------------------------------------------

/** 把文件切成保留行号的行数组工具 */
function makeLocator(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  return (offset) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

/** 注释替换为等长空白，保留偏移量/行号 */
function blankCssComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

function alphaKey(a) {
  return String(round3(a));
}

/** 解析颜色 → { key, rgb:[r,g,b], a } ；不支持则返回 null */
function parseColor(raw) {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s || s === 'currentcolor' || s === 'inherit' || s === 'initial' || s === 'unset') {
    return null;
  }
  if (NAMED_COLORS[s]) {
    const [r, g, b, a] = NAMED_COLORS[s];
    return { key: `${r},${g},${b},${alphaKey(a)}`, rgb: [r, g, b], a };
  }
  if (s[0] === '#') {
    let hex = s.slice(1);
    if (![3, 4, 6, 8].includes(hex.length) || /[^0-9a-f]/.test(hex)) return null;
    if (hex.length === 3 || hex.length === 4) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return { key: `${r},${g},${b},${alphaKey(a)}`, rgb: [r, g, b], a };
  }
  const fn = s.match(/^(rgba?|hsla?)\(([^)]*)\)$/);
  if (!fn) return null;
  const body = fn[2].replace(/\//g, ' ').replace(/,/g, ' ');
  const parts = body.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 3 || parts.length > 4) return null;
  const nums = [];
  for (const p of parts) {
    if (p.endsWith('%')) nums.push({ n: parseFloat(p), pct: true });
    else nums.push({ n: parseFloat(p), pct: false });
  }
  if (nums.some((x) => Number.isNaN(x.n))) return null;
  let r;
  let g;
  let b;
  let alpha = 1;
  if (fn[1].startsWith('rgb')) {
    r = nums[0].pct ? (nums[0].n * 255) / 100 : nums[0].n;
    g = nums[1].pct ? (nums[1].n * 255) / 100 : nums[1].n;
    b = nums[2].pct ? (nums[2].n * 255) / 100 : nums[2].n;
    if (parts.length === 4) {
      alpha = nums[3].pct ? nums[3].n / 100 : nums[3].n;
    }
  } else {
    const [h, sPct, lPct] = [nums[0].n, nums[1].n / 100, nums[2].n / 100];
    const [rr, gg, bb] = hslToRgb(h, sPct, lPct);
    r = rr;
    g = gg;
    b = bb;
    if (parts.length === 4) {
      alpha = nums[3].pct ? nums[3].n / 100 : nums[3].n;
    }
  }
  r = Math.max(0, Math.min(255, Math.round(r)));
  g = Math.max(0, Math.min(255, Math.round(g)));
  b = Math.max(0, Math.min(255, Math.round(b)));
  alpha = Math.max(0, Math.min(1, alpha));
  return { key: `${r},${g},${b},${alphaKey(alpha)}`, rgb: [r, g, b], a: alpha };
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

/** 颜色视为等价：RGB 完全一致，alpha 误差 ≤ 0.01（覆盖 #xx 与 rgba 的取整误差） */
function colorEquivalent(a, b) {
  return a && b && a.rgb[0] === b.rgb[0] && a.rgb[1] === b.rgb[1] && a.rgb[2] === b.rgb[2] && Math.abs(a.a - b.a) <= 0.011;
}

function colorDistance(a, b) {
  // RGB 加权 + alpha 惩罚，仅用于"最接近的 token"建议
  const dr = a.rgb[0] - b.rgb[0];
  const dg = a.rgb[1] - b.rgb[1];
  const db = a.rgb[2] - b.rgb[2];
  const da = (a.a - b.a) * 255;
  return Math.sqrt(0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db + 0.25 * da * da);
}

// ---------------------------------------------------------------------------
// Token 解析
// ---------------------------------------------------------------------------

function readTokenFile() {
  const abs = resolve(ROOT, TOKEN_FILE);
  if (!existsSync(abs)) {
    fail(`找不到 token 文件：${TOKEN_FILE}`);
  }
  const raw = readFileSync(abs, 'utf8');
  const text = blankCssComments(raw);
  const defs = new Map();
  const order = [];
  const duplicateDefs = [];
  const re = /(--mc-[a-zA-Z0-9-]+)\s*:\s*([^;{}]+);/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const name = m[1];
    const value = m[2].trim().replace(/\s+/g, ' ');
    if (defs.has(name)) {
      // 允许「主值 + 媒体查询内覆盖」（如 prefers-reduced-motion），主值保留首个
      duplicateDefs.push({ name, value, first: defs.get(name) });
    } else {
      defs.set(name, value);
      order.push(name);
    }
  }
  if (defs.size === 0) fail(`${TOKEN_FILE} 中没有解析到任何 --mc-* token`);

  const resolved = new Map();
  const resolveToken = (name, seen = new Set()) => {
    if (resolved.has(name)) return resolved.get(name);
    if (seen.has(name)) return null;
    seen.add(name);
    let value = defs.get(name);
    if (value == null) return null;
    value = value.replace(/var\(\s*(--mc-[a-zA-Z0-9-]+)\s*(?:,[^)]*)?\)/g, (_, ref) => {
      const v = resolveToken(ref, seen);
      return v == null ? `var(${ref})` : v;
    });
    resolved.set(name, value);
    return value;
  };
  for (const name of order) resolveToken(name);

  const undefinedRefs = [];
  for (const [name, value] of defs) {
    for (const ref of value.matchAll(/var\(\s*(--mc-[a-zA-Z0-9-]+)/g)) {
      if (!defs.has(ref[1])) undefinedRefs.push({ token: name, ref: ref[1] });
    }
  }

  // 颜色集合：tokens 文件里出现过的全部颜色（含渐变 / 阴影里的颜色）都算合法
  const colorPairs = [];
  const colorKeys = new Set();
  for (const name of order) {
    for (const { raw, key } of colorsInValue(`${defs.get(name)} ${resolved.get(name) ?? ''}`)) {
      if (!colorKeys.has(key)) {
        colorKeys.add(key);
        colorPairs.push({ name, raw, key, parsed: parseColor(raw) });
      }
    }
  }
  // 去重：同一 key 只保留第一个 token 名
  const seenKeys = new Set();
  const uniqueColorPairs = [];
  for (const p of colorPairs) {
    if (seenKeys.has(p.key)) continue;
    seenKeys.add(p.key);
    uniqueColorPairs.push(p);
  }

  const fontSizesPx = [];
  const radiiPx = [];
  const radiusPercent = [];
  for (const name of order) {
    const value = resolved.get(name) ?? defs.get(name) ?? '';
    if (name.startsWith('--mc-font-size-')) {
      const px = toPx(value);
      if (px != null && !fontSizesPx.includes(px)) fontSizesPx.push(px);
    }
    if (name.startsWith('--mc-radius-')) {
      const v = value.trim();
      if (v.endsWith('%')) {
        const n = parseFloat(v);
        if (!Number.isNaN(n) && !radiusPercent.includes(n)) radiusPercent.push(n);
      } else {
        const px = toPx(v);
        if (px != null && !radiiPx.includes(px)) radiiPx.push(px);
      }
    }
  }
  fontSizesPx.sort((a, b) => a - b);
  radiiPx.sort((a, b) => a - b);

  const tokenHash = createHash('sha256')
    .update([...defs.entries()].map(([k, v]) => `${k}:${v}`).join('\n'))
    .digest('hex')
    .slice(0, 12);

  return {
    defs,
    resolved,
    order,
    colorPairs: uniqueColorPairs,
    colorKeys,
    fontSizesPx,
    radiiPx,
    radiusPercent,
    undefinedRefs,
    duplicateDefs,
    tokenHash,
  };
}

function toPx(value) {
  const v = String(value).trim().toLowerCase();
  let m = v.match(/^(-?\d*\.?\d+)rem$/);
  if (m) return round3(parseFloat(m[1]) * 16);
  m = v.match(/^(-?\d*\.?\d+)px$/);
  if (m) return round3(parseFloat(m[1]));
  m = v.match(/^(\d*\.?\d+)%$/);
  if (m) return null; // 百分比字号属相对值，不计入 px 集合
  return null;
}

/** 从任意 CSS 值里挑出颜色字面量（跳过 url() 与 var()） */
function colorsInValue(value) {
  if (!value) return [];
  const cleaned = String(value)
    .replace(/url\([^)]*\)/gi, ' ')
    .replace(/data:[^'")\s]*/gi, ' ');
  const out = [];
  for (const m of cleaned.matchAll(COLOR_RE)) {
    const parsed = parseColor(m[0]);
    if (parsed) out.push({ raw: m[0], key: parsed.key, parsed });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 文件扫描
// ---------------------------------------------------------------------------

function isSiteFile(rel) {
  if (!SITE_EXT.test(rel)) return false;
  if (EXCLUDE_FILES.has(rel)) return false;
  if (rel.split('/').some((seg) => seg === 'node_modules')) return false;
  return !EXCLUDE_PREFIXES.some((p) => rel.startsWith(p));
}

function listSiteFiles() {
  try {
    const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' })
      .split('\0')
      .filter(Boolean);
    let untracked = [];
    try {
      untracked = execFileSync('git', ['ls-files', '-z', '--others', '--exclude-standard'], {
        cwd: ROOT,
        encoding: 'utf8',
      })
        .split('\0')
        .filter(Boolean);
    } catch {
      /* 非 git 环境忽略 */
    }
    return [...new Set([...tracked, ...untracked])].filter(isSiteFile).sort();
  } catch {
    return walk(ROOT)
      .map((abs) => relative(ROOT, abs))
      .filter(isSiteFile)
      .sort();
  }
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === '.git' || entry === 'node_modules' || entry === 'audit' || entry === 'scripts' || entry === 'docs') {
      continue;
    }
    const abs = join(dir, entry);
    let st;
    try {
      st = statSync(abs);
    } catch {
      continue;
    }
    if (st.isDirectory()) out.push(...walk(abs));
    else out.push(abs);
  }
  return out;
}

function emptyCounts() {
  return {
    colors: 0,
    fontSizes: 0,
    radii: 0,
    relativeFontSizes: 0,
    inlineStyleAttrs: 0,
    styleBlocks: 0,
    jsColors: 0,
  };
}

/**
 * 扫描一段 CSS 声明文本（属性:值），记录违规。
 * @param {string} text    要扫描的 CSS 子串
 * @param {number} baseLine 子串第一行在整份文件中的行号 - 1（用于还原 file:line）
 */
function scanDeclarations(text, baseLine, file, push) {
  const loc = makeLocator(text);
  const code = blankCssComments(text);
  const re = /([a-zA-Z-]+)\s*:\s*([^;{}]+);?/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    const prop = m[1].toLowerCase();
    const value = m[2].trim();
    const line = baseLine + loc(m.index);
    if (COLOR_PROP_RE.test(prop)) {
      for (const c of colorsInValue(value)) {
        push({ kind: 'colors', file, line, value: c.raw, prop });
      }
    }
    if (prop === 'font-size') {
      const v = value.replace(/\s*!important/i, '').trim();
      // 已 token 化的字号（var(--mc-font-size-*)）视为合规，不重复计数
      if (/^var\(\s*--mc-font-size-/.test(v)) continue;
      const px = toPx(v);
      if (px == null) {
        if (/[\d.]/.test(v)) {
          push({ kind: 'relativeFontSizes', file, line, value: v, prop });
        }
      } else {
        push({ kind: 'fontSizesPx', file, line, value: v, px, prop });
      }
    }
    if (prop === 'border-radius') {
      for (const part of value.split(/[\s/]+/).filter(Boolean)) {
        if (part === '0') continue;
        const px = toPx(part);
        const pct = part.match(/^(\d*\.?\d+)%$/);
        push({
          kind: pct ? 'radiusPercent' : 'radiiPx',
          file,
          line,
          value: part,
          px: px ?? (pct ? parseFloat(pct[1]) : NaN),
          prop,
        });
      }
    }
  }
}

function scanCssFile(text, file, push) {
  scanDeclarations(text, 0, file, push);
}

function scanHtmlFile(text, file, push) {
  const loc = makeLocator(text);
  let styleBlocks = 0;
  for (const m of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    styleBlocks += 1;
    const inner = m[1];
    const innerOffset = m.index + m[0].indexOf(inner);
    // 子串首行在整份 HTML 中的行号（1-based）→ 转为 baseLine（0-based 偏移）
    scanDeclarations(inner, loc(innerOffset) - 1, file, push);
  }
  let inlineStyleAttrs = 0;
  for (const m of text.matchAll(/\bstyle\s*=\s*("([^"]*)"|'([^']*)')/gi)) {
    inlineStyleAttrs += 1;
    const value = (m[2] ?? m[3] ?? '').trim();
    if (!value) continue;
    // 属性值里是一组声明（prop:value; ...），拆开后逐条检查
    let cursor = 0;
    for (const part of value.split(';')) {
      const idx = value.indexOf(part, cursor);
      cursor = idx + part.length;
      const colon = part.indexOf(':');
      if (colon < 0) continue;
      const prop = part.slice(0, colon).trim().toLowerCase();
      const val = part.slice(colon + 1).trim();
      if (!prop || !val) continue;
      if (COLOR_PROP_RE.test(prop)) {
        for (const c of colorsInValue(val)) {
          push({ kind: 'colors', file, line: loc(m.index), value: c.raw, prop: `style:${prop}` });
        }
      }
      if (prop === 'font-size') {
        const px = toPx(val);
        push(
          px == null
            ? { kind: 'relativeFontSizes', file, line: loc(m.index), value: val, prop }
            : { kind: 'fontSizesPx', file, line: loc(m.index), value: val, px, prop },
        );
      }
      if (prop === 'border-radius') {
        for (const p of val.split(/[\s/]+/).filter(Boolean)) {
          if (p === '0') continue;
          const px = toPx(p);
          const pct = p.match(/^(\d*\.?\d+)%$/);
          push({
            kind: pct ? 'radiusPercent' : 'radiiPx',
            file,
            line: loc(m.index),
            value: p,
            px: px ?? (pct ? parseFloat(pct[1]) : NaN),
            prop,
          });
        }
      }
    }
  }
  return { styleBlocks, inlineStyleAttrs };
}

function scanJsFile(text, file, push) {
  // v1.1：扫描两类运行时样式里的颜色（R0 教训 L-20261106-31：JS 直接写内联样式会绕过 token）：
  //   1) 样式相关对象字面量/赋值：fillStyle/backgroundColor/color/gradient: '#...'
  //   2) 内联样式赋值：el.style.background = '#...'、style.cssText = '...'
  // 只统计“设计色值”，不扫描 canvas 产品默认色（如导出白底）之外的普通字符串。
  const loc = makeLocator(text);
  const patterns = [
    /(?:fillStyle|strokeStyle|shadowColor|backgroundColor|background|color|gradient)\s*[:=]\s*(['"`])([^'"`]+)\1/gi,
    /\.style\.[a-zA-Z]+\s*=\s*(['"`])([^'"`]+)\1/gi,
    /\.style\.cssText\s*=\s*(['"`])([^'"`]+)\1/gi,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      // 注释行跳过
      const lineStart = text.lastIndexOf('\n', m.index) + 1;
      const lineText = text.slice(lineStart, m.index);
      if (/^\s*(\/\/|\*|\/\*)/.test(lineText)) continue;
      for (const c of colorsInValue(m[2])) {
        push({ kind: 'colors', file, line: loc(m.index), value: c.raw, prop: 'js-style' });
      }
    }
  }
}

function scanRepo(tokens) {
  const files = listSiteFiles();
  const violations = [];
  const perFile = new Map();
  for (const rel of files) {
    const abs = resolve(ROOT, rel);
    let text;
    try {
      text = readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    const counts = emptyCounts();
    const push = (v) => violations.push(v);
    if (rel.endsWith('.css')) {
      scanCssFile(text, rel, push);
    } else if (rel.endsWith('.html')) {
      const extra = scanHtmlFile(text, rel, push);
      counts.styleBlocks = extra.styleBlocks;
      counts.inlineStyleAttrs = extra.inlineStyleAttrs;
    } else if (rel.endsWith('.js')) {
      scanJsFile(text, rel, push);
    }
    perFile.set(rel, counts);
  }
  // 违规归类（颜色 / 字号 / 圆角）并统计
  const colorViolations = [];
  const fontViolations = [];
  const radiusViolations = [];
  for (const v of violations) {
    if (v.kind === 'colors') {
      const parsed = parseColor(v.value);
      if (!parsed) continue;
      if (tokens.colorKeys.has(parsed.key)) continue;
      if (tokens.colorPairs.some((p) => colorEquivalent(parsed, p.parsed))) continue;
      colorViolations.push({ ...v, parsed });
    } else if (v.kind === 'fontSizesPx') {
      if (tokens.fontSizesPx.some((px) => Math.abs(px - v.px) <= 0.01)) continue;
      fontViolations.push(v);
    } else if (v.kind === 'radiusPercent') {
      // 百分比圆角（50% 圆形、40%/60% 装饰形状）不纳入门禁：不是组件圆角语义
    } else if (v.kind === 'radiiPx') {
      if (Number.isNaN(v.px)) continue;
      if (tokens.radiiPx.some((px) => Math.abs(px - v.px) <= 0.01)) continue;
      radiusViolations.push(v);
    } else if (v.kind === 'relativeFontSizes') {
      perFile.get(v.file).relativeFontSizes += 1;
    }
  }
  for (const v of colorViolations) perFile.get(v.file).colors += 1;
  for (const v of fontViolations) perFile.get(v.file).fontSizes += 1;
  for (const v of radiusViolations) perFile.get(v.file).radii += 1;

  const offTokenValues = { colors: [], fontSizes: [], radii: [] };
  const bump = (map, raw, px) => {
    const key = px == null ? String(raw) : String(px);
    const cur = map.get(key) ?? { value: String(raw), px, count: 0 };
    cur.count += 1;
    map.set(key, cur);
  };
  const colorMap = new Map();
  for (const v of colorViolations) bump(colorMap, formatValue(v.value), null);
  const fontMap = new Map();
  for (const v of fontViolations) bump(fontMap, formatValue(v.value), v.px);
  const radiusMap = new Map();
  for (const v of radiusViolations) bump(radiusMap, v.value, Number.isNaN(v.px) ? null : v.px);
  const asList = (map) => [...map.values()].sort((a, b) => b.count - a.count);

  const withNearest = {
    colors: asList(colorMap).map((row) => {
      const parsed = parseColor(row.value);
      const near = parsed ? nearestColor(parsed, tokens) : null;
      return { ...row, nearest: near ? near.name : null, nearestRaw: near ? near.raw : null };
    }),
    fontSizes: asList(fontMap).map((row) => {
      const near = nearestNumber(row.px, tokens.fontSizesPx);
      return { ...row, nearestPx: near ? near.value : null };
    }),
    radii: asList(radiusMap).map((row) => {
      const near = nearestNumber(row.px, tokens.radiiPx);
      return { ...row, nearestPx: near ? near.value : null };
    }),
  };

  const jsColors = colorViolations.filter((v) => v.file.endsWith('.js')).length;
  for (const v of colorViolations) if (v.file.endsWith('.js')) perFile.get(v.file).jsColors += 1;

  // 用「每个值出现次数」把 JS 颜色从 colors 里拆出来（保留在 totals 里另行展示）
  const totals = emptyCounts();
  for (const c of perFile.values()) {
    for (const k of Object.keys(totals)) totals[k] += c[k];
  }
  return {
    files: Object.fromEntries([...perFile.entries()].sort(([a], [b]) => a.localeCompare(b))),
    totals,
    colorViolations,
    fontViolations,
    radiusViolations,
    offTokenValues: {
      colors: withNearest.colors.slice(0, 200),
      fontSizes: withNearest.fontSizes.slice(0, 200),
      radii: withNearest.radii.slice(0, 200),
    },
    jsColorCount: jsColors,
    scannedFileCount: files.length,
  };
}

// ---------------------------------------------------------------------------
// 基线 / 文档一致性
// ---------------------------------------------------------------------------

function loadBaseline() {
  const abs = resolve(ROOT, BASELINE_FILE);
  if (!existsSync(abs)) return null;
  try {
    return JSON.parse(readFileSync(abs, 'utf8'));
  } catch (err) {
    return { error: String(err.message || err) };
  }
}

function diffAgainstBaseline(scan, baseline) {
  const result = { newFiles: [], regressions: [], improvements: [], missingFiles: [] };
  const baseCounts = baseline?.counts ?? {};
  const CHECK_KEYS = ['colors', 'fontSizes', 'radii', 'inlineStyleAttrs'];
  for (const [file, counts] of Object.entries(scan.files)) {
    const base = baseCounts[file];
    if (!base) {
      const total = CHECK_KEYS.reduce((s, k) => s + (counts[k] ?? 0), 0);
      if (total > 0) result.newFiles.push({ file, counts, total });
      continue;
    }
    for (const key of CHECK_KEYS) {
      const cur = counts[key] ?? 0;
      const old = base[key] ?? 0;
      if (cur > old) result.regressions.push({ file, key, from: old, to: cur });
      else if (cur < old) result.improvements.push({ file, key, from: old, to: cur });
    }
  }
  for (const file of Object.keys(baseCounts)) {
    if (!(file in scan.files)) result.missingFiles.push(file);
  }
  return result;
}

function checkDocs(tokens) {
  const abs = resolve(ROOT, DOC_FILE);
  if (!existsSync(abs)) {
    return { ok: false, missingDoc: true, absent: [], unknown: [], message: `缺少 ${DOC_FILE}` };
  }
  const text = readFileSync(abs, 'utf8');
  const docTokens = new Set(
    [...text.matchAll(/--mc-[a-zA-Z0-9-]+/g)]
      .map((m) => m[0])
      .filter((name) => !name.endsWith('-')),
  );
  const absent = [...tokens.defs.keys()].filter((t) => !docTokens.has(t)).sort();
  const unknown = [...docTokens].filter((t) => !tokens.defs.has(t)).sort();
  return { ok: absent.length === 0 && unknown.length === 0, absent, unknown };
}

// ---------------------------------------------------------------------------
// 报告
// ---------------------------------------------------------------------------

function nearestColor(parsed, tokens) {
  let best = null;
  for (const p of tokens.colorPairs) {
    if (!p.parsed) continue;
    const d = colorDistance(parsed, p.parsed);
    if (!best || d < best.d) best = { d, name: p.name, raw: p.raw };
  }
  return best;
}

function nearestNumber(n, list) {
  let best = null;
  for (const x of list) {
    const d = Math.abs(x - n);
    if (!best || d < best.d) best = { d, value: x };
  }
  return best;
}

function topFiles(scan, key, limit = 10) {
  return Object.entries(scan.files)
    .map(([file, counts]) => ({ file, n: counts[key] ?? 0 }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, limit);
}

function formatValue(v) {
  return String(v).replace(/\s+/g, ' ');
}

function buildReport({ tokens, scan, baseline, diff, docs, opts }) {
  const lines = [];
  const add = (s = '') => lines.push(s);

  add(`# MeCollage Design Token 审计报告`);
  add();
  add(`- 工具：${TOOL} v${VERSION}`);
  add(`- 时间：${new Date().toISOString()}`);
  add(`- Token 版本：${tokens.defs.size} 个 --mc-*（hash ${tokens.tokenHash}）`);
  add(`- Token 文件：\`${TOKEN_FILE}\``);
  add(`- 基线：\`${BASELINE_FILE}\`${baseline?.generatedAt ? `（${baseline.generatedAt}）` : '（不存在）'}`);
  add(`- 扫描文件：${scan.scannedFileCount} 个（*.html / *.css / *.js，排除 audit/docs/scripts）`);
  add();

  add('## 1. 结论');
  add();
  const driftCount = diff.newFiles.length + diff.regressions.length;
  const pass = driftCount === 0 && docs.ok && tokens.undefinedRefs.length === 0;
  add(pass ? '**PASS** — 无新增设计漂移，token 与文档一致。' : '**FAIL** — 存在设计漂移或 token/文档不一致。');
  add();
  add('## 2. 存量违规总览（基线内债务，不单独判 FAIL）');
  add();
  add('| 类别 | 数量 | 说明 |');
  add('|---|---:|---|');
  add(`| 颜色字面量（token 外） | ${scan.totals.colors} | 含 JS 样式颜色 ${scan.jsColorCount} 处 |`);
  add(`| font-size（token 外） | ${scan.totals.fontSizes} | rem/px 归一后比较 |`);
  add(`| border-radius（token 外） | ${scan.totals.radii} | 0 / 50% / token 值之外 |`);
  add(`| 相对单位 font-size | ${scan.totals.relativeFontSizes} | em/%/clamp 等，仅统计不判错 |`);
  add(`| style="" 内联属性 | ${scan.totals.inlineStyleAttrs} | 新增内联样式会计入漂移 |`);
  add(`| 内联 <style> 块 | ${scan.totals.styleBlocks} | 仅统计（多语言副本重复的主要来源） |`);
  add();

  add('### 2.1 颜色违规 Top 文件');
  add();
  add('| 文件 | 数量 |');
  add('|---|---:|');
  for (const x of topFiles(scan, 'colors', opts.maxList)) add(`| \`${x.file}\` | ${x.n} |`);
  add();
  add('### 2.2 font-size 违规 Top 文件');
  add();
  add('| 文件 | 数量 |');
  add('|---|---:|');
  for (const x of topFiles(scan, 'fontSizes', opts.maxList)) add(`| \`${x.file}\` | ${x.n} |`);
  add();
  add('### 2.3 border-radius 违规 Top 文件');
  add();
  add('| 文件 | 数量 |');
  add('|---|---:|');
  for (const x of topFiles(scan, 'radii', opts.maxList)) add(`| \`${x.file}\` | ${x.n} |`);
  add();

  add('### 2.4 token 外高频值（Top 15，完整数据见 --json 输出）');
  add();
  const valueTable = (title, rows, fmt) => {
    add(`**${title}**`);
    add();
    add('| 值 | 次数 | 最接近 token |');
    add('|---|---:|---|');
    for (const row of rows.slice(0, 15)) add(`| \`${row.value}\` | ${row.count} | ${fmt(row)} |`);
    add();
  };
  valueTable('颜色', scan.offTokenValues.colors, (row) => {
    const parsed = parseColor(row.value);
    const near = parsed ? nearestColor(parsed, tokens) : null;
    return near ? `\`${near.name}\` (${near.raw})` : '-';
  });
  valueTable('font-size', scan.offTokenValues.fontSizes, (row) => {
    const near = nearestNumber(row.px, tokens.fontSizesPx);
    return near ? `${near.value}px` : '-';
  });
  valueTable('border-radius（px）', scan.offTokenValues.radii, (row) => {
    const near = nearestNumber(row.px, tokens.radiiPx);
    return near ? `${near.value}px` : '-';
  });

  add('## 3. 本轮新增 / 漂移（FAIL 项）');
  add();
  if (driftCount === 0) {
    add('无。');
  } else {
    if (diff.newFiles.length) {
      add('### 3.1 新文件带 token 外样式');
      add();
      add('| 文件 | 颜色 | font-size | 圆角 | 内联样式 |');
      add('|---|---:|---:|---:|---:|');
      for (const x of diff.newFiles) {
        add(`| \`${x.file}\` | ${x.counts.colors} | ${x.counts.fontSizes} | ${x.counts.radii} | ${x.counts.inlineStyleAttrs} |`);
      }
      add();
    }
    if (diff.regressions.length) {
      add('### 3.2 既有文件违规数上涨');
      add();
      add('| 文件 | 类别 | 基线 | 当前 |');
      add('|---|---|---:|---:|');
      for (const x of diff.regressions) add(`| \`${x.file}\` | ${x.key} | ${x.from} | ${x.to} |`);
      add();
    }
  }

  add('## 4. Token / 文档一致性');
  add();
  add(`- 未定义引用（token 内部）：${tokens.undefinedRefs.length ? `**${tokens.undefinedRefs.length} 处**` : '0'}`);
  for (const u of tokens.undefinedRefs.slice(0, opts.maxList)) add(`  - \`${u.token}\` → \`${u.ref}\`（未定义）`);
  if (tokens.duplicateDefs?.length) {
    add(`- 重复定义（媒体查询覆盖）：${tokens.duplicateDefs.length} 处（主值保留首个，例如 prefers-reduced-motion 覆盖）`);
  }
  add(`- 文档缺少的 token：${docs.absent?.length ? `**${docs.absent.length} 个**` : '0'}`);
  if (docs.absent?.length) add(`  - ${docs.absent.slice(0, opts.maxList).map((t) => `\`${t}\``).join('、')}`);
  add(`- 文档中不存在的 token：${docs.unknown?.length ? `**${docs.unknown.length} 个**` : '0'}`);
  if (docs.unknown?.length) add(`  - ${docs.unknown.slice(0, opts.maxList).map((t) => `\`${t}\``).join('、')}`);
  add();

  add('## 5. 改进项（可跑 --update-baseline 固化，需人工复核）');
  add();
  if (diff.improvements.length === 0) {
    add('无。');
  } else {
    add('| 文件 | 类别 | 基线 | 当前 |');
    add('|---|---|---:|---:|');
    for (const x of diff.improvements.slice(0, opts.maxList)) add(`| \`${x.file}\` | ${x.key} | ${x.from} | ${x.to} |`);
    if (diff.improvements.length > opts.maxList) add(`\n> 仅显示前 ${opts.maxList} 条，共 ${diff.improvements.length} 条。`);
  }
  add();

  if (opts.reportAll) {
    add(`## 6. 全部违规明细（${scan.colorViolations.length + scan.fontViolations.length + scan.radiusViolations.length} 条）`);
    add();
    add('### 6.1 颜色（附最接近 token）');
    add();
    add('| 文件:行 | 值 | 属性 | 最接近 token |');
    add('|---|---|---|---|');
    for (const v of scan.colorViolations.slice(0, opts.maxList)) {
      const near = nearestColor(v.parsed, tokens);
      add(
        `| \`${v.file}:${v.line}\` | \`${formatValue(v.value)}\` | ${v.prop} | ${near ? `\`${near.name}\` (${near.raw})` : '-'} |`,
      );
    }
    add();
    add('### 6.2 font-size');
    add();
    add('| 文件:行 | 值 | 最接近 token |');
    add('|---|---|---|');
    for (const v of scan.fontViolations.slice(0, opts.maxList)) {
      const near = nearestNumber(v.px, tokens.fontSizesPx);
      add(`| \`${v.file}:${v.line}\` | \`${formatValue(v.value)}\` | ${near ? `${near.value}px` : '-'} |`);
    }
    add();
    add('### 6.3 border-radius');
    add();
    add('| 文件:行 | 值 |');
    add('|---|---|');
    for (const v of scan.radiusViolations.slice(0, opts.maxList)) add(`| \`${v.file}:${v.line}\` | \`${v.value}\` |`);
    add();
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

function fail(msg, code = 2) {
  console.error(`[${TOOL}] ${msg}`);
  process.exit(code);
}

function parseCli() {
  const { values } = parseArgs({
    options: {
      'update-baseline': { type: 'boolean', default: false },
      'report-all': { type: 'boolean', default: false },
      'check-docs': { type: 'boolean', default: true },
      'skip-doc-check': { type: 'boolean', default: false },
      'list-tokens': { type: 'boolean', default: false },
      json: { type: 'string' },
      md: { type: 'string' },
      'max-list': { type: 'string', default: '20' },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: false,
  });
  if (values.help) {
    console.log(`MeCollage Design Token 审计 v${VERSION}

用法：
  node scripts/design-audit/run-token-audit.mjs [选项]

选项：
  --update-baseline   用当前扫描结果重写基线（人工确认存量债务变化后执行）
  --report-all        输出全部违规明细（默认只输出摘要/Top 列表）
  --check-docs        校验 DESIGN-TOKENS.md 与 token 一致（默认开启，可显式写）
  --skip-doc-check    跳过 DESIGN-TOKENS.md 一致性检查
  --list-tokens       打印 token 清单（Markdown 行，供文档生成）
  --json <path>       报告写入 JSON
  --md <path>         报告写入 Markdown
  --max-list <n>      每个列表最多输出条数（默认 20）
  -h, --help          帮助

退出码：0 无漂移；1 有漂移/文档不一致；2 环境或用法错误。`);
    process.exit(0);
  }
  const maxList = Number.parseInt(values['max-list'], 10);
  if (!Number.isFinite(maxList) || maxList <= 0) fail('--max-list 必须是正整数');
  return {
    updateBaseline: values['update-baseline'],
    reportAll: values['report-all'],
    skipDocCheck: values['skip-doc-check'],
    listTokens: values['list-tokens'],
    json: values.json ? resolve(ROOT, values.json) : null,
    md: values.md ? resolve(ROOT, values.md) : null,
    maxList,
  };
}

function main() {
  const opts = parseCli();
  const tokens = readTokenFile();

  if (opts.listTokens) {
    for (const name of tokens.order) {
      console.log(`| \`${name}\` | \`${tokens.resolved.get(name) ?? tokens.defs.get(name)}\` |`);
    }
    return;
  }

  const scan = scanRepo(tokens);
  // 内部设计文档已迁出公开仓库：docs/ 不存在时自动跳过文档一致性检查
  // （在私有仓库/完整工程副本中仍会执行；公开仓库只保留站点源码）。
  const hasInternalDocs = existsSync(resolve(ROOT, DOC_FILE));
  const docs = opts.skipDocCheck || !hasInternalDocs
    ? { ok: true, absent: [], unknown: [], skipped: true, reason: hasInternalDocs ? 'flag' : 'internal-docs-private' }
    : checkDocs(tokens);
  if (!hasInternalDocs && !opts.skipDocCheck) {
    console.log(`[${TOOL}] docs/ 未包含在本仓库（内部文档私有），跳过 DESIGN-TOKENS.md 一致性检查`);
  }
  const baseline = loadBaseline();
  if (baseline?.error) fail(`基线文件无法解析：${baseline.error}`);
  const diff = baseline
    ? diffAgainstBaseline(scan, baseline)
    : { newFiles: [], regressions: [], improvements: [], missingFiles: [] };
  const driftCount = diff.newFiles.length + diff.regressions.length;
  const pass = driftCount === 0 && docs.ok && tokens.undefinedRefs.length === 0;

  const report = buildReport({ tokens, scan, baseline, diff, docs, opts });
  if (opts.json) {
    mkdirSync(dirname(opts.json), { recursive: true });
    writeFileSync(
      opts.json,
      JSON.stringify(
        {
          tool: TOOL,
          version: VERSION,
          generatedAt: new Date().toISOString(),
          tokenHash: tokens.tokenHash,
          tokenCount: tokens.defs.size,
          scannedFileCount: scan.scannedFileCount,
          pass,
          baseline: baseline
            ? { generatedAt: baseline.generatedAt, gitHead: baseline.gitHead ?? null }
            : null,
          totals: scan.totals,
          offTokenValues: scan.offTokenValues,
          newFiles: diff.newFiles,
          regressions: diff.regressions,
          improvements: diff.improvements,
          docs,
          files: scan.files,
        },
        null,
        2,
      ) + '\n',
    );
  }
  if (opts.md) {
    mkdirSync(dirname(opts.md), { recursive: true });
    writeFileSync(opts.md, report + '\n');
  }

  if (!baseline && !opts.updateBaseline) {
    console.log(`[${TOOL}] 基线不存在：${BASELINE_FILE}`);
    console.log(`[${TOOL}] 首次运行请用 --update-baseline 生成基线（先人工审阅扫描结果）。`);
    console.log(report);
    process.exit(2);
  }

  // 控制台摘要
  console.log(`[${TOOL}] token ${tokens.defs.size} 个（${TOKEN_FILE}，hash ${tokens.tokenHash}）`);
  console.log(
    `[${TOOL}] 扫描 ${scan.scannedFileCount} 个文件：token 外颜色 ${scan.totals.colors}（JS ${scan.jsColorCount}）、font-size ${scan.totals.fontSizes}、圆角 ${scan.totals.radii}、内联 style ${scan.totals.inlineStyleAttrs}`,
  );
  if (docs.absent?.length || docs.unknown?.length) {
    console.log(
      `[${TOOL}] 文档不一致：缺少 ${docs.absent.length} 个 token、文档多出 ${docs.unknown.length} 个 token（详见报告）`,
    );
  }
  if (tokens.undefinedRefs.length) console.log(`[${TOOL}] token 未定义引用 ${tokens.undefinedRefs.length} 处`);
  if (diff.newFiles.length) {
    for (const x of diff.newFiles) console.log(`[${TOOL}] 新文件漂移：${x.file}`);
  }
  if (diff.regressions.length) {
    for (const x of diff.regressions) console.log(`[${TOOL}] 漂移上涨：${x.file} ${x.key} ${x.from} → ${x.to}`);
  }
  if (diff.improvements.length) {
    console.log(`[${TOOL}] 违规下降 ${diff.improvements.length} 处；复核后可跑 --update-baseline 固化`);
  }
  if (opts.reportAll) console.log(report);
  console.log(pass ? `[${TOOL}] PASS：无新增设计漂移` : `[${TOOL}] FAIL：存在设计漂移或 token/文档不一致`);

  if (opts.updateBaseline) {
    const payload = {
      tool: TOOL,
      version: VERSION,
      generatedAt: new Date().toISOString(),
      gitHead: tryGitHead(),
      tokenHash: tokens.tokenHash,
      tokenCount: tokens.defs.size,
      note: '存量设计债务基线：记录当前 token 外硬编码数量。新增违规会判 FAIL；存量不判错。修改需人工复核。',
      totals: scan.totals,
      counts: scan.files,
    };
    mkdirSync(dirname(resolve(ROOT, BASELINE_FILE)), { recursive: true });
    writeFileSync(resolve(ROOT, BASELINE_FILE), JSON.stringify(payload, null, 2) + '\n');
    console.log(`[${TOOL}] 已写入基线：${BASELINE_FILE}（${Object.keys(scan.files).length} 个文件）`);
    process.exit(0);
  }

  process.exit(pass ? 0 : 1);
}

function tryGitHead() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

main();
