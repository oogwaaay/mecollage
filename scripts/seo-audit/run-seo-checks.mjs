#!/usr/bin/env node
/**
 * 多语言 / SEO 浏览器验收 harness（零依赖；Phase B 建立，Phase C/D 更新期望值）
 *
 * 复用 scripts/functional-audit/ 的 CDP 客户端（cdp.mjs）+ 本目录的 Vercel 模拟服务器（server.mjs）。
 *
 * 检查矩阵：
 *   A. 渲染后语言：<html lang>、可见正文语言、title/description 是否与静态 HTML 一致（25 个渲染页）
 *   B. 语言切换器：a.lang-option 数量=5 / href 非 # / hreflang 正确 / 目标本地 200
 *   C. sitemap：loc 去重数 = 期望可索引页（Phase C = 60）、全部本地 200、无 noindex/301 URL、
 *      hreflang alternates 与页面 head 一致且互指
 *   D. head 元数据：可索引页 canonical 自引用且 200/唯一、hreflang 语言簇、静态 html lang 合法
 *   E. 内部链接：从 / 做 BFS；每个本地化可索引页 ≥1 入链；同语言内容内链比例；
 *      不得再链接 301 旧 URL（/square-collage/、/vertical-collage/）
 *   F. robots.txt：无 `Disallow: /*?lang=`、Sitemap 行存在
 *   G. Phase C 内容质量：32 个本地化专题页 noindex（无 hreflang/JSON-LD、200）、
 *      301 重定向（square/vertical）、60 个可索引页 JSON-LD（@graph/类型）、
 *      3 篇 blog 扩写（≥700 词/description ≤160/Article JSON-LD/首页卡片同步）、
 *      全站 description ≤160、本地化首页单一 H1 且为本地语言
 *
 * 用法（仓库根目录）：
 *   node scripts/seo-audit/run-seo-checks.mjs --label phase-c-final --evidence-dir audit/evidence/phase-c
 *
 * 默认证据目录为 audit/evidence/phase-b（Phase B 历史）；Phase C 用 --evidence-dir 指向
 * audit/evidence/phase-c，避免覆盖 Phase B 证据。
 *
 * 输出：<evidence-dir>/seo-report.json / seo-report.md（+ label 快照）、shots/、html/
 * 退出码：0 = 无 FAIL（允许 WARN）；1 = 存在 FAIL；2 = 环境/运行错误。
 *
 * 约束：只读站点文件；不改站点、不 git 写操作、不部署；不为变绿放宽断言。
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { performance } from 'node:perf_hooks';

import { launchChrome, ChromePage } from '../functional-audit/cdp.mjs';
import { startStaticServer } from './server.mjs';

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------
const ROOT = process.cwd();
let EVIDENCE_DIR = resolve(ROOT, 'audit/evidence/phase-b');
let SHOTS_DIR = join(EVIDENCE_DIR, 'shots');
let HTML_SNAPSHOT_DIR = join(EVIDENCE_DIR, 'html');
let DEFAULT_JSON = null;
let DEFAULT_MD = null;

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

/** 渲染检查页：5 个首页 + 5 工具页 × 5 语言 = 30 */
const HOMEPAGE_URLS = ['/', '/zh/', '/es/', '/ja/', '/tw/'];
const TOOL_BASES = ['/tools/square/', '/tools/squarecrop/', '/tools/roundedcorners/', '/tools/blurredframe/', '/tools/aspectratiocalculator/'];
const RENDERED_URLS = [
  ...HOMEPAGE_URLS,
  ...TOOL_BASES.flatMap((base) => LANGUAGES.map((lang) => langUrl(lang.key, base))),
];

/** 正文语言判定阈值（相似度 <0.3 或 目标语言字符/词占比达标） */
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

// ---------------------------------------------------------------------------
// Phase C 验收期望值（内容质量阶段；Phase B 的 94 页期望已作废）
// ---------------------------------------------------------------------------

/**
 * 44 个本地化核心页 + 11 个英文核心页 = 55 个 5 语言簇页面。
 * Phase AR（2026-11-06）：/tools/aspectratiocalculator/ 五语言已上线（英文先上 + 4 语言同批补齐）。
 * expectedHreflangMapFor 按实际存在语言收集，五语言后为完整 5 语言簇。
 */
const CORE_BASES = [
  '/',
  '/about/',
  '/contact/',
  '/privacy/',
  '/terms/',
  '/tools/square/',
  '/tools/squarecrop/',
  '/tools/roundedcorners/',
  '/tools/blurredframe/',
  '/tools/aspectratiocalculator/',
  '/social-media-image-sizes/',
];

/** Phase D：保留索引的 7 个英文专题页（square-collage 已恢复；vertical-collage 仍 301） */
const EN_TOPIC_KEPT_BASES = [
  '/birthday-collage-maker/',
  '/christmas-collage-maker/',
  '/free-collage-maker/',
  '/how-to-make-a-collage/',
  '/instagram-story-collage/',
  '/square-collage/',
  '/vertical-collage/',
  '/wedding-collage-maker/',
];
/** Phase C 已把语言导航改指语言首页的 6 个 root 专题页（square-collage 恢复后仍指向本地化版本，单独检查） */
const ROOT_TOPIC_NAV_RETARGETED = [
  '/birthday-collage-maker/',
  '/christmas-collage-maker/',
  '/free-collage-maker/',
  '/how-to-make-a-collage/',
  '/instagram-story-collage/',
  '/wedding-collage-maker/',
];

/** 32 个本地化专题页（8 专题 × 4 语言）→ noindex、无 hreflang、无 JSON-LD、不进 sitemap */
const LOCALIZED_NOINDEX_TOPIC_BASES = [
  '/birthday-collage-maker/',
  '/christmas-collage-maker/',
  '/free-collage-maker/',
  '/how-to-make-a-collage/',
  '/instagram-story-collage/',
  '/square-collage/',
  '/vertical-collage/',
  '/wedding-collage-maker/',
];
const LOCALIZED_NOINDEX_LANGS = ['zh', 'tw', 'ja', 'es'];

/** Phase D：只保留 vertical-collage 的 2 条 301/308（square-collage 已恢复为独立索引页） */
const LEGACY_REDIRECTS = [];
const LEGACY_PAGE_URLS = [];

/** Phase D：工具意图区隔（square = fill/blur/color/resize 不裁剪；squarecrop = crop 1:1） */
const TOOL_INTENT_BASES = { square: '/tools/square/', squarecrop: '/tools/squarecrop/' };
const EN_TOOL_INTENT_SIGNALS = {
  square: /(fill|blur|color|resize|no crop|without cropping)/i,
  squarecrop: /crop/i,
};
/** Phase D / 2026-11-12：sitemap 中 square/squarecrop 10 页的 lastmod 期望（EN 为 Phase D 日期，本地化页 2026-11-12 内容修复） */
const TOOL_LASTMOD_EXPECTED = Object.fromEntries(
  LANGUAGES.flatMap((lang) =>
    Object.values(TOOL_INTENT_BASES).map((base) => [
      langUrl(lang.key, base),
      lang.key === 'en' ? '2026-11-06' : '2026-11-12',
    ]),
  ),
);

/** 3 篇 Phase C 扩写 blog（URL 不变，不 301） */
const BLOG_CONTENT_POSTS = [
  '/blog/custom-grid-layout-feature/',
  '/blog/ai-powered-enhancements/',
  '/blog/how-to-make-photo-collage/',
];
const BLOG_MIN_WORDS = 700;
const DESCRIPTION_MAX = 160;

/** 各页面类别 JSON-LD 必须包含的类型（全部要求有 @graph） */
const JSONLD_REQUIRED_TYPES = {
  home: ['WebSite', 'SoftwareApplication'],
  tool: ['SoftwareApplication', 'FAQPage'],
  blog: ['Article', 'BreadcrumbList'],
  other: ['WebPage', 'BreadcrumbList'],
};

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
    console.log(
      '用法：node scripts/seo-audit/run-seo-checks.mjs [--label <name>] [--evidence-dir <dir>] [--json <path>] [--md <path>]',
    );
    process.exit(0);
  }
  const evidenceDirArg = get('--evidence-dir');
  if (evidenceDirArg) {
    EVIDENCE_DIR = resolve(ROOT, evidenceDirArg);
    SHOTS_DIR = join(EVIDENCE_DIR, 'shots');
    HTML_SNAPSHOT_DIR = join(EVIDENCE_DIR, 'html');
  }
  DEFAULT_JSON = join(EVIDENCE_DIR, 'seo-report.json');
  DEFAULT_MD = join(EVIDENCE_DIR, 'seo-report.md');
  return {
    label: get('--label') || 'run',
    evidenceDir: EVIDENCE_DIR,
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
  let robots = null;
  for (const metaTag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    const name = (attr(metaTag, 'name') ?? '').toLowerCase();
    if (name === 'description') description = attr(metaTag, 'content');
    if (name === 'robots') robots = attr(metaTag, 'content');
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

  const h1s = [];
  for (const match of html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)) {
    h1s.push(
      decodeEntities(match[1].replace(/<[^>]+>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim(),
    );
  }

  const jsonLdBlocks = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    jsonLdBlocks.push(match[1].trim());
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

  const robotsContent = (robots ?? '').toLowerCase();
  return {
    lang: langValue,
    title: titleMatch ? decodeEntities(titleMatch[1]).replace(/\s+/g, ' ').trim() : null,
    description,
    robots,
    noindex: robotsContent.includes('noindex'),
    canonical,
    hreflangs,
    h1s,
    jsonLdBlocks,
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
let inventory = null; // Map<url, {rel,url,langKey,basePath,parsed}>
let urlSet = null; // 全部非 404 页面
let httpCache = null;
let indexableSet = null; // 应索引页面（= sitemap 期望集合）
let noindexSet = null; // 带 meta robots noindex 的页面
let redirectedPageUrls = null; // 被 301 的旧页面（文件仍存在）
let expectedSitemapSet = null; // Phase C 期望 sitemap 集合（60）
let expectedNoindexSet = null; // Phase C 期望 noindex 集合（32）
let siteLinkEdges = null; // E 检查构建的站内链接图（供 H3 统计入链）

async function checkLocal(path) {
  if (!httpCache) httpCache = new Map();
  if (httpCache.has(path)) return httpCache.get(path);
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
  httpCache.set(path, promise);
  return promise;
}

function expectedHtmlLangs(langKey) {
  return LANGUAGE_BY_KEY[langKey].htmlLang.map((value) => value.toLowerCase());
}

/** 可索引语言簇里的期望 hreflang 映射（noindex / 301 页面不参与 alternates） */
function expectedHreflangMapFor(url) {
  const base = basePathOf(url);
  const map = new Map();
  const enUrl = langUrl('en', base);
  if (!indexableSet || !indexableSet.has(enUrl)) return map;
  map.set('x-default', enUrl);
  for (const lang of LANGUAGES) {
    const candidate = langUrl(lang.key, base);
    if (indexableSet.has(candidate)) map.set(lang.sitemapLang, candidate);
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

/** Phase C 期望 sitemap 集合：45 个核心 5 语言页 + 9 个英文 blog + 6 个保留英文专题 = 60 */
function buildExpectedSitemapSet(inventoryMap) {
  const set = new Set();
  for (const base of CORE_BASES) {
    for (const lang of LANGUAGES) {
      const url = langUrl(lang.key, base);
      if (inventoryMap.has(url)) set.add(url);
    }
  }
  for (const url of inventoryMap.keys()) {
    if (url === '/blog/' || /^\/blog\/[^/]+\/$/.test(url)) set.add(url);
  }
  for (const base of EN_TOPIC_KEPT_BASES) if (inventoryMap.has(base)) set.add(base);
  return set;
}

/** Phase C 期望 noindex 集合：8 个本地化专题 × 4 语言 = 32 */
function buildExpectedNoindexSet() {
  const set = new Set();
  for (const base of LOCALIZED_NOINDEX_TOPIC_BASES) {
    for (const langKey of LOCALIZED_NOINDEX_LANGS) {
      set.add(langUrl(langKey, base));
    }
  }
  return set;
}

function isHomeUrl(url) {
  return url === '/' || /^\/(zh|tw|ja|es)\/$/.test(url);
}

/** JSON-LD 页面类别：home / tool / blog / other */
function jsonLdCategory(url) {
  if (isHomeUrl(url)) return 'home';
  if (url.includes('/tools/')) return 'tool';
  if (url.startsWith('/blog/')) return 'blog';
  return 'other';
}

/** 解析页面内全部 JSON-LD block（记录解析错误） */
function parseJsonLdBlocks(parsed) {
  return (parsed.jsonLdBlocks ?? []).map((raw) => {
    try {
      const object = JSON.parse(raw);
      const graph = Array.isArray(object?.['@graph']) ? object['@graph'] : null;
      const types = graph
        ? graph.flatMap((node) => (Array.isArray(node?.['@type']) ? node['@type'] : [node?.['@type']])).filter(Boolean)
        : [];
      return { ok: true, object, hasGraph: Boolean(graph && graph.length > 0), graph, types };
    } catch (error) {
      return { ok: false, error: String(error?.message || error) };
    }
  });
}

/** FAQ 问句语义：Question.name / 可见 FAQ 标题必须以问号结尾（L-42） */
function normalizeFaqText(value) {
  return decodeEntities(String(value ?? ''))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isQuestionText(value) {
  const text = normalizeFaqText(value);
  if (!text) return false;
  return /[?？]$/.test(text);
}

/** 可见 FAQ 问题标题（兼容 h3.faq-question 与 button.faq-question > span.faq-question-text） */
function visibleFaqQuestions(html) {
  const heading = [...html.matchAll(/<(h[1-6])[^>]*class="[^"]*faq-question[^"]*"[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((match) => normalizeFaqText(match[2]))
    .filter(Boolean);
  if (heading.length > 0) return heading;
  return [...html.matchAll(/<span[^>]*class="[^"]*faq-question-text[^"]*"[^>]*>([\s\S]*?)<\/span>/gi)]
    .map((match) => normalizeFaqText(match[1]))
    .filter(Boolean);
}

/** 页面 FAQPage JSON-LD 里的 Question.name（按顺序） */
function jsonLdFaqQuestions(parsed) {
  const questions = [];
  for (const block of parseJsonLdBlocks(parsed ?? {})) {
    for (const node of block.graph ?? []) {
      if (node?.['@type'] !== 'FAQPage') continue;
      for (const question of node.mainEntity ?? []) {
        if (question?.name) questions.push(normalizeFaqText(question.name));
      }
    }
  }
  return questions;
}

/** 去标签后的可见文本（静态 HTML） */
function staticVisibleText(html) {
  const withoutHidden = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  const text = withoutHidden.replace(/<[^>]+>/g, ' ');
  return decodeEntities(text).replace(/\s+/g, ' ').trim();
}

function countWords(text) {
  return (String(text).match(/[A-Za-z0-9\u00C0-\u024F]+/g) ?? []).length;
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
    h1s: [...document.querySelectorAll('h1')].map((el) => (el.textContent || '').replace(/\\s+/g, ' ').trim()),
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
    name: '渲染后 <html lang> 与目录语言一致（30 页）',
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
    name: '语言切换器：a.lang-option 数量=5 / href 非 # / hreflang 正确 / 指向语言簇正确 URL（30 页）',
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
    const lastmod = /<lastmod>\s*([^<\s]+)\s*<\/lastmod>/i.exec(block)?.[1] ?? null;
    const alternates = [];
    for (const linkMatch of block.matchAll(/<xhtml:link\b[^>]*>/gi)) {
      const tag = linkMatch[0];
      const rel = attr(tag, 'rel');
      const hreflang = attr(tag, 'hreflang');
      const href = attr(tag, 'href');
      if ((rel ?? '').toLowerCase() === 'alternate' && hreflang && href) alternates.push({ hreflang, href });
    }
    entries.push({ loc, lastmod, alternates });
  }
  return entries;
}

async function runSitemapChecks() {
  const response = await checkLocal('/sitemap.xml');
  const sitemapText = await fetch(`${server.url}/sitemap.xml`).then((res) => res.text());
  const entries = parseSitemapXml(sitemapText);
  const locPaths = entries.map((entry) => normalizeSlashes(new URL(entry.loc, PROD_ORIGIN).pathname));
  const uniqueLocPaths = [...new Set(locPaths)];
  const localizedIndexable = [...expectedSitemapSet].filter((url) => languageOf(url) !== 'en');

  await runCase({
    id: 'C1',
    group: 'C-sitemap',
    name: `sitemap 解析：loc 去重数 = 期望可索引页（Phase D = ${expectedSitemapSet.size}）且集合完全一致`,
    async fn(ctx) {
      const missing = [...expectedSitemapSet].filter((url) => !uniqueLocPaths.includes(url));
      const extra = uniqueLocPaths.filter((url) => !expectedSitemapSet.has(url));
      ctx.measure('sitemapStatus', response.status);
      ctx.measure('entries', entries.length);
      ctx.measure('uniqueLocCount', uniqueLocPaths.length);
      ctx.measure('expectedCount', expectedSitemapSet.size);
      ctx.measure('missing', missing);
      ctx.measure('extra', extra);
      ctx.check('sitemap.xml 本地 200', response.status === 200, { actual: response });
      ctx.check(`loc 去重数 = ${expectedSitemapSet.size}（实际 ${uniqueLocPaths.length}）`, uniqueLocPaths.length === expectedSitemapSet.size, {
        actual: { uniqueLocCount: uniqueLocPaths.length, expected: expectedSitemapSet.size },
      });
      ctx.check('sitemap 无缺失 URL', missing.length === 0, { actual: missing });
      ctx.check('sitemap 无多余 URL', extra.length === 0, { actual: extra });
    },
  });

  await runCase({
    id: 'C2',
    group: 'C-sitemap',
    name: 'sitemap 每个 loc 本地 200 且非重定向（无 404/3xx）',
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
    name: `本地化可索引 URL 全部在 sitemap（${localizedIndexable.length} 个核心页）`,
    async fn(ctx) {
      const missing = localizedIndexable.filter((url) => !uniqueLocPaths.includes(url));
      const localizedUnexpected = uniqueLocPaths.filter((url) => languageOf(url) !== 'en' && !localizedIndexable.includes(url));
      ctx.measure('localizedExpectedCount', localizedIndexable.length);
      ctx.measure('missingLocalized', missing);
      ctx.measure('localizedUnexpected', localizedUnexpected);
      ctx.check(`本地化 URL 齐全（${localizedIndexable.length - missing.length}/${localizedIndexable.length}）`, missing.length === 0, {
        actual: missing,
      });
      ctx.check('sitemap 不含计划外的本地化 URL（noindex 专题页等）', localizedUnexpected.length === 0, {
        actual: localizedUnexpected,
      });
    },
  });

  await runCase({
    id: 'C4',
    group: 'C-sitemap',
    name: 'sitemap hreflang alternates 与页面 head 一致（全量 sitemap）',
    async fn(ctx) {
      const rows = [];
      for (const entry of entries) {
        const url = normalizeSlashes(new URL(entry.loc, PROD_ORIGIN).pathname);
        const page = inventory.get(url);
        if (!page) continue;
        const headMap = new Map(
          page.parsed.hreflangs.map((item) => [item.hreflang, canonicalPath(item.href)]).filter(([code, path]) => code && path),
        );
        const sitemapMap = new Map(
          entry.alternates.map((item) => [item.hreflang, canonicalPath(item.href)]).filter(([code, path]) => code && path),
        );
        const diffs = [];
        for (const [code, path] of headMap) {
          if (!sitemapMap.has(code)) diffs.push(`sitemap 缺少 head 中的 ${code}`);
          else if (normalizeSlashes(sitemapMap.get(code)) !== normalizeSlashes(path)) diffs.push(`${code}: sitemap ${sitemapMap.get(code)} ≠ head ${path}`);
        }
        for (const code of sitemapMap.keys()) if (!headMap.has(code)) diffs.push(`sitemap 多出 head 中没有的 ${code}`);
        rows.push({ url, ok: diffs.length === 0, diffs });
        if (diffs.length > 0) ctx.detail({ url, diffs });
      }
      const failed = rows.filter((row) => !row.ok);
      ctx.measure('checked', rows.length);
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
        alternatesByUrl.set(
          url,
          new Map(entry.alternates.map((item) => [item.hreflang, normalizeSlashes(canonicalPath(item.href) ?? '')]).filter(([code, path]) => code && path)),
        );
      }
      const problems = [];
      for (const [url, map] of alternatesByUrl) {
        const enUrl = langUrl('en', basePathOf(url));
        const xDefault = map.get('x-default');
        if (!xDefault) problems.push({ url, problem: '缺少 x-default' });
        else if (xDefault !== enUrl) problems.push({ url, problem: `x-default 指向 ${xDefault}，期望 ${enUrl}` });
        for (const [code, target] of map) {
          if (code === 'x-default') continue;
          if (!alternatesByUrl.has(target)) {
            problems.push({ url, problem: `${code} 目标 ${target} 不在 sitemap` });
            continue;
          }
          const targetLang = LANGUAGES.find((lang) => lang.sitemapLang === code)?.key;
          if (!targetLang) problems.push({ url, problem: `非法 hreflang 代码 ${code}` });
          const sourceLang = languageOf(url);
          const back = alternatesByUrl.get(target).get(LANGUAGE_BY_KEY[sourceLang].sitemapLang);
          if (back !== url) problems.push({ url, problem: `${code} 目标 ${target} 未回指本页（回指 ${back ?? '缺失'}）` });
        }
      }
      ctx.measure('checked', alternatesByUrl.size);
      ctx.check('sitemap hreflang 互指且 x-default 指向英文版本', problems.length === 0, { actual: problems.slice(0, 15) });
    },
  });

  await runCase({
    id: 'C6',
    group: 'C-sitemap',
    name: 'sitemap 不含 noindex / 301 旧 URL（Phase D 仅 vertical-collage 为 301）',
    async fn(ctx) {
      const noindexInSitemap = uniqueLocPaths.filter((url) => noindexSet.has(url));
      const legacyInSitemap = uniqueLocPaths.filter((url) => LEGACY_PAGE_URLS.includes(url));
      ctx.measure('noindexInSitemap', noindexInSitemap);
      ctx.measure('legacyInSitemap', legacyInSitemap);
      ctx.check('sitemap 不含 noindex 页面', noindexInSitemap.length === 0, { actual: noindexInSitemap });
      ctx.check('sitemap 不含 301 旧 URL', legacyInSitemap.length === 0, { actual: legacyInSitemap });
    },
  });

  await runCase({
    id: 'C7',
    group: 'C-sitemap',
    name: 'sitemap lastmod：square / squarecrop 10 页（EN = 2026-11-06；本地化 = 2026-11-12）',
    async fn(ctx) {
      const byPath = new Map(entries.map((entry) => [normalizeSlashes(new URL(entry.loc, PROD_ORIGIN).pathname), entry]));
      const rows = Object.entries(TOOL_LASTMOD_EXPECTED).map(([url, expected]) => {
        const entry = byPath.get(url);
        return { url, expected, lastmod: entry?.lastmod ?? null, inSitemap: Boolean(entry), ok: Boolean(entry) && entry.lastmod === expected };
      });
      const failed = rows.filter((row) => !row.ok);
      ctx.measure('pages', rows);
      ctx.check(`10 个 square/squarecrop 页 lastmod 符合预期（EN 2026-11-06 / 本地化 2026-11-12）（${rows.length - failed.length}/${rows.length}）`, failed.length === 0, {
        actual: failed,
      });
    },
  });
}

// ---------------------------------------------------------------------------
// 检查 I：FAQ 问句语义 + 可见 FAQ 与 JSON-LD 一致（Phase AR / L-42）
// ---------------------------------------------------------------------------
async function runFaqChecks() {
  const rows = [];
  for (const [url, pageInfo] of inventory) {
    let html = '';
    try {
      html = readFileSync(join(ROOT, pageInfo.rel), 'utf8');
    } catch {
      continue;
    }
    const visible = visibleFaqQuestions(html);
    const jsonld = jsonLdFaqQuestions(pageInfo.parsed);
    if (visible.length === 0 && jsonld.length === 0) continue;
    rows.push({ url, visible, jsonld });
  }

  await runCase({
    id: 'I1',
    group: 'I-faq',
    name: 'FAQ 问句语义：可见 FAQ 标题与 FAQPage Question.name 均以问号结尾（L-42）',
    async fn(ctx) {
      const offenders = [];
      for (const row of rows) {
        for (const [source, questions] of [['visible', row.visible], ['jsonld', row.jsonld]]) {
          for (const question of questions) {
            if (!isQuestionText(question)) offenders.push({ url: row.url, source, question });
          }
        }
      }
      ctx.measure('faqPages', rows.length);
      ctx.measure('offenders', offenders);
      ctx.check(`FAQ 问句语义合格（${rows.length} 个 FAQ 页面，0 个陈述句）`, offenders.length === 0, {
        actual: offenders.slice(0, 20),
      });
    },
  });

  await runCase({
    id: 'I2',
    group: 'I-faq',
    name: 'FAQPage JSON-LD 与可见 FAQ 一一对应（数量/顺序/文本，L-27+L-42）',
    async fn(ctx) {
      const mismatches = [];
      let checked = 0;
      for (const row of rows) {
        if (row.jsonld.length === 0) continue;
        checked += 1;
        const problems = [];
        if (row.visible.length === 0) problems.push('有 FAQPage JSON-LD 但没有可见 FAQ');
        else if (row.visible.length !== row.jsonld.length) problems.push(`可见 ${row.visible.length} 条 ≠ JSON-LD ${row.jsonld.length} 条`);
        else {
          for (let i = 0; i < row.visible.length; i += 1) {
            if (row.visible[i] !== row.jsonld[i]) problems.push(`第 ${i + 1} 条不一致：visible=${row.visible[i]} / jsonld=${row.jsonld[i]}`);
          }
        }
        if (problems.length > 0) mismatches.push({ url: row.url, problems });
      }
      ctx.measure('checkedJsonLdFaqPages', checked);
      ctx.measure('mismatches', mismatches);
      ctx.check(`FAQPage 与可见 FAQ 一致（${checked - mismatches.length}/${checked}）`, mismatches.length === 0, {
        actual: mismatches.slice(0, 15),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// 检查 D：head 元数据（静态，全量 94）
// ---------------------------------------------------------------------------
async function runHeadChecks() {
  const indexableUrls = [...expectedSitemapSet];
  await runCase({
    id: 'D1',
    group: 'D-head',
    name: `canonical 自引用（可索引 ${indexableUrls.length} 页）且目标本地 200`,
    async fn(ctx) {
      const rows = [];
      for (const url of indexableUrls) {
        const pageInfo = inventory.get(url);
        const canonical = pageInfo?.parsed.canonical;
        const expected = normalizeSlashes(url);
        const actualPath = canonicalPath(canonical);
        const ok = actualPath !== null && normalizeSlashes(actualPath) === expected && Boolean(canonical && canonical.startsWith(`${PROD_ORIGIN}/`));
        rows.push({ url, canonical, expectedCanonicalPath: expected, ok });
      }
      const failed = rows.filter((row) => !row.ok);
      ctx.measure('pages', rows);
      ctx.check(`canonical 自引用（${rows.length - failed.length}/${rows.length}）`, failed.length === 0, { actual: failed.slice(0, 15) });
      const httpFailures = [];
      for (const row of rows) {
        if (!row.ok) continue;
        const result = await checkLocal(normalizeSlashes(row.expectedCanonicalPath));
        if (result.status !== 200) httpFailures.push({ url: row.url, status: result.status, location: result.location });
      }
      ctx.check('canonical 目标本地 200', httpFailures.length === 0, { actual: httpFailures.slice(0, 15) });
    },
  });

  await runCase({
    id: 'D2',
    group: 'D-head',
    name: 'hreflang 集合 = 可索引语言簇（en/zh-CN/zh-TW/ja/es + x-default；noindex/301 不参与）',
    async fn(ctx) {
      const rows = [];
      for (const url of indexableUrls) {
        const pageInfo = inventory.get(url);
        const expectedMap = expectedHreflangMapFor(url);
        const actualMap = new Map();
        const duplicateCodes = [];
        for (const item of pageInfo.parsed.hreflangs) {
          if (actualMap.has(item.hreflang)) duplicateCodes.push(item.hreflang);
          actualMap.set(item.hreflang, canonicalPath(item.href));
        }
        const missing = [];
        const extra = [];
        const wrongTarget = [];
        for (const [code, expectedPath] of expectedMap) {
          if (!actualMap.has(code)) missing.push(code);
          else if (normalizeSlashes(actualMap.get(code) ?? '') !== normalizeSlashes(expectedPath)) wrongTarget.push({ code, actual: actualMap.get(code), expected: expectedPath });
        }
        for (const code of actualMap.keys()) if (!expectedMap.has(code)) extra.push(code);
        const ok = missing.length === 0 && extra.length === 0 && wrongTarget.length === 0 && duplicateCodes.length === 0;
        rows.push({ url, expected: [...expectedMap.entries()], actual: [...actualMap.entries()], missing, extra, wrongTarget, duplicateCodes, ok });
        if (!ok) ctx.detail({ url, missing, extra, wrongTarget, duplicateCodes });
      }
      const failed = rows.filter((row) => !row.ok);
      ctx.measure('checked', rows.length);
      ctx.check(`hreflang 语言簇完整/正确（${rows.length - failed.length}/${rows.length}）`, failed.length === 0, { actual: failed.slice(0, 12) });
      const targetFailures = [];
      for (const row of rows) {
        for (const [, path] of row.actual) {
          if (!path) {
            targetFailures.push({ url: row.url, problem: 'hreflang href 无法解析' });
            continue;
          }
          const normalized = normalizeSlashes(path);
          if (!indexableSet.has(normalized)) targetFailures.push({ url: row.url, target: normalized, problem: '目标不是可索引页面' });
          else {
            const result = await checkLocal(normalized);
            if (result.status !== 200) targetFailures.push({ url: row.url, target: normalized, status: result.status });
          }
        }
      }
      ctx.check('hreflang 目标均可索引且本地 200', targetFailures.length === 0, { actual: targetFailures.slice(0, 15) });
    },
  });

  await runCase({
    id: 'D3',
    group: 'D-head',
    name: '静态 <html lang> 与目录语言一致（全部非 404 页面）',
    async fn(ctx) {
      const rows = [];
      for (const [url, pageInfo] of inventory) {
        const langKey = languageOf(url);
        const allowed = expectedHtmlLangs(langKey);
        const value = pageInfo.parsed.lang;
        const ok = Boolean(value) && allowed.includes(value.toLowerCase());
        rows.push({ url, expectedLang: langKey, allowed, actual: value, ok });
      }
      const failed = rows.filter((row) => !row.ok);
      ctx.measure('pages', rows.length);
      ctx.check(`静态 html lang 合法（${rows.length - failed.length}/${rows.length}）`, failed.length === 0, { actual: failed.slice(0, 15) });
    },
  });

  await runCase({
    id: 'D4',
    group: 'D-head',
    name: 'canonical 唯一（可索引页无两页共用同一 canonical）',
    async fn(ctx) {
      const byCanonical = new Map();
      for (const url of indexableUrls) {
        const path = canonicalPath(inventory.get(url).parsed.canonical);
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
  const edges = new Map();
  const contentEdges = new Map();
  const isLanguageSwitchLink = (anchor, sourceUrl, targetUrl) => {
    if (/(?:^|\s)(?:lang-option|language-link)(?:\s|$)/i.test(anchor.className)) return true;
    if (anchor.dataLanguageNav === true) return true;
    return languageOf(targetUrl) !== languageOf(sourceUrl) && basePathOf(targetUrl) === basePathOf(sourceUrl);
  };

  let languageSwitchAnchorCount = 0;
  const legacyLinks = [];
  for (const [url, pageInfo] of inventory) {
    const targets = new Set();
    const contentTargets = new Set();
    for (const anchor of pageInfo.parsed.anchors) {
      const target = normalizeHrefToPageUrl(anchor.href, url);
      if (!target) continue;
      if (LEGACY_PAGE_URLS.includes(target)) legacyLinks.push({ page: url, href: anchor.href, target });
      if (!urlSet.has(target) || target === url) continue;
      targets.add(target);
      if (isLanguageSwitchLink(anchor, url, target)) languageSwitchAnchorCount += 1;
      else contentTargets.add(target);
    }
    edges.set(url, targets);
    contentEdges.set(url, contentTargets);
  }
  siteLinkEdges = edges;

  const bfs = (start) => {
    const visited = new Set([start]);
    const queue = [start];
    while (queue.length > 0) {
      const current = queue.shift();
      for (const next of edges.get(current) ?? []) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
    return visited;
  };
  const reachable = bfs('/');
  const unreachableIndexable = [...expectedSitemapSet].filter((url) => !reachable.has(url));

  const inlinksAll = new Map([...urlSet].map((url) => [url, 0]));
  const inlinksContent = new Map([...urlSet].map((url) => [url, 0]));
  for (const [, targets] of edges) for (const target of targets) inlinksAll.set(target, (inlinksAll.get(target) ?? 0) + 1);
  for (const [, targets] of contentEdges) for (const target of targets) inlinksContent.set(target, (inlinksContent.get(target) ?? 0) + 1);

  const localizedIndexable = [...expectedSitemapSet].filter((url) => languageOf(url) !== 'en');
  const localizedWithoutInlinks = localizedIndexable.filter((url) => inlinksAll.get(url) === 0);
  const localizedWithoutContentInlinks = localizedIndexable.filter((url) => inlinksContent.get(url) === 0);

  await runCase({
    id: 'E1',
    group: 'E-internal-links',
    name: `从 / 做 BFS：可索引 ${expectedSitemapSet.size} 页是否全部可达（严格判定，报告用）`,
    async fn(ctx) {
      ctx.measure('reachableCount', reachable.size);
      ctx.measure('expectedIndexableCount', expectedSitemapSet.size);
      ctx.measure('unreachableIndexable', unreachableIndexable);
      ctx.check(`BFS 可达全部 ${expectedSitemapSet.size} 个可索引页（严格）`, unreachableIndexable.length === 0, {
        level: 'WARN',
        actual: { reachable: reachable.size, unreachable: unreachableIndexable },
      });
    },
  });

  await runCase({
    id: 'E2',
    group: 'E-internal-links',
    name: `每个本地化可索引页 ≥1 入链（${localizedIndexable.length} 页；最低验收判定）`,
    async fn(ctx) {
      ctx.measure('localizedCount', localizedIndexable.length);
      ctx.measure('localizedWithoutInlinks', localizedWithoutInlinks);
      ctx.measure('inlinkCounts', localizedIndexable.map((url) => ({ url, inlinks: inlinksAll.get(url) })));
      ctx.check(
        `每个本地化可索引页至少 1 个站内入链（${localizedIndexable.length - localizedWithoutInlinks.length}/${localizedIndexable.length}）`,
        localizedWithoutInlinks.length === 0,
        { actual: localizedWithoutInlinks },
      );
    },
  });

  await runCase({
    id: 'E3',
    group: 'E-internal-links',
    name: '内容型入链（排除语言切换链接）覆盖（辅助项）',
    async fn(ctx) {
      ctx.measure('localizedWithoutContentInlinks', localizedWithoutContentInlinks);
      ctx.check(
        `排除语言切换链接后每个本地化可索引页仍有 ≥1 内容型入链（${localizedIndexable.length - localizedWithoutContentInlinks.length}/${localizedIndexable.length}）`,
        localizedWithoutContentInlinks.length === 0,
        { level: 'WARN', actual: localizedWithoutContentInlinks },
      );
    },
  });

  await runCase({
    id: 'E4',
    group: 'E-internal-links',
    name: '本地化可索引页同语言内容内链比例（参考项）',
    async fn(ctx) {
      const rows = [];
      for (const url of localizedIndexable) {
        const langKey = languageOf(url);
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
      const averageRatio = measurable.length > 0 ? measurable.reduce((sum, row) => sum + row.ratio, 0) / measurable.length : 0;
      ctx.measure('languageSwitchAnchorsExcluded', languageSwitchAnchorCount);
      ctx.measure('pages', rows);
      ctx.measure('averageSameLanguageRatio', Number(averageRatio.toFixed(3)));
      ctx.check(`本地化页内容内链同语言平均比例 ≥ 0.8（实际 ${averageRatio.toFixed(3)}）`, averageRatio >= 0.8, {
        level: 'WARN',
        actual: measurable.filter((row) => row.ratio < 0.8).slice(0, 20),
      });
    },
  });

  await runCase({
    id: 'E5',
    group: 'E-internal-links',
    name: '站内链接：无 301 旧 URL；记录 noindex 内链与 root 专题页语言导航',
    async fn(ctx) {
      ctx.measure('legacyLinks', legacyLinks);
      ctx.check('站内无指向 /square-collage/ 或 /vertical-collage/ 的链接', legacyLinks.length === 0, {
        actual: legacyLinks.slice(0, 20),
      });

      // Phase C 最终改动抽查：可索引页 → noindex 页内链数量（仅记录）
      const linksToNoindex = [];
      for (const [source, targets] of edges) {
        if (!indexableSet.has(source)) continue;
        for (const target of targets) if (noindexSet.has(target)) linksToNoindex.push({ source, target });
      }
      ctx.measure('linksToNoindexCount', linksToNoindex.length);
      ctx.measure('linksToNoindex', linksToNoindex);

      // Phase C 最终改动抽查：root 英文专题页 `.language-links` 的 4 个本地化链接应指向语言首页；
      // 英文链接指向本页自身（或首页）视为正常。
      const homepageTargets = new Set(['/', '/zh/', '/tw/', '/ja/', '/es/']);
      const rootTopicNav = [];
      for (const base of ROOT_TOPIC_NAV_RETARGETED) {
        const pageInfo = inventory.get(base);
        if (!pageInfo) continue;
        const html = readFileSync(join(ROOT, pageInfo.rel), 'utf8');
        const block = /<nav class="language-links"[^>]*>([\s\S]*?)<\/nav>/i.exec(html);
        const hrefs = block ? [...block[1].matchAll(/<a\b[^>]*href="([^"]+)"/gi)].map((match) => normalizeSlashes(match[1])) : [];
        const localizedHrefs = hrefs.filter((href) => /^\/(zh|tw|ja|es)\//.test(href));
        const nonHomepageLocalized = localizedHrefs.filter((href) => !homepageTargets.has(href));
        const toNoindex = hrefs.filter((href) => noindexSet.has(href));
        rootTopicNav.push({ url: base, languageLinks: hrefs, localizedHrefs, nonHomepageLocalized, toNoindex });
      }
      ctx.measure('rootTopicLanguageNav', rootTopicNav);
      const navProblems = rootTopicNav.filter(
        (row) => row.localizedHrefs.length < 4 || row.nonHomepageLocalized.length > 0 || row.toNoindex.length > 0,
      );
      ctx.check('root 英文专题页语言导航：4 个本地化链接均指向语言首页且不指向 noindex 页（Phase C 最终改动抽查）', navProblems.length === 0, {
        level: 'WARN',
        actual: navProblems,
      });
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
// 检查 G：Phase C 内容质量 / 结构化数据 / 301
// ---------------------------------------------------------------------------
async function followLocalRedirects(startPath, maxHops = 5) {
  const chain = [];
  let current = startPath;
  for (let hop = 0; hop < maxHops; hop += 1) {
    const result = await checkLocal(current);
    if (result.status === 301 || result.status === 308) {
      const to = canonicalPath(result.location);
      chain.push({ from: current, status: result.status, to });
      if (!to || to === current) return { chain, finalStatus: null, finalPath: current, loop: true, tooMany: false };
      current = to;
      continue;
    }
    return { chain, finalStatus: result.status, finalPath: current, loop: false, tooMany: false };
  }
  return { chain, finalStatus: null, finalPath: current, loop: false, tooMany: true };
}

async function runPhaseCChecks() {
  // G1：32 个本地化专题页 noindex
  await runCase({
    id: 'G1',
    group: 'G-phase-c',
    name: `本地化专题页 noindex（期望 ${expectedNoindexSet.size} 页：无 hreflang/JSON-LD、本地 200）`,
    async fn(ctx) {
      const rows = [];
      for (const url of expectedNoindexSet) {
        const pageInfo = inventory.get(url);
        const parsed = pageInfo?.parsed;
        const robots = (parsed?.robots ?? '').toLowerCase();
        const local = await checkLocal(url);
        const ok =
          Boolean(pageInfo) &&
          parsed.noindex === true &&
          robots.includes('noindex') &&
          robots.includes('follow') &&
          (parsed.hreflangs?.length ?? -1) === 0 &&
          (parsed.jsonLdBlocks?.length ?? -1) === 0 &&
          local.status === 200;
        const row = {
          url,
          exists: Boolean(pageInfo),
          robots: parsed?.robots ?? null,
          noindex: parsed?.noindex ?? false,
          hreflangCount: parsed?.hreflangs?.length ?? null,
          jsonLdCount: parsed?.jsonLdBlocks?.length ?? null,
          httpStatus: local.status,
          ok,
        };
        rows.push(row);
        ctx.detail(row);
      }
      const failed = rows.filter((row) => !row.ok);
      const missing = [...expectedNoindexSet].filter((url) => !noindexSet.has(url));
      const unexpected = [...noindexSet].filter((url) => !expectedNoindexSet.has(url));
      ctx.measure('pages', rows);
      ctx.measure('failedCount', failed.length);
      ctx.measure('missing', missing);
      ctx.measure('unexpected', unexpected);
      ctx.check(`32 个本地化专题页均 noindex,follow（${rows.length - failed.length}/${rows.length}）`, failed.length === 0, {
        actual: failed.slice(0, 12),
      });
      ctx.check('noindex 集合无缺失', missing.length === 0, { actual: missing });
      ctx.check('无计划外的 noindex 页面', unexpected.length === 0, { actual: unexpected });
    },
  });

  // G2：301/308 重定向（跟随完整链；规范 URL 单跳、无斜杠 URL 允许 2 跳——Vercel trailingSlash 先行，实测行为不判 FAIL）
  await runCase({
    id: 'G2',
    group: 'G-phase-c',
    name: '301/308 重定向：vertical-collage（含无尾斜杠；Phase D 已移除 square 301；Vercel trailingSlash 先行导致的 2 跳不判 FAIL）',
    async fn(ctx) {
      const rows = [];
      for (const redirect of LEGACY_REDIRECTS) {
        const result = await followLocalRedirects(redirect.from);
        const expectedFinal = normalizeSlashes(redirect.to);
        const finalTargetOk = result.finalPath === expectedFinal && result.finalStatus === 200;
        const statusesOk = result.chain.length > 0 && result.chain.every((hop) => hop.status === 301 || hop.status === 308);
        const hopsOk = !result.tooMany && !result.loop && result.chain.length >= 1;
        rows.push({
          from: redirect.from,
          expectedTarget: redirect.to,
          hops: result.chain.length,
          chain: result.chain,
          finalStatus: result.finalStatus,
          finalPath: result.finalPath,
          ok: finalTargetOk && statusesOk && hopsOk,
        });
      }
      ctx.measure('redirects', rows);
      const failed = rows.filter((row) => !row.ok);
      ctx.check('2 个 vertical 旧 URL 均以 301/308 收敛到正确目标（最终 200）', failed.length === 0, { actual: failed });

      // 规范 URL（带尾斜杠）应单跳 308 → 目标 200（Preview 实测）
      const canonicalHops = rows.filter((row) => row.from.endsWith('/'));
      const canonicalSingleHop = canonicalHops.every((row) => row.hops === 1);
      ctx.check(
        '规范 URL（带尾斜杠）单跳 308 → 200',
        canonicalSingleHop,
        { actual: canonicalHops.map((row) => ({ from: row.from, hops: row.hops, chain: row.chain })) },
      );
      // 无斜杠 URL：Vercel trailingSlash 先规范化，实测 2 跳；只记录，不判 FAIL
      const noSlashHops = rows.filter((row) => !row.from.endsWith('/')).map((row) => ({ from: row.from, hops: row.hops, chain: row.chain }));
      ctx.measure('noSlashRedirectChains', noSlashHops);
      ctx.check(
        '无斜杠 URL 的跳转链符合 Vercel trailingSlash 行为（1–2 跳；仅记录，不判 FAIL）',
        noSlashHops.every((row) => row.hops >= 1 && row.hops <= 2),
        { level: 'WARN', actual: noSlashHops },
      );
    },
  });

  // G3：60 个可索引页 JSON-LD（含 Phase C 最终改动抽查：@id 绝对 URL / 本地化首页 WebSite 无 inLanguage）
  await runCase({
    id: 'G3',
    group: 'G-phase-c',
    name: `可索引页 JSON-LD：可解析 / 有 @graph / 类型符合（Phase D：${expectedSitemapSet.size} 页）`,
    async fn(ctx) {
      const rows = [];
      const idAudit = { checked: 0, nonAbsolute: [] };
      const localizedHomeWebsiteInLanguage = [];
      for (const url of expectedSitemapSet) {
        const parsed = inventory.get(url)?.parsed;
        const blocks = parseJsonLdBlocks(parsed ?? {});
        const category = jsonLdCategory(url);
        const required = JSONLD_REQUIRED_TYPES[category];
        const types = blocks.flatMap((block) => block.types ?? []);
        const problems = [];
        if (blocks.length === 0) problems.push('缺少 JSON-LD');
        if (blocks.some((block) => !block.ok)) problems.push(`JSON 解析失败：${blocks.find((block) => !block.ok)?.error}`);
        if (blocks.length > 0 && blocks.some((block) => !block.hasGraph)) problems.push('存在无 @graph 的 JSON-LD block');
        for (const requiredType of required) {
          if (!types.includes(requiredType)) problems.push(`缺少类型 ${requiredType}`);
        }
        // Phase C 最终改动抽查：FAQPage / Article 的 @id 必须是绝对 URL
        for (const block of blocks) {
          for (const node of block.graph ?? []) {
            if (node?.['@type'] === 'FAQPage' || node?.['@type'] === 'Article') {
              idAudit.checked += 1;
              if (!/^https?:\/\//i.test(String(node['@id'] ?? ''))) idAudit.nonAbsolute.push({ url, type: node['@type'], id: node['@id'] ?? null });
            }
          }
        }
        // Phase C 最终改动抽查：本地化首页 WebSite 不带 inLanguage
        if (isHomeUrl(url) && languageOf(url) !== 'en') {
          for (const block of blocks) {
            for (const node of block.graph ?? []) {
              if (node?.['@type'] === 'WebSite' && Object.prototype.hasOwnProperty.call(node, 'inLanguage')) {
                localizedHomeWebsiteInLanguage.push({ url, inLanguage: node.inLanguage });
              }
            }
          }
        }
        const row = { url, category, blockCount: blocks.length, types: [...new Set(types)], required, problems, ok: problems.length === 0 };
        rows.push(row);
        if (!row.ok) ctx.detail(row);
      }
      const failed = rows.filter((row) => !row.ok);
      ctx.measure('checked', rows.length);
      ctx.measure('failedCount', failed.length);
      ctx.measure('categoryCounts', rows.reduce((acc, row) => {
        acc[row.category] = (acc[row.category] ?? 0) + 1;
        return acc;
      }, {}));
      ctx.measure('jsonLdIdAudit', idAudit);
      ctx.measure('localizedHomeWebsiteInLanguage', localizedHomeWebsiteInLanguage);
      ctx.check(`JSON-LD 全部合格（${rows.length - failed.length}/${rows.length}）`, failed.length === 0, {
        actual: failed.slice(0, 12),
      });
      ctx.check('FAQPage / Article 的 @id 均为绝对 URL（Phase C 最终改动抽查）', idAudit.nonAbsolute.length === 0, {
        level: 'WARN',
        actual: idAudit.nonAbsolute.slice(0, 10),
      });
      ctx.check('本地化首页 WebSite JSON-LD 不含 inLanguage（Phase C 最终改动抽查）', localizedHomeWebsiteInLanguage.length === 0, {
        level: 'WARN',
        actual: localizedHomeWebsiteInLanguage,
      });
    },
  });

  // G4：3 篇 blog 扩写 + 首页卡片同步
  await runCase({
    id: 'G4',
    group: 'G-phase-c',
    name: `Phase C blog 扩展：3 篇 ≥${BLOG_MIN_WORDS} 词 / description ≤${DESCRIPTION_MAX} / Article JSON-LD / blog 首页卡片同步`,
    async fn(ctx) {
      const blogIndexInfo = inventory.get('/blog/');
      const blogIndexHtml = blogIndexInfo ? readFileSync(join(ROOT, blogIndexInfo.rel), 'utf8') : '';
      const cards = new Map();
      for (const match of blogIndexHtml.matchAll(/<article class="blog-post-card">([\s\S]*?)<\/article>/gi)) {
        const block = match[1];
        const href = /href="([^"]+)"/i.exec(block)?.[1];
        const title = /<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(block)?.[1];
        const excerpt = /<p class="blog-post-excerpt"[^>]*>([\s\S]*?)<\/p>/i.exec(block)?.[1];
        if (!href) continue;
        cards.set(normalizeSlashes(href), {
          title: normalizeText(decodeEntities((title ?? '').replace(/<[^>]+>/g, ' '))),
          excerpt: normalizeText(decodeEntities((excerpt ?? '').replace(/<[^>]+>/g, ' '))),
        });
      }
      const rows = [];
      for (const url of BLOG_CONTENT_POSTS) {
        const pageInfo = inventory.get(url);
        const html = pageInfo ? readFileSync(join(ROOT, pageInfo.rel), 'utf8') : '';
        const words = countWords(staticVisibleText(html));
        const description = pageInfo?.parsed.description ?? null;
        const descriptionOk = Boolean(description) && description.length <= DESCRIPTION_MAX;
        const blocks = parseJsonLdBlocks(pageInfo?.parsed ?? {});
        const types = blocks.flatMap((block) => block.types ?? []);
        const articleOk = types.includes('Article');
        const postTitle = normalizeText((pageInfo?.parsed.title ?? '').split('|')[0]);
        const card = cards.get(url);
        const titleSimilarity = card ? jaccard(latinTokens(postTitle), latinTokens(card.title)) : 0;
        const excerptSimilarity = card ? jaccard(latinTokens(description ?? ''), latinTokens(card.excerpt)) : 0;
        const titleSynced = Boolean(card) && (normalizeText(card.title) === postTitle || titleSimilarity >= 0.8);
        const excerptSynced = Boolean(card) && excerptSimilarity >= 0.3;
        const problems = [];
        if (words < BLOG_MIN_WORDS) problems.push(`正文 ${words} 词 < ${BLOG_MIN_WORDS}`);
        if (!descriptionOk) problems.push(`description 缺失或 >${DESCRIPTION_MAX}（${description?.length ?? 'null'}）`);
        if (!articleOk) problems.push('缺少 Article JSON-LD');
        if (!titleSynced) problems.push('blog 首页卡片标题未同步');
        if (!excerptSynced) problems.push(`blog 首页卡片摘要相似度 ${excerptSimilarity.toFixed(2)} < 0.3`);
        rows.push({
          url,
          words,
          descriptionLength: description?.length ?? null,
          articleJsonLd: articleOk,
          cardTitleSimilarity: Number(titleSimilarity.toFixed(3)),
          cardExcerptSimilarity: Number(excerptSimilarity.toFixed(3)),
          problems,
          ok: problems.length === 0,
        });
      }
      const failed = rows.filter((row) => !row.ok);
      ctx.measure('posts', rows);
      ctx.check(`3 篇扩写 blog 全部合格（${rows.length - failed.length}/${rows.length}）`, failed.length === 0, { actual: failed });
    },
  });

  // G5：全站 description ≤160
  await runCase({
    id: 'G5',
    group: 'G-phase-c',
    name: `全站 description 存在且 ≤${DESCRIPTION_MAX} 字符（全部非 404 页面）`,
    async fn(ctx) {
      const rows = [];
      for (const [url, pageInfo] of inventory) {
        const description = pageInfo.parsed.description;
        rows.push({ url, length: description?.length ?? null, ok: Boolean(description) && description.length <= DESCRIPTION_MAX });
      }
      const failed = rows.filter((row) => !row.ok);
      ctx.measure('pages', rows.length);
      ctx.measure('failedCount', failed.length);
      ctx.check(`description 长度全部合格（${rows.length - failed.length}/${rows.length}）`, failed.length === 0, {
        actual: failed.slice(0, 15),
      });
    },
  });

  // G6：本地化首页单一 H1 + 本地语言
  await runCase({
    id: 'G6',
    group: 'G-phase-c',
    name: '首页（含 4 个本地化首页）单一 H1 且 H1 为本地语言',
    async fn(ctx) {
      const englishH1 = normalizeText((renderedData.get('/')?.h1s ?? [])[0] ?? '');
      const rows = [];
      for (const url of HOMEPAGE_URLS) {
        const data = renderedData.get(url);
        const h1s = data?.h1s ?? [];
        const langKey = languageOf(url);
        const h1 = normalizeText(h1s[0] ?? '');
        const signal = textSignal(h1);
        const problems = [];
        if (h1s.length !== 1) problems.push(`h1 数量 ${h1s.length} ≠ 1`);
        if (!h1) problems.push('H1 为空');
        if (langKey !== 'en') {
          if (h1 === englishH1) problems.push('H1 与英文首页相同');
          const threshold = SCRIPT_THRESHOLDS[langKey];
          const signalValue = languageSignalFor(langKey, signal);
          if (signalValue < threshold) problems.push(`H1 语言信号 ${signalValue.toFixed(2)} < ${threshold}`);
        }
        rows.push({
          url,
          expectedLang: langKey,
          h1,
          h1Count: h1s.length,
          signal: { cjkRatio: Number(signal.cjkRatio.toFixed(3)), kanaCjkRatio: Number(signal.kanaCjkRatio.toFixed(3)), spanishMarkerRatio: Number(signal.spanishMarkerRatio.toFixed(3)) },
          problems,
          ok: problems.length === 0,
        });
      }
      const failed = rows.filter((row) => !row.ok);
      ctx.measure('pages', rows);
      ctx.measure('englishHomepageH1', englishH1);
      ctx.check(`首页 H1 全部合格（${rows.length - failed.length}/${rows.length}）`, failed.length === 0, { actual: failed });
    },
  });

}

// ---------------------------------------------------------------------------
// 检查 H：Phase D 工具意图区隔 / square-collage 恢复
// ---------------------------------------------------------------------------

function findToolIntentSwitchTarget(html) {
  const block = /<[^>]*class="[^"]*tool-intent-switch[^"]*"[^>]*>([\s\S]{0,1500}?)<\/div>/i.exec(html);
  if (!block) return null;
  const href = /<a\b[^>]*href="([^"]+)"/i.exec(block[1])?.[1] ?? null;
  return href ? normalizeSlashes(canonicalPath(href) ?? href) : null;
}

async function runPhaseDChecks() {
  // H1：两个工具 title/H1 意图区隔 + `.tool-intent-switch` 互链
  await runCase({
    id: 'H1',
    group: 'H-phase-d',
    name: 'square / squarecrop 意图区隔：title+H1 不重复、EN 各含 fill/no-crop vs crop 信号、两页互链',
    async fn(ctx) {
      const rows = [];
      for (const lang of LANGUAGES) {
        const squareUrl = langUrl(lang.key, TOOL_INTENT_BASES.square);
        const squarecropUrl = langUrl(lang.key, TOOL_INTENT_BASES.squarecrop);
        const square = renderedData.get(squareUrl);
        const squarecrop = renderedData.get(squarecropUrl);
        const problems = [];
        if (!square || !squarecrop) problems.push('渲染数据缺失');
        if (square && squarecrop) {
          if (!square.title || !squarecrop.title) problems.push('title 为空');
          if (normalizeText(square.title) === normalizeText(squarecrop.title)) problems.push('两个工具 title 重复');
          const h1Square = normalizeText((square.h1s ?? [])[0] ?? '');
          const h1Crop = normalizeText((squarecrop.h1s ?? [])[0] ?? '');
          if (!h1Square || !h1Crop) problems.push('H1 为空');
          if (h1Square === h1Crop) problems.push('两个工具 H1 重复');
          if (lang.key === 'en') {
            const squareText = `${square.title} ${h1Square}`;
            const cropText = `${squarecrop.title} ${h1Crop}`;
            if (!EN_TOOL_INTENT_SIGNALS.square.test(squareText)) problems.push('square title/H1 缺少 fill/blur/color/resize/no-crop 信号');
            if (!EN_TOOL_INTENT_SIGNALS.squarecrop.test(cropText)) problems.push('squarecrop title/H1 缺少 crop 信号');
            if (/^Square Image Converter/i.test(squarecrop.title) || /^Square Crop/i.test(square.title)) {
              problems.push('两个工具 title 定位疑似混用');
            }
          }
        }
        rows.push({
          lang: lang.key,
          squareTitle: square?.title ?? null,
          squareH1: normalizeText((square?.h1s ?? [])[0] ?? ''),
          squarecropTitle: squarecrop?.title ?? null,
          squarecropH1: normalizeText((squarecrop?.h1s ?? [])[0] ?? ''),
          problems,
          ok: problems.length === 0,
        });
      }
      // `.tool-intent-switch` 互链：10 个页面均指向对应语言的另一个工具
      const crossLinks = [];
      for (const lang of LANGUAGES) {
        for (const [toolKey, otherKey] of [['square', 'squarecrop'], ['squarecrop', 'square']]) {
          const url = langUrl(lang.key, TOOL_INTENT_BASES[toolKey]);
          const pageInfo = inventory.get(url);
          const html = pageInfo ? readFileSync(join(ROOT, pageInfo.rel), 'utf8') : '';
          const target = findToolIntentSwitchTarget(html);
          const expected = langUrl(lang.key, TOOL_INTENT_BASES[otherKey]);
          crossLinks.push({ url, expectedTarget: expected, actualTarget: target, ok: target === normalizeSlashes(expected) });
        }
      }
      const failed = rows.filter((row) => !row.ok);
      const linkFailed = crossLinks.filter((row) => !row.ok);
      ctx.measure('tools', rows);
      ctx.measure('crossLinks', crossLinks);
      ctx.check(`10 个工具页 title/H1 意图区隔正确（${rows.length - failed.length}/${rows.length}）`, failed.length === 0, {
        actual: failed,
      });
      ctx.check(`两工具互链 .tool-intent-switch 正确（${crossLinks.length - linkFailed.length}/${crossLinks.length}）`, linkFailed.length === 0, {
        actual: linkFailed,
      });
    },
  });

  // H2：/square-collage/ 恢复为独立可索引页（200，无 301；canonical/hreflang en+x-default；JSON-LD WebPage+Breadcrumb；语言 nav）
  await runCase({
    id: 'H2',
    group: 'H-phase-d',
    name: '/square-collage/ 恢复：200 无重定向 / 可索引 / canonical+hreflang(en+x-default) / JSON-LD WebPage+Breadcrumb / 语言 nav',
    async fn(ctx) {
      const url = '/square-collage/';
      const pageInfo = inventory.get(url);
      const parsed = pageInfo?.parsed;
      const direct = await checkLocal(url);
      const noSlash = await followLocalRedirects('/square-collage');
      const expectedHreflangs = new Map([['en', url], ['x-default', url]]);
      const actualHreflangs = new Map((parsed?.hreflangs ?? []).map((item) => [item.hreflang, canonicalPath(item.href)]));
      const blocks = parseJsonLdBlocks(parsed ?? {});
      const types = blocks.flatMap((block) => block.types ?? []);
      const languageLinks = [...(pageInfo ? readFileSync(join(ROOT, pageInfo.rel), 'utf8').matchAll(/<a\b[^>]*class="[^"]*language-link[^"]*"[^>]*href="([^"]+)"/gi) : [])].map((match) => normalizeSlashes(canonicalPath(match[1]) ?? match[1]));
      const problems = [];
      if (!pageInfo) problems.push('页面不在清单');
      if (!indexableSet.has(url)) problems.push('页面未被判定为可索引');
      if (!expectedSitemapSet.has(url)) problems.push('页面不在 sitemap 期望集合');
      if (direct.status !== 200 || direct.location) problems.push(`/square-collage/ 非 200（${direct.status} ${direct.location ?? ''}）`);
      if (noSlash.finalStatus !== 200 || noSlash.finalPath !== normalizeSlashes(url) || noSlash.chain.length !== 1) {
        problems.push(`/square-collage 无斜杠跳转异常：${JSON.stringify(noSlash.chain.map((hop) => hop.status))} → ${noSlash.finalPath}`);
      }
      if (canonicalPath(parsed?.canonical) !== url) problems.push(`canonical ${parsed?.canonical}`);
      for (const [code, expected] of expectedHreflangs) {
        if (normalizeSlashes(actualHreflangs.get(code) ?? '') !== expected) problems.push(`hreflang ${code} 缺失或错误（${actualHreflangs.get(code)}）`);
      }
      if (actualHreflangs.size !== expectedHreflangs.size) problems.push(`hreflang 数量 ${actualHreflangs.size} ≠ 2`);
      if (!types.includes('WebPage') || !types.includes('BreadcrumbList')) problems.push(`JSON-LD 类型 ${types.join(',')} 缺少 WebPage+BreadcrumbList`);
      if (languageLinks.length < 5) problems.push(`语言 nav 链接数量 ${languageLinks.length} < 5`);
      ctx.measure('page', {
        direct,
        noSlashChain: noSlash.chain,
        canonical: parsed?.canonical ?? null,
        hreflangs: [...actualHreflangs.entries()],
        jsonLdTypes: [...new Set(types)],
        languageLinks,
        indexable: indexableSet.has(url),
        inSitemapExpected: expectedSitemapSet.has(url),
      });
      ctx.check('/square-collage/ 恢复后符合 Phase D 预期', problems.length === 0, { actual: problems });
    },
  });

  // H3：首页 Square Collage 卡片内链恢复 + 页面有入链
  await runCase({
    id: 'H3',
    group: 'H-phase-d',
    name: '首页恢复 /square-collage/ 卡片内链，且该页有 ≥1 站内入链',
    async fn(ctx) {
      const homeInfo = inventory.get('/');
      const homeHtml = homeInfo ? readFileSync(join(ROOT, homeInfo.rel), 'utf8') : '';
      const homeHasLink = /<a\b[^>]*href="\/square-collage\/"/i.test(homeHtml);
      const inlinks = (() => {
        let count = 0;
        for (const [, targets] of siteLinkEdges ?? []) if (targets.has('/square-collage/')) count += 1;
        return count;
      })();
      const problems = [];
      if (!homeHasLink) problems.push('首页静态 HTML 缺少 /square-collage/ 链接');
      if (inlinks < 1) problems.push('清单内无页面链接到 /square-collage/');
      ctx.measure('homeHasLink', homeHasLink);
      ctx.measure('inlinkCount', inlinks);
      ctx.check('首页卡片内链与入链检查通过', problems.length === 0, { actual: problems });
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
  'G-phase-c': 'G. Phase C 内容质量 / 结构化数据 / 301',
  'H-phase-d': 'H. Phase D 工具意图区隔 / square-collage 恢复',
};
const GROUP_ORDER = Object.keys(GROUP_TITLES);

function renderMarkdown(report) {
  const out = [];
  const totals = report.summary.totals;
  out.push(`# 多语言 / SEO 浏览器验收报告（${report.meta.label}）`);
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
  out.push(`| 证据目录 | \`${report.meta.evidenceDir}\` |`);
  out.push(`| 分支 / HEAD | \`${report.meta.git.branch}\` / \`${report.meta.git.head.slice(0, 12)}\` |`);
  out.push(
    `| 工作区状态 | dirty 文件 ${report.meta.git.dirtyFiles} 个；路径 digest \`${report.meta.git.dirtyDigest}\`；内容 digest \`${report.meta.git.dirtyContentDigest}\`（diff ${report.meta.git.dirtyDiffBytes} B） |`,
  );
  out.push(`| Chrome | ${report.meta.chrome} |`);
  out.push(`| Node / 平台 | ${report.meta.node} / ${report.meta.platform} |`);
  out.push(`| 本地服务 | \`${report.meta.server}\`（Vercel 路由模拟 + vercel.json 301） |`);
  out.push(
    `| 页面清单 | 非 404 页面 ${report.meta.inventoryCount}；可索引 ${report.meta.indexableCount}；noindex ${report.meta.noindexCount}；301 旧页 ${report.meta.redirectedCount}；渲染检查 ${report.meta.renderedCount} |`,
  );
  out.push(`| 运行时长 | ${(report.meta.durationMs / 1000).toFixed(1)} s |`);
  out.push('');
  out.push('## 2. 结论摘要');
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
  out.push('# Phase C 最终验收（证据写入 evidence/phase-c，不覆盖 Phase B）');
  out.push('node scripts/seo-audit/run-seo-checks.mjs --label phase-c-final --evidence-dir audit/evidence/phase-c');
  out.push('');
  out.push('# Phase B 历史证据复现（默认 evidence 目录）');
  out.push('node scripts/seo-audit/run-seo-checks.mjs --label final');
  out.push('```');
  out.push('');
  out.push('退出码：`0` = 无 FAIL（允许 WARN）；`1` = 存在 FAIL；`2` = 环境/运行错误。');
  out.push('');
  out.push('## 8. 已知限制');
  out.push('');
  out.push('- 可见正文语言为启发式判定（相似度 / 字符-词占比）；局部未翻译段落不单独判 FAIL（内容质量定性由人工判断）。');
  out.push('- 真实渲染只覆盖任务列出的 25 个页面；其余页面为静态 HTML 检查（canonical/hreflang/lang/sitemap/JSON-LD/description/链接图）。');
  out.push('- blog 字数按「去 script/style/标签后的静态可见文本」的拉丁词数统计（不含导航/页脚以外无法区分；与人工字数可能有 ±数词差异）。');
  out.push('- 本地服务器模拟 Vercel 路由（cleanUrls/trailingSlash/tools rewrite/404）+ vercel.json 精确路径 301；与线上 Cloudflare 边缘行为可能有差异，本阶段不部署。');
  out.push('- 不检查线上响应头/GA/第三方统计、翻译质量/薄内容定性、关键词蚕食、结构化数据富结果资格。');
  out.push('- 工作区可能正被 Lead 修改：报告头部记录 dirty 文件数与内容 digest；以同快照复跑结果为准。');
  out.push('');
  return out.join('\n');
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------
async function main() {
  const cli = parseCli();
  const startedAt = performance.now();
  mkdirSync(cli.evidenceDir, { recursive: true });
  rmSync(SHOTS_DIR, { recursive: true, force: true });
  rmSync(HTML_SNAPSHOT_DIR, { recursive: true, force: true });
  mkdirSync(SHOTS_DIR, { recursive: true });
  mkdirSync(HTML_SNAPSHOT_DIR, { recursive: true });

  if (!existsSync(join(ROOT, 'index.html'))) throw new Error(`不是 MeCollage 仓库根目录：${ROOT}`);

  // 1) 页面清单与静态解析
  const relFiles = walkHtmlFiles(ROOT).filter((rel) => rel.split(sep).join('/') !== '404.html');
  inventory = new Map();
  for (const rel of relFiles) {
    const url = urlForFile(rel);
    if (inventory.has(url)) throw new Error(`URL 映射冲突：${rel} → ${url}`);
    const html = readFileSync(join(ROOT, rel), 'utf8');
    inventory.set(url, { rel, url, langKey: languageOf(url), basePath: basePathOf(url), parsed: parseStaticHtml(html) });
  }
  urlSet = new Set(inventory.keys());
  redirectedPageUrls = new Set(LEGACY_PAGE_URLS.filter((url) => inventory.has(url)));
  noindexSet = new Set([...inventory.entries()].filter(([, info]) => info.parsed.noindex).map(([url]) => url));
  indexableSet = new Set([...inventory.keys()].filter((url) => !noindexSet.has(url) && !redirectedPageUrls.has(url)));
  expectedSitemapSet = buildExpectedSitemapSet(inventory);
  expectedNoindexSet = buildExpectedNoindexSet();
  console.log(
    `[setup] 非 404 页面 ${inventory.size}：可索引 ${indexableSet.size}（期望 ${expectedSitemapSet.size}）· noindex ${noindexSet.size}（期望 ${expectedNoindexSet.size}）· 301 旧页 ${redirectedPageUrls.size}`,
  );

  // 2) 快照信息
  const gitHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  const gitBranch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  const gitStatus = execFileSync('git', ['status', '--porcelain=v1'], { cwd: ROOT, encoding: 'utf8' });
  const gitDiff = execFileSync('git', ['diff'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 200 * 1024 * 1024 });
  const dirtyFiles = gitStatus.split('\n').filter((line) => line.trim().length > 0).length;
  const meta = {
    label: cli.label,
    generatedAt: new Date().toISOString(),
    evidenceDir: relative(ROOT, cli.evidenceDir),
    git: {
      head: gitHead,
      branch: gitBranch,
      dirtyFiles,
      dirtyDigest: sha(gitStatus).slice(0, 12),
      dirtyContentDigest: sha(gitDiff).slice(0, 12),
      dirtyDiffBytes: Buffer.byteLength(gitDiff),
    },
    inventoryCount: inventory.size,
    indexableCount: indexableSet.size,
    noindexCount: noindexSet.size,
    redirectedCount: redirectedPageUrls.size,
    expectedSitemapCount: expectedSitemapSet.size,
    expectedNoindexCount: expectedNoindexSet.size,
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
    name: '环境 / 快照 / 页面分类一致性',
    async fn(ctx) {
      ctx.measure('git', meta.git);
      ctx.measure('counts', {
        inventory: meta.inventoryCount,
        indexable: meta.indexableCount,
        noindex: meta.noindexCount,
        redirected: meta.redirectedCount,
        expectedSitemap: meta.expectedSitemapCount,
        expectedNoindex: meta.expectedNoindexCount,
      });
      ctx.measure('chrome', meta.chrome);
      ctx.measure('server', meta.server);
      ctx.measure('blockedUrls', BLOCKED_URLS);
      ctx.check('非 404 页面 = 104（72 可索引 + 32 noindex）', meta.inventoryCount === 104, { actual: meta.inventoryCount });
      ctx.check(`可索引页面 = ${expectedSitemapSet.size}（Phase D sitemap 期望）`, indexableSet.size === expectedSitemapSet.size, {
        actual: { indexable: indexableSet.size, expected: expectedSitemapSet.size },
      });
      const indexableDiff = [...expectedSitemapSet].filter((url) => !indexableSet.has(url)).concat([...indexableSet].filter((url) => !expectedSitemapSet.has(url)));
      ctx.check('可索引集合与 sitemap 期望集合一致', indexableDiff.length === 0, { actual: indexableDiff });
      ctx.check(`noindex 页面 = ${expectedNoindexSet.size}`, noindexSet.size === expectedNoindexSet.size, {
        actual: { noindex: noindexSet.size, expected: expectedNoindexSet.size },
      });
      const noindexDiff = [...expectedNoindexSet].filter((url) => !noindexSet.has(url)).concat([...noindexSet].filter((url) => !expectedNoindexSet.has(url)));
      ctx.check('noindex 集合与期望一致', noindexDiff.length === 0, { actual: noindexDiff });
      ctx.check('301 旧页 = 0（Phase E 已恢复 square-collage 与 vertical-collage）', meta.redirectedCount === 0, { actual: meta.redirectedCount });
      ctx.check('工作区快照已记录（内容 digest）', meta.git.dirtyContentDigest.length === 12, { actual: meta.git });
    },
  });

  // 4) 渲染检查（A/B/G6 使用）
  console.log(`[run] 渲染 ${RENDERED_URLS.length} 个页面…`);
  for (const url of RENDERED_URLS) {
    try {
      await renderUrl(url);
    } catch (error) {
      console.error(`[warn] 渲染失败 ${url}：${error.message}`);
    }
  }

  // 5) 检查
  await runRenderedChecks();
  await runSwitcherChecks();
  await runSitemapChecks();
  await runHeadChecks();
  await runInternalLinkChecks();
  await runRobotsChecks();
  await runPhaseCChecks();
  await runPhaseDChecks();
  await runFaqChecks();

  // 渲染证据清单补入 ENV-01
  const envCase = results.find((result) => result.id === 'ENV-01');
  if (envCase) {
    envCase.measurements.renderedEvidence = [...renderedData.values()].map((data) => ({
      url: data.path,
      screenshot: data.screenshot,
      htmlSnapshot: data.htmlSnapshot,
    }));
  }

  // 6) 报告
  const summary = summarize();
  meta.durationMs = Math.round(performance.now() - startedAt);
  const report = { tool: 'seo-audit', version: '1.3.0', meta, summary, results };
  writeFileSync(cli.jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(cli.mdPath, renderMarkdown(report), 'utf8');
  if (cli.label) {
    writeFileSync(join(dirname(cli.jsonPath), `seo-report-${safeName(cli.label)}.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    writeFileSync(join(dirname(cli.mdPath), `seo-report-${safeName(cli.label)}.md`), renderMarkdown(report), 'utf8');
  }

  console.log('');
  console.log('='.repeat(72));
  console.log(`SEO 检查完成：PASS ${summary.totals.PASS} / FAIL ${summary.totals.FAIL} / WARN ${summary.totals.WARN}（共 ${summary.totals.total}）`);
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
