#!/usr/bin/env node
/**
 * Phase B-2：多语言 / SEO 浏览器验证 harness（零依赖）
 *
 * 复用 scripts/functional-audit/ 的 CDP 客户端与 Vercel 模拟静态服务器：
 *   - cdp.mjs   → headless Chrome + WebSocket（navigate / Runtime.evaluate / 截图）
 *   - server.mjs→ cleanUrls、trailingSlash、/tools/* rewrite、404.html
 *
 * 检查矩阵（对本地静态服务器，渲染后 DOM + 静态 HTML + sitemap/robots）：
 *   A. 渲染后语言：<html lang>、可见正文语言（与英文对应页相似度 + CJK/假名/西语信号）、
 *      title/description 是否与静态 HTML 一致（不被 i18n.js 覆盖）。
 *   B. 语言切换器：a.lang-option 数量=5、href 非 #、hreflang 正确、目标本地 200；
 *      本地化页包含 en + 其它 4 语言。
 *   C. sitemap：loc 去重数=94、每个 loc 本地 200 且非重定向、68 个本地化 URL 齐全、
 *      hreflang alternates 与页面 head 一致且互指。
 *   D. head 元数据：canonical 自引用且 200、hreflang 集合=语言簇、无重复/无失效目标、
 *      静态 <html lang> 合法、canonical 唯一。
 *   E. 内部链接：从 / 做 BFS（<a href> 站内链接）；报告「严格全部可达」与
 *      「每个本地化页 ≥1 入链」两种判定；附同语言内链比例（参考）。
 *   F. robots.txt：无 `Disallow: /*?lang=`、Sitemap 行存在。
 *
 * 用法（仓库根目录）：
 *   node scripts/seo-audit/run-seo-checks.mjs [--label baseline|final] [--json path] [--md path]
 *
 * 输出（默认）：
 *   audit/evidence/phase-b/seo-report.json / seo-report.md（最新一次）
 *   audit/evidence/phase-b/seo-report-<label>.{json,md}（带 label 时另存快照）
 *   audit/evidence/phase-b/shots/（渲染类 FAIL 截图）
 *   audit/evidence/phase-b/html/（渲染类 FAIL 快照 + 静态 FAIL 的 head 片段）
 *
 * 退出码：0 = 无 FAIL（允许 WARN）；1 = 存在 FAIL；2 = 环境/运行错误。
 *
 * 约束：只读站点文件；不改站点、不 git 写操作、不部署；不为了变绿放宽断言。
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { performance } from 'node:perf_hooks';

import { launchChrome, ChromePage } from '../functional-audit/cdp.mjs';
import { startStaticServer } from './server.mjs';

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

const ROOT = process.cwd();
const EVIDENCE_DIR = resolve(ROOT, 'audit/evidence/phase-b');
const SHOTS_DIR = join(EVIDENCE_DIR, 'shots');
const HTML_SNAPSHOT_DIR = join(EVIDENCE_DIR, 'html');
const DEFAULT_JSON = join(EVIDENCE_DIR, 'seo-report.json');
const DEFAULT_MD = join(EVIDENCE_DIR, 'seo-report.md');

const PROD_ORIGIN = 'https://www.mecollage.top';
const VIEWPORT = { width: 1280, height: 900 };

/** 语言配置：目录前缀 → html lang 允许值 / sitemap-hreflang 代码 / i18n 文件名 */
const LANGUAGES = [
  { key: 'en', prefix: '', sitemapLang: 'en', htmlLang: ['en', 'en-US'], i18nKey: 'en' },
  { key: 'zh', prefix: 'zh', sitemapLang: 'zh-CN', htmlLang: ['zh', 'zh-CN'], i18nKey: 'zh' },
  { key: 'tw', prefix: 'tw', sitemapLang: 'zh-TW', htmlLang: ['zh-TW', 'zh-Hant'], i18nKey: 'zh-tw' },
  { key: 'ja', prefix: 'ja', sitemapLang: 'ja', htmlLang: ['ja', 'ja-JP'], i18nKey: 'ja' },
  { key: 'es', prefix: 'es', sitemapLang: 'es', htmlLang: ['es', 'es-ES', 'es-419'], i18nKey: 'es' },
];
const LANGUAGE_BY_KEY = Object.fromEntries(LANGUAGES.map((lang) => [lang.key, lang]));
const LANG_KEYS = LANGUAGES.map((lang) => lang.key);

/** 浏览器测试页：5 个首页 + 4 工具页 × 5 语言 = 25 */
const HOMEPAGE_URLS = ['/', '/zh/', '/es/', '/ja/', '/tw/'];
const TOOL_BASES = ['/tools/square/', '/tools/squarecrop/', '/tools/roundedcorners/', '/tools/blurredframe/'];
const RENDERED_URLS = [
  ...HOMEPAGE_URLS,
  ...TOOL_BASES.flatMap((base) => LANGUAGES.map((lang) => langUrl(lang.key, base))),
];

/** 正文语言判定阈值（与 spec 对齐：相似度 <0.3 或 目标语言字符/词占比达标） */
const SIMILARITY_THRESHOLD = 0.3;
const SCRIPT_THRESHOLDS = { zh: 0.2, tw: 0.2, ja: 0.15, es: 0.1, en: 0 };

const SPANISH_MARKERS = new Set(
  'de la el que y en un una por con para es los las del se al como más pero su sus o este esta son está tu tus sin sobre entre nos lo le ya muy también puedes hacer imagen imágenes fotos collage crear herramienta gratis online'.split(
    ' ',
  ),
);

const BLOCKED_URLS = [
  '*://pagead2.googlesyndication.com/*',
  '*://www.googletagmanager.com/*',
  '*://googleads.g.doubleclick.net/*',
  '*://tpc.googlesyndication.com/*',
  '*://cdn.jsdelivr.net/*',
  '*://esm.sh/*',
  '*://fonts.googleapis.com/*',
  '*://fonts.gstatic.com/*',
];

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
const sha = (value) => createHash('sha256').update(value).digest('hex');

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseCli() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : null;
  };
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`用法：node scripts/seo-audit/run-seo-checks.mjs [--label <baseline|final>] [--json <path>] [--md <path>]`);
    process.exit(0);
  }
  return {
    label: get('--label') || 'run',
    jsonPath: get('--json') || DEFAULT_JSON,
    mdPath: get('--md') || DEFAULT_MD,
  };
}

// ---------------------------------------------------------------------------
// 页面清单 / URL 映射
// ---------------------------------------------------------------------------

function walkHtmlFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.')) continue;
    if (['node_modules', 'audit', 'docs', 'scripts', 'assets', 'i18n', 'public'].includes(entry.name) && dir === ROOT) {
      if (entry.name === 'public') {
        // 只收 public/tools 下的页面
        walkHtmlFiles(join(dir, 'public/tools'), out);
      }
      continue;
    }
    const absolute = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkHtmlFiles(absolute, out);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      out.push(relative(ROOT, absolute));
    }
  }
  return out;
}

function urlForFile(relPath) {
  const posix = relPath.split(sep).join('/');
  if (posix === 'index.html') return '/';
  if (posix.endsWith('/index.html')) {
    const dir = `/${posix.slice(0, -'index.html'.length)}`;
    return dir.startsWith('/public/tools/') ? dir.replace('/public/tools/', '/tools/') : dir;
  }
  return `/${posix.slice(0, -'.html'.length)}/`;
}

/** URL 所属语言 key */
function languageOf(url) {
  const match = /^\/(zh|tw|ja|es)(?:\/|$)/.exec(url);
  return match ? match[1] : 'en';
}

/** 去掉语言前缀的 base 路径（用于构造语言簇） */
function basePathOf(url) {
  const lang = languageOf(url);
  if (lang === 'en') return url;
  return url.slice(`/${lang}`.length) || '/';
}

/** 语言簇中某语言的 URL（不做存在性判断） */
function langUrl(langKey, basePath) {
  const lang = LANGUAGE_BY_KEY[langKey];
  if (!lang || lang.key === 'en') return basePath;
  return `/${lang.prefix}${basePath === '/' ? '/' : basePath}`;
}

function normalizeSlashes(url) {
  let path = url;
  if (!path.startsWith('/')) path = `/${path}`;
  if (!path.endsWith('/')) path = `${path}/`;
  return path.replace(/\/{2,}/g, '/');
}

/** 把任意站内 href 归一化为页面 URL（仅用于与清单匹配） */
function normalizeHrefToPageUrl(href, fromUrl) {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith('#') || /^(mailto:|tel:|javascript:)/i.test(trimmed)) return null;
  let resolved;
  try {
    resolved = new URL(trimmed, `${PROD_ORIGIN}${fromUrl}`);
  } catch {
    return null;
  }
  if (!/^(www\.)?mecollage\.top$/i.test(resolved.hostname)) return null;
  let path = resolved.pathname;
  path = path.replace(/\/index\.html$/, '/');
  if (/\.html$/.test(path)) path = `${path.slice(0, -'.html'.length)}/`;
  if (path.startsWith('/public/tools/')) path = path.replace('/public/tools/', '/tools/');
  return normalizeSlashes(path);
}

// ---------------------------------------------------------------------------
// 静态 HTML 解析（零依赖，正则）
// ---------------------------------------------------------------------------

const HTML_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
};

function decodeEntities(text) {
  return String(text ?? '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (entity.startsWith('#')) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return HTML_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function attr(tag, name) {
  const regex = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = regex.exec(tag);
  if (!match) return null;
  return decodeEntities(match[1] ?? match[2] ?? match[3] ?? '').trim();
}

function parseStaticHtml(html) {
  const head = html.includes('</head>') ? html.slice(0, html.indexOf('</head>')) : html.slice(0, 30000);
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const htmlTag = /<html\b[^>]*>/i.exec(html)?.[0] ?? '';
  const langValue = attr(htmlTag, 'lang');

  let description = null;
  for (const metaTag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    if ((attr(metaTag, 'name') ?? '').toLowerCase() === 'description') {
      description = attr(metaTag, 'content');
      break;
    }
  }

  let canonical = null;
  const hreflangs = [];
  for (const linkTag of head.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = (attr(linkTag, 'rel') ?? '').toLowerCase();
    if (rel === 'canonical') canonical = attr(linkTag, 'href');
    if (rel.includes('alternate') && attr(linkTag, 'hreflang')) {
      hreflangs.push({ hreflang: attr(linkTag, 'hreflang'), href: attr(linkTag, 'href') });
    }
  }

  const anchors = [];
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const tag = match[0];
    anchors.push({
      href: attr(tag, 'href'),
      className: attr(tag, 'class') ?? '',
      hreflang: attr(tag, 'hreflang'),
      dataLanguageNav: /\bdata-language-nav\b/i.test(tag),
      text: '',
    });
  }

  return {
    lang: langValue,
    title: titleMatch ? decodeEntities(titleMatch[1]).replace(/\s+/g, ' ').trim() : null,
    description,
    canonical,
    hreflangs,
    anchors,
  };
}

// ---------------------------------------------------------------------------
// 运行器与结果收集
// ---------------------------------------------------------------------------

const results = [];
const failuresForSnapshot = [];
let currentPage = null;

function formatActual(actual) {
  if (actual === null || actual === undefined) return 'null';
  if (typeof actual === 'string') return actual.length > 400 ? `${actual.slice(0, 400)}…` : actual;
  const json = JSON.stringify(actual);
  return json.length > 600 ? `${json.slice(0, 600)}…` : json;
}

async function runCase(definition) {
  const assertions = [];
  const measurements = {};
  const details = [];
  const screenshots = [];
  const htmlSnapshots = [];

  const ctx = {
    check(label, ok, { level = 'FAIL', actual = null, expected = null } = {}) {
      assertions.push({ label, status: ok ? 'PASS' : level, actual, expected });
      return Boolean(ok);
    },
    measure(label, value) {
      measurements[label] = value;
    },
    detail(entry) {
      details.push(entry);
    },
    screenshot(name) {
      if (!page) return null;
      const fileName = `${safeName(definition.id)}-${safeName(name)}.png`;
      const absolute = join(SHOTS_DIR, fileName);
      mkdirSync(SHOTS_DIR, { recursive: true });
      page.screenshot({ path: absolute }).catch(() => {});
      screenshots.push(relative(ROOT, absolute));
      return relative(ROOT, absolute);
    },
    async htmlSnapshot(name) {
      if (!page) return null;
      try {
        const html = await page.eval('document.documentElement.outerHTML');
        const fileName = `${safeName(definition.id)}-${safeName(name)}.html`;
        const absolute = join(HTML_SNAPSHOT_DIR, fileName);
        mkdirSync(HTML_SNAPSHOT_DIR, { recursive: true });
        writeFileSync(absolute, html, 'utf8');
        htmlSnapshots.push(relative(ROOT, absolute));
        return relative(ROOT, absolute);
      } catch {
        return null;
      }
    },
  };

  const startedAt = performance.now();
  try {
    await definition.fn(ctx);
  } catch (error) {
    assertions.push({ label: '用例执行异常', status: 'FAIL', actual: String(error?.message || error).slice(0, 800) });
  }
  const durationMs = Math.round(performance.now() - startedAt);
  const failed = assertions.filter((assertion) => assertion.status === 'FAIL');
  const warned = assertions.filter((assertion) => assertion.status === 'WARN');
  const status = failed.length > 0 ? 'FAIL' : warned.length > 0 ? 'WARN' : 'PASS';
  const record = {
    id: definition.id,
    group: definition.group,
    name: definition.name,
    status,
    durationMs,
    assertions,
    measurements,
    details,
    screenshots,
    htmlSnapshots,
  };
  results.push(record);
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} [${definition.group}] ${definition.id} — ${definition.name}（${durationMs}ms）`);
  for (const assertion of [...failed, ...warned]) {
    console.log(`    ${assertion.status} ${assertion.label}${assertion.actual !== null ? ` — ${formatActual(assertion.actual)}` : ''}`);
  }
  if (status === 'FAIL') failuresForSnapshot.push(record);
  return record;
}

function safeName(text) {
  return String(text).replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 90);
}

// ---------------------------------------------------------------------------
// 静态检查辅助
// ---------------------------------------------------------------------------

let inventory = null; // Map<url, {rel, file, url, langKey, basePath, parsed}>
let urlSet = null;
let httpCache = null;

async function checkLocal(path) {
  if (!httpCache) httpCache = new Map();
  const key = path;
  if (httpCache.has(key)) return httpCache.get(key);
  const promise = (async () => {
    try {
      const response = await fetch(`${server.url}${path}`, { redirect: 'manual' });
      const location = response.headers.get('location');
      await response.arrayBuffer().catch(() => null);
      return { status: response.status, location };
    } catch (error) {
      return { status: 0, location: null, error: String(error?.message || error) };
    }
  })();
  httpCache.set(key, promise);
  return promise;
}

function expectedHtmlLangs(langKey) {
  return LANGUAGE_BY_KEY[langKey].htmlLang.map((value) => value.toLowerCase());
}

function expectedHreflangMapFor(url) {
  const base = basePathOf(url);
  const map = new Map();
  const enUrl = langUrl('en', base);
  if (!urlSet.has(enUrl)) return map;
  map.set('x-default', enUrl);
  for (const lang of LANGUAGES) {
    const candidate = langUrl(lang.key, base);
    if (urlSet.has(candidate)) map.set(lang.sitemapLang, candidate);
  }
  return map;
}

function canonicalPath(value) {
  if (!value) return null;
  try {
    const parsed = new URL(value, PROD_ORIGIN);
    return normalizeSlashes(parsed.pathname);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 渲染页检查
// ---------------------------------------------------------------------------

let page = null;
let server = null;
let chrome = null;
const renderedData = new Map(); // url -> rendered snapshot

const RENDER_SNIPPET = `(() => {
  const text = (document.body && document.body.innerText ? document.body.innerText : '').replace(/\\s+/g, ' ').trim();
  const meta = document.querySelector('meta[name="description"]');
  const canonical = document.querySelector('link[rel="canonical"]');
  const headHreflangs = [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((link) => ({
    hreflang: link.getAttribute('hreflang'),
    href: link.getAttribute('href'),
  }));
  const langAnchors = [...document.querySelectorAll('a.lang-option')].map((a) => ({
    href: a.getAttribute('href'),
    hreflang: a.getAttribute('hreflang'),
    text: (a.textContent || '').trim().slice(0, 40),
    absolute: a.href,
  }));
  return {
    path: location.pathname,
    htmlLang: document.documentElement.getAttribute('lang'),
    title: document.title,
    description: meta ? meta.getAttribute('content') : null,
    canonical: canonical ? canonical.getAttribute('href') : null,
    headHreflangs,
    langAnchors,
    i18nPresent: Boolean(window.i18n),
    i18nLang: window.i18n ? window.i18n.currentLang : null,
    i18nTranslations: window.i18n && window.i18n.translations ? Object.keys(window.i18n.translations).length : 0,
    visibleText: text.slice(0, 30000),
    visibleChars: text.length,
    langSelectorCount: document.querySelectorAll('.lang-selector').length,
  };
})()`;

async function renderUrl(url) {
  await page.navigate(`${server.url}${url}`, { timeoutMs: 30000 });
  await page.waitFor("document.readyState === 'complete'", { timeoutMs: 10000 }).catch(() => {});
  const hasI18n = await page.eval("Boolean(document.querySelector('script[src*=\"i18n.js\"]'))").catch(() => false);
  if (hasI18n) {
    await page.waitFor("Boolean(window.i18n)", { timeoutMs: 6000 }).catch(() => {});
    await page
      .waitFor('Boolean(window.i18n && window.i18n.translations && Object.keys(window.i18n.translations).length > 0)', {
        timeoutMs: 6000,
      })
      .catch(() => {});
  }
  await sleep(120);
  const data = await page.eval(RENDER_SNIPPET);
  data.exceptions = page.exceptions.map((exception) => exception.text).slice(0, 5);
  data.blockedRequests = page.failedRequests.filter((request) => request.blockedReason).length;
  // 渲染证据：截图 + HTML 快照（失败页面在报告/JSON 中可直接定位）
  const slug = safeName(url || '/') || 'root';
  try {
    const shotPath = join(SHOTS_DIR, `rendered-${slug}.png`);
    await page.screenshot({ path: shotPath });
    data.screenshot = relative(ROOT, shotPath);
  } catch {
    data.screenshot = null;
  }
  try {
    const html = await page.eval('document.documentElement.outerHTML');
    const htmlPath = join(HTML_SNAPSHOT_DIR, `rendered-${slug}.html`);
    writeFileSync(htmlPath, html, 'utf8');
    data.htmlSnapshot = relative(ROOT, htmlPath);
  } catch {
    data.htmlSnapshot = null;
  }
  renderedData.set(url, data);
  return data;
}

// ---------------------------------------------------------------------------
// 语言/文本分析
// ---------------------------------------------------------------------------

function latinTokens(text) {
  return new Set((String(text).toLowerCase().match(/[a-z0-9']{2,}/g) ?? []).slice(0, 4000));
}

function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function textSignal(text) {
  const source = String(text);
  const cjk = (source.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const kana = (source.match(/[\u3040-\u30ff]/g) ?? []).length;
  const latin = (source.match(/[A-Za-z]/g) ?? []).length;
  const scriptTotal = cjk + kana + latin;
  const words = source.toLowerCase().match(/[a-záéíóúñü]+/g) ?? [];
  const markerHits = words.filter((word) => SPANISH_MARKERS.has(word)).length;
  return {
    cjk,
    kana,
    latin,
    cjkRatio: scriptTotal > 0 ? cjk / scriptTotal : 0,
    kanaCjkRatio: scriptTotal > 0 ? (kana + cjk) / scriptTotal : 0,
    spanishMarkerRatio: words.length > 0 ? markerHits / words.length : 0,
  };
}

function languageSignalFor(langKey, signal) {
  if (langKey === 'zh' || langKey === 'tw') return signal.cjkRatio;
  if (langKey === 'ja') return signal.kanaCjkRatio;
  if (langKey === 'es') return signal.spanishMarkerRatio;
  return 0;
}

// ---------------------------------------------------------------------------
// 检查 A：渲染后语言 / title / description
// ---------------------------------------------------------------------------

async function runRenderedChecks() {
  const englishHomepage = await renderUrl('/');

  const aDetails = [];
  for (const url of RENDERED_URLS) {
    if (url !== '/' && !renderedData.has(url)) await renderUrl(url);
  }

  await runCase({
    id: 'A1',
    group: 'A-rendered-lang',
    name: '渲染后 <html lang> 与目录语言一致（25 页）',
    async fn(ctx) {
      const rows = [];
      for (const url of RENDERED_URLS) {
        const data = renderedData.get(url);
        const langKey = languageOf(url);
        const allowed = expectedHtmlLangs(langKey);
        const normalized = (data.htmlLang ?? '').toLowerCase();
        const ok = allowed.includes(normalized);
        rows.push({ url, expectedLang: langKey, allowed, actualHtmlLang: data.htmlLang, i18nLang: data.i18nLang, ok, note: data.i18nPresent ? null : '页面未加载 i18n.js' });
        ctx.detail(rows[rows.length - 1]);
      }
      const failed = rows.filter((row) => !row.ok);
      ctx.measure('pages', rows);
      ctx.measure('failedCount', failed.length);
      ctx.check(`渲染后 html lang 与目录语言一致（${rows.length - failed.length}/${rows.length}）`, failed.length === 0, {
        actual: failed.slice(0, 15).map((row) => {
          const data = renderedData.get(row.url);
          return { ...row, screenshot: data?.screenshot, htmlSnapshot: data?.htmlSnapshot };
        }),
      });
      // i18n.currentLang 与目录语言对照（辅助信息）
      const i18nMismatch = rows.filter((row) => row.i18nLang && row.i18nLang !== LANGUAGE_BY_KEY[row.expectedLang].i18nKey);
      ctx.check('i18n.currentLang 与目录语言一致（辅助项）', i18nMismatch.length === 0, {
        level: 'WARN',
        actual: i18nMismatch.slice(0, 10),
      });
    },
  });

  await runCase({
    id: 'A2',
    group: 'A-rendered-lang',
    name: '可见正文语言与英文对应页差异（相似度<0.3 或 CJK/假名/西语信号）',
    async fn(ctx) {
      const homepageTokens = latinTokens(englishHomepage.visibleText);
      const rows = [];
      for (const url of RENDERED_URLS) {
        const data = renderedData.get(url);
        const langKey = languageOf(url);
        const enCounterpartUrl = langUrl('en', basePathOf(url));
        const counterpart = renderedData.get(enCounterpartUrl);
        const tokens = latinTokens(data.visibleText);
        const simCounterpart = counterpart ? jaccard(tokens, latinTokens(counterpart.visibleText)) : null;
        const simHomepage = jaccard(tokens, homepageTokens);
        const signal = textSignal(data.visibleText);
        const languageSignal = languageSignalFor(langKey, signal);
        let ok;
        let reason;
        if (langKey === 'en') {
          // 英文页：不应出现明显 CJK/假名/西语正文
          ok = signal.cjkRatio < 0.05 && signal.kanaCjkRatio < 0.05 && signal.spanishMarkerRatio < 0.3;
          reason = '英文页应无显著 CJK/假名/西语正文';
        } else {
          const sim = simCounterpart ?? simHomepage;
          ok = sim < SIMILARITY_THRESHOLD || languageSignal >= SCRIPT_THRESHOLDS[langKey];
          reason =
            sim < SIMILARITY_THRESHOLD
              ? `与英文对应页相似度 ${sim.toFixed(3)} < ${SIMILARITY_THRESHOLD}`
              : `语言信号 ${languageSignal.toFixed(3)} ≥ 阈值 ${SCRIPT_THRESHOLDS[langKey]}`;
        }
        rows.push({
          url,
          expectedLang: langKey,
          enCounterpartUrl,
          similarityVsEnCounterpart: simCounterpart === null ? null : Number(simCounterpart.toFixed(4)),
          similarityVsEnglishHomepage: Number(simHomepage.toFixed(4)),
          cjkRatio: Number(signal.cjkRatio.toFixed(4)),
          kanaCjkRatio: Number(signal.kanaCjkRatio.toFixed(4)),
          spanishMarkerRatio: Number(signal.spanishMarkerRatio.toFixed(4)),
          visibleChars: data.visibleChars,
          ok,
          reason,
          sample: data.visibleText.slice(0, 180),
        });
        ctx.detail(rows[rows.length - 1]);
      }
      const failed = rows.filter((row) => !row.ok);
      ctx.measure('pages', rows);
      ctx.measure('failedCount', failed.length);
      ctx.check(`可见正文语言符合预期（${rows.length - failed.length}/${rows.length}）`, failed.length === 0, {
        actual: failed.slice(0, 12),
      });
      // 渲染异常/资源失败作为辅助信息
      const exceptionPages = RENDERED_URLS.filter((url) => (renderedData.get(url)?.exceptions ?? []).length > 0);
      ctx.check('渲染页无未捕获 JS 异常（辅助项）', exceptionPages.length === 0, {
        level: 'WARN',
        actual: exceptionPages.map((url) => ({ url, exceptions: renderedData.get(url)?.exceptions })),
      });
    },
  });

  await runCase({
    id: 'A3',
    group: 'A-rendered-lang',
    name: 'title / description 渲染后与静态 HTML 一致（不被 i18n.js 覆盖）',
    async fn(ctx) {
      const rows = [];
      for (const url of RENDERED_URLS) {
        const data = renderedData.get(url);
        const statics = inventory.get(url).parsed;
        const titleOk = normalizeText(data.title) === normalizeText(statics.title);
        const descOk = normalizeText(data.description) === normalizeText(statics.description);
        rows.push({
          url,
          staticTitle: statics.title,
          renderedTitle: data.title,
          titleOk,
          staticDescription: statics.description,
          renderedDescription: data.description,
          descriptionOk: descOk,
        });
        ctx.detail(rows[rows.length - 1]);
      }
      const titleFails = rows.filter((row) => !row.titleOk);
      const descFails = rows.filter((row) => !row.descriptionOk);
      ctx.measure('pages', rows);
      ctx.check(`title 未被运行时覆盖（${rows.length - titleFails.length}/${rows.length}）`, titleFails.length === 0, {
        actual: titleFails.slice(0, 10),
      });
      ctx.check(`description 未被运行时覆盖（${rows.length - descFails.length}/${rows.length}）`, descFails.length === 0, {
        actual: descFails.slice(0, 10),
      });
    },
  });
}

function normalizeText(value) {
  return decodeEntities(String(value ?? ''))
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// 检查 B：语言切换器
// ---------------------------------------------------------------------------

async function runSwitcherChecks() {
  await runCase({
    id: 'B1',
    group: 'B-switcher',
    name: '语言切换器：a.lang-option 数量=5 / href 非 # / hreflang 正确 / 指向语言簇正确 URL（25 页）',
    async fn(ctx) {
      const rows = [];
      for (const url of RENDERED_URLS) {
        const data = renderedData.get(url);
        const langKey = languageOf(url);
        const expectedMap = expectedHreflangMapFor(url);
        const anchors = data.langAnchors ?? [];
        const problems = [];
        if (anchors.length !== 5) problems.push(`数量 ${anchors.length} ≠ 5`);
        const seen = new Map();
        for (const anchor of anchors) {
          const hrefRaw = anchor.href ?? '';
          if (!hrefRaw || hrefRaw.trim() === '#') problems.push(`href 为空或 #（${anchor.hreflang ?? '?'}）`);
          if (!anchor.hreflang) problems.push('缺少 hreflang 属性');
          const expectedUrl = expectedMap.get(anchor.hreflang);
          const actualPath = anchor.absolute ? new URL(anchor.absolute).pathname : canonicalPath(hrefRaw);
          if (!expectedUrl) {
            problems.push(`hreflang=${anchor.hreflang} 不在预期语言簇 [${[...expectedMap.keys()].join(',')}]`);
          } else if (normalizeSlashes(actualPath) !== normalizeSlashes(expectedUrl)) {
            problems.push(`hreflang=${anchor.hreflang} 指向 ${actualPath}，期望 ${expectedUrl}`);
          }
          seen.set(anchor.hreflang, (seen.get(anchor.hreflang) ?? 0) + 1);
        }
        for (const [code, count] of seen) if (count > 1) problems.push(`hreflang=${code} 重复 ${count} 次`);
        if (langKey !== 'en') {
          const codes = new Set(anchors.map((anchor) => anchor.hreflang));
          for (const required of ['en', 'zh-CN', 'zh-TW', 'ja', 'es']) {
            if (!codes.has(required)) problems.push(`本地化页缺少 hreflang=${required} 链接`);
          }
        }
        rows.push({
          url,
          expectedLang: langKey,
          anchorCount: anchors.length,
          anchors: anchors.map((anchor) => ({ href: anchor.href, hreflang: anchor.hreflang, text: anchor.text })),
          ok: problems.length === 0,
          problems,
        });
        ctx.detail(rows[rows.length - 1]);
      }
      const failed = rows.filter((row) => !row.ok);
      ctx.measure('pages', rows);
      ctx.measure('failedCount', failed.length);
      ctx.check(`语言切换器结构/目标正确（${rows.length - failed.length}/${rows.length}）`, failed.length === 0, {
        actual: failed.slice(0, 12),
      });
    },
  });

  await runCase({
    id: 'B2',
    group: 'B-switcher',
    name: '语言切换器目标本地可达（HTTP 200，无重定向）',
    async fn(ctx) {
      const checked = new Map();
      const failures = [];
      for (const url of RENDERED_URLS) {
        const data = renderedData.get(url);
        for (const anchor of data.langAnchors ?? []) {
          if (!anchor.absolute) continue;
          let path;
          try {
            path = new URL(anchor.absolute).pathname;
          } catch {
            failures.push({ from: url, hreflang: anchor.hreflang, href: anchor.href, error: '无法解析 href' });
            continue;
          }
          const normalized = normalizeSlashes(path);
          if (!checked.has(normalized)) checked.set(normalized, await checkLocal(normalized));
          const result = checked.get(normalized);
          if (result.status !== 200) {
            failures.push({
              from: url,
              hreflang: anchor.hreflang,
              href: anchor.href,
              path: normalized,
              status: result.status,
              location: result.location,
            });
          }
        }
      }
      ctx.measure('uniqueTargets', [...checked.entries()].map(([path, result]) => ({ path, ...result })));
      ctx.check('全部语言链接目标本地 200（无重定向）', failures.length === 0, { actual: failures.slice(0, 15) });
    },
  });
}

// ---------------------------------------------------------------------------
// 检查 C：sitemap
// ---------------------------------------------------------------------------

function parseSitemapXml(xml) {
  const entries = [];
  for (const match of xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
    const block = match[1];
    const loc = /<loc>\s*([^<\s]+)\s*<\/loc>/i.exec(block)?.[1] ?? null;
    if (!loc) continue;
    const alternates = [];
    for (const linkMatch of block.matchAll(/<xhtml:link\b[^>]*>/gi)) {
      const tag = linkMatch[0];
      const rel = attr(tag, 'rel');
      const hreflang = attr(tag, 'hreflang');
      const href = attr(tag, 'href');
      if ((rel ?? '').toLowerCase() === 'alternate' && hreflang && href) alternates.push({ hreflang, href });
    }
    entries.push({ loc, alternates });
  }
  return entries;
}

async function runSitemapChecks() {
  const response = await checkLocal('/sitemap.xml');
  const sitemapText = await fetch(`${server.url}/sitemap.xml`).then((res) => res.text());
  const entries = parseSitemapXml(sitemapText);
  const locPaths = entries.map((entry) => normalizeSlashes(new URL(entry.loc, PROD_ORIGIN).pathname));
  const uniqueLocPaths = [...new Set(locPaths)];
  const localizedExpected = [...urlSet].filter((url) => languageOf(url) !== 'en');

  await runCase({
    id: 'C1',
    group: 'C-sitemap',
    name: 'sitemap 解析：loc 去重数=94 且与页面清单一致',
    async fn(ctx) {
      const missing = [...urlSet].filter((url) => !uniqueLocPaths.includes(url));
      const extra = uniqueLocPaths.filter((url) => !urlSet.has(url));
      ctx.measure('sitemapStatus', response.status);
      ctx.measure('entries', entries.length);
      ctx.measure('uniqueLocCount', uniqueLocPaths.length);
      ctx.measure('expectedPageCount', urlSet.size);
      ctx.measure('missing', missing.slice(0, 20));
      ctx.measure('extra', extra.slice(0, 20));
      ctx.check('sitemap.xml 本地 200', response.status === 200, { actual: response });
      ctx.check(`loc 去重数 = ${urlSet.size}（实际 ${uniqueLocPaths.length}）`, uniqueLocPaths.length === urlSet.size, {
        actual: { uniqueLocCount: uniqueLocPaths.length, expected: urlSet.size },
      });
      ctx.check('sitemap 覆盖全部可索引页面（无缺漏）', missing.length === 0, { actual: missing.slice(0, 20) });
      ctx.check('sitemap 不含清单外 URL', extra.length === 0, { actual: extra.slice(0, 20) });
    },
  });

  await runCase({
    id: 'C2',
    group: 'C-sitemap',
    name: 'sitemap 每个 loc 本地 200 且非重定向（无 404/308）',
    async fn(ctx) {
      const failures = [];
      for (const path of uniqueLocPaths) {
        const result = await checkLocal(path);
        if (result.status !== 200) failures.push({ path, status: result.status, location: result.location });
      }
      ctx.check(`全部 ${uniqueLocPaths.length} 个 loc 本地 200`, failures.length === 0, {
        actual: { failingCount: failures.length, failures: failures.slice(0, 20) },
      });
    },
  });

  await runCase({
    id: 'C3',
    group: 'C-sitemap',
    name: '68 个本地化 URL 全部出现在 sitemap',
    async fn(ctx) {
      const missing = localizedExpected.filter((url) => !uniqueLocPaths.includes(url));
      ctx.measure('localizedExpectedCount', localizedExpected.length);
      ctx.measure('missingLocalized', missing);
      ctx.check(`本地化 URL 齐全（${localizedExpected.length - missing.length}/${localizedExpected.length}）`, missing.length === 0, {
        actual: missing,
      });
    },
  });

  await runCase({
    id: 'C4',
    group: 'C-sitemap',
    name: 'sitemap hreflang alternates 与页面 head 一致（全量 94）',
    async fn(ctx) {
      const rows = [];
      for (const entry of entries) {
        const url = normalizeSlashes(new URL(entry.loc, PROD_ORIGIN).pathname);
        const page = inventory.get(url);
        if (!page) continue;
        const headMap = new Map(
          page.parsed.hreflangs
            .map((item) => [item.hreflang, canonicalPath(item.href)])
            .filter(([code, path]) => code && path),
        );
        const sitemapMap = new Map(
          entry.alternates
            .map((item) => [item.hreflang, canonicalPath(item.href)])
            .filter(([code, path]) => code && path),
        );
        const diffs = [];
        for (const [code, path] of headMap) {
          if (!sitemapMap.has(code)) diffs.push(`sitemap 缺少 head 中的 ${code}`);
          else if (normalizeSlashes(sitemapMap.get(code)) !== normalizeSlashes(path)) {
            diffs.push(`${code}: sitemap ${sitemapMap.get(code)} ≠ head ${path}`);
          }
        }
        for (const code of sitemapMap.keys()) {
          if (!headMap.has(code)) diffs.push(`sitemap 多出 head 中没有的 ${code}`);
        }
        rows.push({ url, headHreflangs: [...headMap.entries()], sitemapHreflangs: [...sitemapMap.entries()], ok: diffs.length === 0, diffs });
        if (diffs.length > 0) ctx.detail({ url, diffs });
      }
      const failed = rows.filter((row) => !row.ok);
      ctx.measure('checked', rows.length);
      ctx.measure('failedCount', failed.length);
      ctx.check(`sitemap alternates 与 head 一致（${rows.length - failed.length}/${rows.length}）`, failed.length === 0, {
        actual: failed.slice(0, 12),
      });
    },
  });

  await runCase({
    id: 'C5',
    group: 'C-sitemap',
    name: 'sitemap hreflang 互指 + x-default 指向英文版本',
    async fn(ctx) {
      const alternatesByUrl = new Map();
      for (const entry of entries) {
        const url = normalizeSlashes(new URL(entry.loc, PROD_ORIGIN).pathname);
        const map = new Map(
          entry.alternates
            .map((item) => [item.hreflang, normalizeSlashes(canonicalPath(item.href) ?? '')])
            .filter(([code, path]) => code && path),
        );
        alternatesByUrl.set(url, map);
      }
      const problems = [];
      for (const [url, map] of alternatesByUrl) {
        const xDefault = map.get('x-default');
        const enUrl = langUrl('en', basePathOf(url));
        if (!xDefault) problems.push({ url, problem: '缺少 x-default' });
        else if (xDefault !== enUrl) problems.push({ url, problem: `x-default 指向 ${xDefault}，期望 ${enUrl}` });
        for (const [code, target] of map) {
          if (code === 'x-default') continue;
          if (!alternatesByUrl.has(target)) {
            problems.push({ url, problem: `${code} 目标 ${target} 不在 sitemap` });
            continue;
          }
          const targetLang = LANGUAGES.find((lang) => lang.sitemapLang === code)?.key;
          const sourceLang = languageOf(url);
          const targetMap = alternatesByUrl.get(target);
          const back = targetMap.get(LANGUAGE_BY_KEY[sourceLang].sitemapLang);
          if (back !== url) {
            problems.push({ url, problem: `${code} 目标 ${target} 未回指本页（回指 ${back ?? '缺失'}）` });
          }
          if (!targetLang) problems.push({ url, problem: `非法 hreflang 代码 ${code}` });
        }
      }
      ctx.measure('checked', alternatesByUrl.size);
      ctx.measure('problemCount', problems.length);
      ctx.check('sitemap hreflang 互指且 x-default 指向英文版本', problems.length === 0, {
        actual: problems.slice(0, 15),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// 检查 D：head 元数据（静态，全量 94）
// ---------------------------------------------------------------------------

async function runHeadChecks() {
  await runCase({
    id: 'D1',
    group: 'D-head',
    name: 'canonical 自引用（全量 94）且目标本地 200',
    async fn(ctx) {
      const rows = [];
      for (const [url, pageInfo] of inventory) {
        const canonical = pageInfo.parsed.canonical;
        const expected = normalizeSlashes(url);
        const actualPath = canonicalPath(canonical);
        const ok = actualPath !== null && normalizeSlashes(actualPath) === expected && canonical && canonical.startsWith(`${PROD_ORIGIN}/`);
        rows.push({ url, canonical, expectedCanonicalPath: expected, ok });
        ctx.detail(rows[rows.length - 1]);
      }
      const failed = rows.filter((row) => !row.ok);
      ctx.measure('pages', rows);
      ctx.measure('failedCount', failed.length);
      ctx.check(`canonical 自引用（${rows.length - failed.length}/${rows.length}）`, failed.length === 0, {
        actual: failed.slice(0, 15),
      });

      const httpFailures = [];
      for (const row of rows) if (row.ok) {
        const result = await checkLocal(normalizeSlashes(row.expectedCanonicalPath));
        if (result.status !== 200) httpFailures.push({ url: row.url, canonical: row.canonical, status: result.status, location: result.location });
      }
      ctx.check('canonical 目标本地 200', httpFailures.length === 0, { actual: httpFailures.slice(0, 15) });
    },
  });

  await runCase({
    id: 'D2',
    group: 'D-head',
    name: 'hreflang 集合=该页语言簇（en/zh-CN/zh-TW/ja/es + x-default，全量 94）',
    async fn(ctx) {
      const rows = [];
      for (const [url, pageInfo] of inventory) {
        const expectedMap = expectedHreflangMapFor(url);
        const actualMap = new Map();
        const duplicateCodes = [];
        for (const item of pageInfo.parsed.hreflangs) {
          const code = item.hreflang;
          const path = canonicalPath(item.href);
          if (actualMap.has(code)) duplicateCodes.push(code);
          actualMap.set(code, path);
        }
        const missing = [];
        const extra = [];
        const wrongTarget = [];
        for (const [code, expectedPath] of expectedMap) {
          if (!actualMap.has(code)) missing.push(code);
          else if (normalizeSlashes(actualMap.get(code) ?? '') !== normalizeSlashes(expectedPath)) {
            wrongTarget.push({ code, actual: actualMap.get(code), expected: expectedPath });
          }
        }
        for (const code of actualMap.keys()) if (!expectedMap.has(code)) extra.push(code);
        const ok = missing.length === 0 && extra.length === 0 && wrongTarget.length === 0 && duplicateCodes.length === 0;
        rows.push({ url, expected: [...expectedMap.entries()], actual: [...actualMap.entries()], missing, extra, wrongTarget, duplicateCodes, ok });
        if (!ok) ctx.detail({ url, missing, extra, wrongTarget, duplicateCodes });
      }
      const failed = rows.filter((row) => !row.ok);
      ctx.measure('checked', rows.length);
      ctx.measure('failedCount', failed.length);
      ctx.check(`hreflang 语言簇完整/正确（${rows.length - failed.length}/${rows.length}）`, failed.length === 0, {
        actual: failed.slice(0, 12),
      });
      const targetCheckFailures = [];
      for (const row of rows) {
        for (const [, path] of row.actual) {
          if (!path) {
            targetCheckFailures.push({ url: row.url, problem: 'hreflang href 无法解析' });
            continue;
          }
          const normalized = normalizeSlashes(path);
          if (!urlSet.has(normalized)) targetCheckFailures.push({ url: row.url, target: normalized, problem: '目标不在页面清单' });
          else {
            const result = await checkLocal(normalized);
            if (result.status !== 200) targetCheckFailures.push({ url: row.url, target: normalized, status: result.status });
          }
        }
      }
      ctx.check('hreflang 目标均存在且本地 200', targetCheckFailures.length === 0, {
        actual: targetCheckFailures.slice(0, 15),
      });
    },
  });

  await runCase({
    id: 'D3',
    group: 'D-head',
    name: '静态 <html lang> 合法（全量 94）+ x-default 不作为 html lang',
    async fn(ctx) {
      const validCodes = new Set(['en', 'en-US', 'zh', 'zh-CN', 'zh-TW', 'zh-Hant', 'ja', 'ja-JP', 'es', 'es-ES', 'es-419']);
      const rows = [];
      for (const [url, pageInfo] of inventory) {
        const langKey = languageOf(url);
        const value = pageInfo.parsed.lang;
        const allowed = expectedHtmlLangs(langKey);
        const ok = Boolean(value) && allowed.includes(value.toLowerCase());
        rows.push({ url, expectedLang: langKey, allowed, actual: value, validCode: validCodes.has(value ?? ''), ok });
        ctx.detail(rows[rows.length - 1]);
      }
      const failed = rows.filter((row) => !row.ok);
      ctx.measure('pages', rows);
      ctx.measure('failedCount', failed.length);
      ctx.check(`静态 html lang 与目录语言一致（${rows.length - failed.length}/${rows.length}）`, failed.length === 0, {
        actual: failed.slice(0, 15),
      });
    },
  });

  await runCase({
    id: 'D4',
    group: 'D-head',
    name: 'canonical 唯一（无两页共用同一 canonical）',
    async fn(ctx) {
      const byCanonical = new Map();
      for (const [url, pageInfo] of inventory) {
        const path = canonicalPath(pageInfo.parsed.canonical);
        if (!byCanonical.has(path)) byCanonical.set(path, []);
        byCanonical.get(path).push(url);
      }
      const duplicates = [...byCanonical.entries()].filter(([, urls]) => urls.length > 1).map(([path, urls]) => ({ canonicalPath: path, urls }));
      ctx.measure('uniqueCanonicalCount', byCanonical.size);
      ctx.check('canonical 全站唯一', duplicates.length === 0, { actual: duplicates.slice(0, 15) });
    },
  });
}

// ---------------------------------------------------------------------------
// 检查 E：内部链接 BFS
// ---------------------------------------------------------------------------

async function runInternalLinkChecks() {
  const allTokens = new Map(); // url -> Set<token>（用于同语言链接语义分析，可选）
  const edges = new Map(); // from -> Set<to>
  /**
   * 语言切换链接判定（不是内容内链，不计入 E4 内容入链/同语言比例）：
   *  1) 旧语言切换器：a.lang-option
   *  2) Phase B 语言导航：a.language-link / [data-language-nav]
   *  3) 语义兜底：指向「同一页面」的另一语言版本（跨语言 + 同 base path）
   */
  const isLanguageSwitchLink = (anchor, sourceUrl, targetUrl) => {
    if (/(?:^|\s)(?:lang-option|language-link)(?:\s|$)/i.test(anchor.className)) return true;
    if (anchor.dataLanguageNav === true) return true;
    return languageOf(targetUrl) !== languageOf(sourceUrl) && basePathOf(targetUrl) === basePathOf(sourceUrl);
  };

  const contentEdges = new Map(); // 排除语言切换链接后的内容边
  let languageSwitchAnchorCount = 0;
  for (const [url, pageInfo] of inventory) {
    const targets = new Set();
    const contentTargets = new Set();
    for (const anchor of pageInfo.parsed.anchors) {
      const target = normalizeHrefToPageUrl(anchor.href, url);
      if (!target || !urlSet.has(target) || target === url) continue;
      targets.add(target);
      if (isLanguageSwitchLink(anchor, url, target)) {
        languageSwitchAnchorCount += 1;
      } else {
        contentTargets.add(target);
      }
    }
    edges.set(url, targets);
    contentEdges.set(url, contentTargets);
  }

  const bfs = (start, graph) => {
    const visited = new Set([start]);
    const queue = [start];
    while (queue.length > 0) {
      const current = queue.shift();
      for (const next of graph.get(current) ?? []) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
    return visited;
  };

  const reachable = bfs('/', edges);
  const unreachable = [...urlSet].filter((url) => !reachable.has(url));

  const inlinksAll = new Map([...urlSet].map((url) => [url, 0]));
  const inlinksContent = new Map([...urlSet].map((url) => [url, 0]));
  for (const [, targets] of edges) for (const target of targets) inlinksAll.set(target, inlinksAll.get(target) + 1);
  for (const [, targets] of contentEdges) for (const target of targets) inlinksContent.set(target, inlinksContent.get(target) + 1);

  const localizedUrls = [...urlSet].filter((url) => languageOf(url) !== 'en');
  const localizedWithoutInlinks = localizedUrls.filter((url) => inlinksAll.get(url) === 0);
  const localizedWithoutContentInlinks = localizedUrls.filter((url) => inlinksContent.get(url) === 0);

  await runCase({
    id: 'E1',
    group: 'E-internal-links',
    name: '从 / 做 BFS：严格全部 94 页可达（严格判定，报告用）',
    async fn(ctx) {
      ctx.measure('reachableCount', reachable.size);
      ctx.measure('expectedCount', urlSet.size);
      ctx.measure('unreachable', unreachable.slice(0, 40));
      ctx.check(`BFS 可达全部 ${urlSet.size} 页（严格；实际 ${reachable.size}/${urlSet.size}）`, unreachable.length === 0, {
        level: 'WARN',
        actual: { reachable: reachable.size, unreachable: unreachable.slice(0, 40) },
      });
    },
  });

  await runCase({
    id: 'E2',
    group: 'E-internal-links',
    name: '每个本地化页 ≥1 入链（含语言切换器链接；最低验收判定）',
    async fn(ctx) {
      ctx.measure('localizedCount', localizedUrls.length);
      ctx.measure('localizedWithoutInlinks', localizedWithoutInlinks);
      ctx.measure('inlinkCounts', localizedUrls.map((url) => ({ url, inlinks: inlinksAll.get(url) })));
      ctx.check(
        `每个本地化页至少有 1 个站内入链（${localizedUrls.length - localizedWithoutInlinks.length}/${localizedUrls.length}）`,
        localizedWithoutInlinks.length === 0,
        { actual: localizedWithoutInlinks },
      );
    },
  });

  await runCase({
    id: 'E3',
    group: 'E-internal-links',
    name: '内容型入链（排除语言切换器链接）覆盖（辅助项）',
    async fn(ctx) {
      ctx.measure('localizedWithoutContentInlinks', localizedWithoutContentInlinks);
      ctx.check(
        `排除语言切换器后每个本地化页仍有 ≥1 内容型入链（${localizedUrls.length - localizedWithoutContentInlinks.length}/${localizedUrls.length}）`,
        localizedWithoutContentInlinks.length === 0,
        { level: 'WARN', actual: localizedWithoutContentInlinks },
      );
    },
  });

  await runCase({
    id: 'E4',
    group: 'E-internal-links',
    name: '本地化页内链同语言比例（参考项，Phase B 背景目标）',
    async fn(ctx) {
      const rows = [];
      for (const url of localizedUrls) {
        const langKey = languageOf(url);
        const targets = [...edges.get(url) ?? []];
        if (targets.length === 0) {
          rows.push({ url, langKey, internalLinks: 0, sameLanguageLinks: 0, ratio: null });
          continue;
        }
        const contentTargets = [...contentEdges.get(url) ?? []];
        const sameLanguage = contentTargets.filter((target) => languageOf(target) === langKey);
        rows.push({
          url,
          langKey,
          contentInternalLinks: contentTargets.length,
          sameLanguageContentLinks: sameLanguage.length,
          ratio: contentTargets.length > 0 ? Number((sameLanguage.length / contentTargets.length).toFixed(3)) : null,
        });
      }
      const measurable = rows.filter((row) => row.ratio !== null);
      ctx.measure('languageSwitchAnchorsExcluded', languageSwitchAnchorCount);
      const averageRatio = measurable.length > 0 ? measurable.reduce((sum, row) => sum + row.ratio, 0) / measurable.length : 0;
      ctx.measure('pages', rows);
      ctx.measure('averageSameLanguageRatio', Number(averageRatio.toFixed(3)));
      ctx.check(
        `本地化页内容内链同语言平均比例 ≥ 0.8（实际 ${averageRatio.toFixed(3)}）`,
        averageRatio >= 0.8,
        { level: 'WARN', actual: measurable.filter((row) => row.ratio < 0.8).slice(0, 20) },
      );
    },
  });
}

// ---------------------------------------------------------------------------
// 检查 F：robots.txt
// ---------------------------------------------------------------------------

async function runRobotsChecks() {
  await runCase({
    id: 'F1',
    group: 'F-robots',
    name: 'robots.txt：无 ?lang= Disallow、Sitemap 行存在且可达',
    async fn(ctx) {
      let result;
      try {
        const response = await fetch(`${server.url}/robots.txt`);
        result = { status: response.status, text: await response.text() };
      } catch (error) {
        result = { status: 0, text: '', error: String(error?.message || error) };
      }
      const lines = result.text.split(/\r?\n/);
      const disallowLines = lines.filter((line) => /^\s*disallow\s*:/i.test(line));
      const langDisallow = disallowLines.filter((line) => /\?lang=/i.test(line));
      const sitemapLines = lines.filter((line) => /^\s*sitemap\s*:\s*https?:\/\/\S+/i.test(line));
      const sitemapUrl = sitemapLines[0]?.split(':').slice(1).join(':').trim() ?? null;
      let sitemapLocal = null;
      if (sitemapUrl) {
        try {
          sitemapLocal = await checkLocal(new URL(sitemapUrl).pathname);
        } catch {
          sitemapLocal = { status: 0 };
        }
      }
      ctx.measure('robotsStatus', result.status);
      ctx.measure('disallowLines', disallowLines);
      ctx.measure('langDisallowLines', langDisallow);
      ctx.measure('sitemapLines', sitemapLines);
      ctx.measure('sitemapLocal', sitemapLocal);
      ctx.check('robots.txt 本地 200', result.status === 200, { actual: result.status });
      ctx.check('robots.txt 不含 Disallow: /*?lang=', langDisallow.length === 0, { actual: langDisallow });
      ctx.check('robots.txt 含 Sitemap 行', sitemapLines.length > 0, { actual: sitemapLines });
      ctx.check('Sitemap URL 本地可达（200）', sitemapLocal?.status === 200, { actual: { sitemapUrl, sitemapLocal } });
    },
  });
}

// ---------------------------------------------------------------------------
// 报告
// ---------------------------------------------------------------------------

function summarize() {
  const byGroup = {};
  const totals = { PASS: 0, FAIL: 0, WARN: 0, total: 0 };
  for (const result of results) {
    const bucket = (byGroup[result.group] ??= { PASS: 0, FAIL: 0, WARN: 0, total: 0 });
    bucket[result.status] += 1;
    bucket.total += 1;
    totals[result.status] += 1;
    totals.total += 1;
  }
  totals.verdict = totals.FAIL > 0 ? 'FAIL' : 'PASS';
  return { byGroup, totals };
}

const GROUP_TITLES = {
  env: '环境与快照',
  'A-rendered-lang': 'A. 渲染后语言 / title / description',
  'B-switcher': 'B. 语言切换器',
  'C-sitemap': 'C. sitemap',
  'D-head': 'D. head 元数据（canonical / hreflang）',
  'E-internal-links': 'E. 内部链接可达性',
  'F-robots': 'F. robots.txt',
};
const GROUP_ORDER = Object.keys(GROUP_TITLES);

function renderMarkdown(report) {
  const out = [];
  const totals = report.summary.totals;
  out.push(`# Phase B-2：多语言 / SEO 浏览器验证报告（${report.meta.label}）`);
  out.push('');
  out.push('> 自动生成：`node scripts/seo-audit/run-seo-checks.mjs`（零依赖：Chrome headless + CDP WebSocket + 本地 Vercel 模拟服务器）。');
  out.push('> 被测对象 = 当前工作区站点文件；渲染检查通过本地静态服务器加载（URL 与线上路径一致）。本工具只读站点文件。');
  out.push('');
  out.push('## 1. 环境与快照');
  out.push('');
  out.push('| 项目 | 值 |');
  out.push('|---|---|');
  out.push(`| 生成时间 | ${report.meta.generatedAt} |`);
  out.push(`| 标签 | \`${report.meta.label}\` |`);
  out.push(`| 分支 / HEAD | \`${report.meta.git.branch}\` / \`${report.meta.git.head.slice(0, 12)}\` |`);
  out.push(
    `| 工作区状态 | dirty 文件 ${report.meta.git.dirtyFiles} 个；路径 digest \`${report.meta.git.dirtyDigest}\`；内容 digest \`${report.meta.git.dirtyContentDigest}\`（diff ${report.meta.git.dirtyDiffBytes} B）${report.meta.git.dirtyFiles > 0 ? '（被测状态 = 未提交工作区）' : ''} |`,
  );
  out.push(`| Chrome | ${report.meta.chrome} |`);
  out.push(`| Node / 平台 | ${report.meta.node} / ${report.meta.platform} |`);
  out.push(`| 本地服务 | \`${report.meta.server}\`（Vercel 路由模拟） |`);
  out.push(`| 页面清单 | 可索引 ${report.meta.pageCount} 页（本地化 ${report.meta.localizedCount} + 英文 ${report.meta.enCount}）；渲染检查 ${report.meta.renderedCount} 页 |`);
  out.push(`| 运行时长 | ${(report.meta.durationMs / 1000).toFixed(1)} s |`);
  out.push('');
  out.push(`## 2. 结论摘要`);
  out.push('');
  out.push(`**总体：${totals.verdict}** —— PASS ${totals.PASS} / FAIL ${totals.FAIL} / WARN ${totals.WARN}（共 ${totals.total} 个用例）`);
  out.push('');
  out.push('| 分组 | PASS | FAIL | WARN | 合计 |');
  out.push('|---|---|---|---|---|');
  for (const group of GROUP_ORDER) {
    const bucket = report.summary.byGroup[group];
    if (!bucket) continue;
    out.push(`| ${GROUP_TITLES[group]} | ${bucket.PASS} | ${bucket.FAIL} | ${bucket.WARN} | ${bucket.total} |`);
  }
  out.push('');

  const failures = report.results.filter((result) => result.status === 'FAIL');
  out.push('## 3. FAIL 明细');
  out.push('');
  if (failures.length === 0) out.push('无自动断言失败。');
  for (const failure of failures) {
    out.push(`### ❌ \`${failure.id}\` ${failure.name}`);
    out.push('');
    for (const assertion of failure.assertions.filter((item) => item.status === 'FAIL')) {
      out.push(`- **${assertion.label}**`);
      out.push(`  - 实际：${formatActual(assertion.actual)}`);
    }
    if (failure.screenshots.length > 0) out.push(`- 截图：${failure.screenshots.map((path) => `[\`${path.split('/').pop()}\`](../${path})`).join('、')}`);
    if (failure.htmlSnapshots.length > 0) out.push(`- HTML 快照：${failure.htmlSnapshots.map((path) => `[\`${path.split('/').pop()}\`](../${path})`).join('、')}`);
    // 只输出前 10 条 per-page 细节，避免报告过长
    const detailEntries = Array.isArray(failure.measurements?.pages)
      ? failure.measurements.pages.filter((row) => row.ok === false).slice(0, 10)
      : [];
    if (detailEntries.length > 0) {
      out.push('- 失败页面（前 10 条）：');
      for (const entry of detailEntries) {
        out.push(`  - \`${entry.url ?? entry.path ?? '?'}\`：${formatActual(entry.problems ?? entry)}`);
      }
    }
    out.push('');
  }

  const warnings = report.results.filter((result) => result.status === 'WARN');
  out.push('## 4. WARN / 需人工确认');
  out.push('');
  if (warnings.length === 0) out.push('无。');
  for (const warning of warnings) {
    out.push(`### ⚠️ \`${warning.id}\` ${warning.name}`);
    for (const assertion of warning.assertions.filter((item) => item.status === 'WARN')) {
      out.push(`- ${assertion.label} — 实际：${formatActual(assertion.actual)}`);
    }
    out.push('');
  }

  out.push('## 5. 全部用例');
  out.push('');
  out.push('| 用例 | 分组 | 结果 | 用时 | 断言（PASS/WARN/FAIL） |');
  out.push('|---|---|---|---|---|');
  for (const result of report.results) {
    const count = (status) => result.assertions.filter((assertion) => assertion.status === status).length;
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    out.push(`| \`${result.id}\` ${result.name} | ${result.group} | ${icon} ${result.status} | ${result.durationMs}ms | ${count('PASS')}/${count('WARN')}/${count('FAIL')} |`);
  }
  out.push('');

  out.push('## 6. 关键实测数据');
  out.push('');
  for (const result of report.results) {
    const keys = Object.keys(result.measurements ?? {});
    if (keys.length === 0) continue;
    out.push(`### \`${result.id}\` ${result.name}`);
    out.push('');
    out.push('```json');
    out.push(JSON.stringify(result.measurements, null, 2).slice(0, 12000));
    out.push('```');
    out.push('');
  }

  out.push('## 7. 复跑方式');
  out.push('');
  out.push('```bash');
  out.push('# 在本仓库根目录直接运行（自动启停 headless Chrome + 本地服务器，清理临时 profile）');
  out.push('node scripts/seo-audit/run-seo-checks.mjs --label baseline   # 基线（当前工作区状态）');
  out.push('node scripts/seo-audit/run-seo-checks.mjs --label final      # Lead 宣布实现完成后复跑');
  out.push('```');
  out.push('');
  out.push('退出码：`0` = 无 FAIL（允许 WARN）；`1` = 存在 FAIL；`2` = 环境/运行错误。');
  out.push('');
  out.push('## 8. 已知限制');
  out.push('');
  out.push('- 可见正文语言判定为启发式：相似度（拉丁 token Jaccard）<0.3 **或** 目标语言字符/西语词占比阈值；局部未翻译段落不单独判 FAIL（属内容质量，非本 harness 范围）。');
  out.push('- 只覆盖 sitemap 声明的 94 个可索引页面与任务列出的 25 个渲染检查页；其他页面仅静态检查。');
  out.push('- 本地服务器模拟 Vercel 路由（cleanUrls/trailingSlash/tools rewrite/404），与线上 Cloudflare 边缘行为可能存在差异；本阶段不上线验证。');
  out.push('- 不检查线上 Cloudflare/Vercel 实际响应、GA/AdSense、内容质量/翻译准确性。');
  out.push('- 工作区可能正在被 Lead 修改：报告头部记录了 dirty 文件数与 digest；基线结论以该快照为准。');
  out.push('');
  return out.join('\n');
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

async function main() {
  const cli = parseCli();
  const startedAt = performance.now();
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  rmSync(SHOTS_DIR, { recursive: true, force: true });
  rmSync(HTML_SNAPSHOT_DIR, { recursive: true, force: true });
  mkdirSync(SHOTS_DIR, { recursive: true });
  mkdirSync(HTML_SNAPSHOT_DIR, { recursive: true });

  if (!existsSync(join(ROOT, 'index.html'))) throw new Error(`不是 MeCollage 仓库根目录：${ROOT}`);

  // 1) 页面清单 / 静态解析
  const relFiles = walkHtmlFiles(ROOT).filter((rel) => rel.split(sep).join('/') !== '404.html');
  inventory = new Map();
  for (const rel of relFiles) {
    const url = urlForFile(rel);
    if (inventory.has(url)) throw new Error(`URL 映射冲突：${rel} → ${url}`);
    const html = readFileSync(join(ROOT, rel), 'utf8');
    inventory.set(url, {
      rel,
      url,
      langKey: languageOf(url),
      basePath: basePathOf(url),
      parsed: parseStaticHtml(html),
    });
  }
  urlSet = new Set(inventory.keys());
  console.log(`[setup] 页面清单：${inventory.size} 个可索引页面（本地化 ${[...urlSet].filter((url) => languageOf(url) !== 'en').length}）`);

  // 2) 快照信息
  const gitHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  const gitBranch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  const gitStatus = execFileSync('git', ['status', '--porcelain=v1'], { cwd: ROOT, encoding: 'utf8' });
  const gitDiff = execFileSync('git', ['diff'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 });
  const dirtyFiles = gitStatus.split('\n').filter((line) => line.trim().length > 0).length;
  const dirtyDigest = sha(gitStatus).slice(0, 12);
  const dirtyContentDigest = sha(gitDiff).slice(0, 12);
  const meta = {
    label: cli.label,
    generatedAt: new Date().toISOString(),
    git: {
      head: gitHead,
      branch: gitBranch,
      dirtyFiles,
      dirtyDigest,
      dirtyContentDigest,
      dirtyDiffBytes: Buffer.byteLength(gitDiff),
    },
    pageCount: inventory.size,
    localizedCount: [...urlSet].filter((url) => languageOf(url) !== 'en').length,
    enCount: [...urlSet].filter((url) => languageOf(url) === 'en').length,
    renderedCount: RENDERED_URLS.length,
    chrome: null,
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    server: null,
    viewport: VIEWPORT,
    durationMs: 0,
  };

  // 3) 本地服务器 + Chrome
  server = await startStaticServer({ root: ROOT });
  chrome = await launchChrome({ width: VIEWPORT.width, height: VIEWPORT.height });
  page = await ChromePage.connect(chrome.pageWsUrl);
  await page.enableDomains({ blockedUrls: BLOCKED_URLS, width: VIEWPORT.width, height: VIEWPORT.height });
  meta.server = server.url;
  meta.chrome = chrome.browserVersion;
  console.log(`[setup] 本地服务 ${server.url} · ${chrome.browserVersion}`);

  await runCase({
    id: 'ENV-01',
    group: 'env',
    name: '环境与快照信息',
    async fn(ctx) {
      ctx.measure('git', meta.git);
      ctx.measure('pageCount', meta.pageCount);
      ctx.measure('localizedCount', meta.localizedCount);
      ctx.measure('enCount', meta.enCount);
      ctx.measure('renderedCount', meta.renderedCount);
      ctx.measure('chrome', meta.chrome);
      ctx.measure('server', meta.server);
      ctx.measure('blockedUrls', BLOCKED_URLS);
      ctx.check('页面清单 = 94 个可索引页面', meta.pageCount === 94, { actual: meta.pageCount });
      ctx.check('语言目录页面 = 68 个', meta.localizedCount === 68, { actual: meta.localizedCount });
      ctx.check('工作区快照已记录（dirty 文件数/digest）', meta.git.dirtyDigest.length === 12, { actual: meta.git });
    },
  });

  // 4) 渲染检查（A/B 使用）
  console.log(`[run] 渲染 ${RENDERED_URLS.length} 个页面…`);
  await runRenderedChecks();
  await runSwitcherChecks();
  await runSitemapChecks();
  await runHeadChecks();
  await runInternalLinkChecks();
  await runRobotsChecks();

  // 渲染证据清单（截图 + HTML 快照）补入 ENV-01 的 measurements（供报告/JSON 定位）
  const envCase = results.find((result) => result.id === 'ENV-01');
  if (envCase) {
    envCase.measurements.renderedEvidence = [...renderedData.values()].map((data) => ({
      url: data.path,
      screenshot: data.screenshot,
      htmlSnapshot: data.htmlSnapshot,
    }));
  }

  // 5) 报告
  const summary = summarize();
  meta.durationMs = Math.round(performance.now() - startedAt);
  // 清理单次运行内过大的重复数据（页面明细保留在 measurements 中）
  const report = {
    tool: 'seo-audit',
    version: '1.0.0',
    meta,
    summary,
    results,
  };
  writeFileSync(cli.jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(cli.mdPath, renderMarkdown(report), 'utf8');
  if (cli.label) {
    writeFileSync(join(dirname(cli.jsonPath), `seo-report-${safeName(cli.label)}.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    writeFileSync(join(dirname(cli.mdPath), `seo-report-${safeName(cli.label)}.md`), renderMarkdown(report), 'utf8');
  }

  console.log('');
  console.log('='.repeat(72));
  console.log(`Phase B-2 SEO 检查完成：PASS ${summary.totals.PASS} / FAIL ${summary.totals.FAIL} / WARN ${summary.totals.WARN}（共 ${summary.totals.total}）`);
  for (const failure of results.filter((result) => result.status === 'FAIL')) console.log(`  ❌ ${failure.id} ${failure.name}`);
  console.log(`报告：${relative(ROOT, cli.mdPath)}`);
  console.log(`JSON：${relative(ROOT, cli.jsonPath)}`);
  console.log('='.repeat(72));
  process.exitCode = summary.totals.FAIL > 0 ? 1 : 0;
}

let exitCode = 0;
try {
  await main();
  exitCode = process.exitCode ?? 0;
} catch (error) {
  console.error('[seo-audit] 运行失败：', error);
  exitCode = 2;
} finally {
  try {
    page?.close();
  } catch {
    /* ignore */
  }
  if (chrome) {
    await chrome.close().catch(() => {});
    // 兜底：即使连接异常/进程树逃逸也按 profile 路径清理（防止残留 headless Chrome）
    try {
      spawnSync('pkill', ['-9', '-f', chrome.profileDir]);
    } catch {
      /* ignore */
    }
    try {
      rmSync(chrome.profileDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
  if (server) {
    await server.close().catch(() => {});
  }
  process.exit(exitCode);
}
