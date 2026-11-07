#!/usr/bin/env node
/**
 * MeCollage 部署验收脚本（Phase A 安全止血）
 * ============================================================================
 * 目标：对同一套静态站（生产 / Vercel Preview / 本地静态服务器）执行可重复的
 *      部署验收，输出 PASS / FAIL / WARN 及证据，供发布前逐项核对。
 *
 * 用法：
 *   node scripts/verify-site.mjs --base https://www.mecollage.top/ \
 *     --label baseline --json out.json --md out.md
 *
 * 依赖：Node.js >= 20（内置 fetch / AbortSignal.timeout），零第三方依赖。
 *
 * 设计约束（见 scripts/README.md）：
 *   - 手动跟随重定向（fetch redirect:'manual'），最多 10 跳，记录完整跳转链，
 *     以便检测循环 / 多跳 / query 残留；
 *   - 网络错误 / 超时（默认 10s）记 WARN，不中断、不崩溃；
 *   - Preview 若返回 401 / Vercel SSO 登录页，记录并提示，绝不尝试绕过；
 *   - 跨主机检查（http→https、apex→www、默认域 X-Robots-Tag）仅在生产域评估，
 *     Preview / 自定义 base 下标 N/A（仍记录原始响应供参考）；
 *   - FAIL > 0 退出码 1；用法错误 / 站点不可达 / Preview 认证阻断退出码 2。
 *
 * 退出码：
 *   0 = 无 FAIL（允许 WARN）
 *   1 = 存在 FAIL
 *   2 = 无法判定（参数错误、站点不可达、Preview 认证阻断、输出写入失败）
 */

import { parseArgs } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { execSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

// ---------------------------------------------------------------------------
// 常量与小工具
// ---------------------------------------------------------------------------

const TOOL = 'verify-site';
const VERSION = '1.2.0';
const MAX_REDIRECTS = 10;
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 3 * 1024 * 1024; // 单响应体读取上限（防御性）

const USER_AGENT = `MeCollage-VerifySite/${VERSION} (deployment acceptance; https://www.mecollage.top)`;

/** 生产域（含 apex；apex 会 307 → www） */
const PRODUCTION_HOSTS = new Set(['www.mecollage.top', 'mecollage.top']);
const DEFAULT_DOMAIN_URL = 'https://mecollage.vercel.app/';

/** a) 关键页面：最终必须 200 */
const KEY_PAGES = ['/', '/about/', '/tools/square/', '/blog/', '/privacy/', '/zh/', '/es/', '/ja/', '/tw/'];

/** b) 安全头：首页 + 一个工具页（Phase A 由 vercel.json headers 统一下发） */
const HEADER_TARGETS = ['/', '/tools/square/'];

/**
 * 安全头检查矩阵。
 * mode:
 *   present  —— 必须存在且非空
 *   exact    —— 必须等于 expect（大小写不敏感）
 *   oneOf    —— 必须属于 expect 之一
 *   pattern  —— 必须匹配 match 正则
 */
const SECURITY_HEADERS = [
  {
    key: 'strict-transport-security',
    label: 'Strict-Transport-Security (HSTS)',
    mode: 'pattern',
    match: /max-age=\s*\d+/i,
    hint: '缺少 max-age',
  },
  {
    key: 'x-content-type-options',
    label: 'X-Content-Type-Options',
    mode: 'exact',
    expect: 'nosniff',
  },
  {
    key: 'x-frame-options',
    label: 'X-Frame-Options',
    mode: 'oneOf',
    expect: ['DENY', 'SAMEORIGIN'],
  },
  {
    key: 'referrer-policy',
    label: 'Referrer-Policy',
    mode: 'present',
  },
  {
    key: 'permissions-policy',
    label: 'Permissions-Policy',
    mode: 'present',
  },
  {
    key: 'content-security-policy-report-only',
    label: 'Content-Security-Policy-Report-Only',
    mode: 'present',
  },
];

/** c) ?lang= 重定向：期望单跳、最终 200、最终 URL 不含 lang、无循环 */
const LANG_REDIRECTS = [
  { lang: 'zh', expectedPath: '/zh/' },
  { lang: 'es', expectedPath: '/es/' },
  { lang: 'ja', expectedPath: '/ja/' },
  { lang: 'tw', expectedPath: '/tw/' },
  { lang: 'en', expectedPath: '/' },
];

/** f) 遗留文件 / 死资源：应全部 404（删除或 .vercelignore 排除；2026-11-07 起含已移除的 ads.txt） */
const LEGACY_FILES = [
  { path: '/design-system.md', label: '设计系统文档' },
  { path: '/需求理解确认.txt', label: '中文需求文档（URL 编码后请求）' },
  { path: '/.htaccess', label: 'Apache 遗留配置' },
  { path: '/.nojekyll', label: 'GitHub Pages 遗留标记' },
  { path: '/check_keys.js', label: '密钥检查脚本' },
  { path: '/sync_keys.js', label: '密钥同步脚本' },
  { path: '/zh-tw.json', label: '根目录旧翻译数据' },
  { path: '/assets/js/index-CurY6_0Y.js', label: '死代码 bundle' },
  { path: '/assets/js/index-CurY6_0Y.js.backup', label: '死代码备份' },
  { path: '/test-section/', label: '测试页' },
  { path: '/ads.txt', label: 'AdSense ads.txt（2026-11-07 移除接入）' },
];

/** g) 关键资产：必须 200（不得误删；2026-11-07 起不再含已移除的 ads.txt） */
const KEY_ASSETS = [
  { path: '/sitemap.xml', label: 'Sitemap', kind: 'sitemap' },
  { path: '/robots.txt', label: 'robots.txt', kind: 'robots' },
  { path: '/assets/js/mecollage-main.js', label: '主 JS', kind: 'js' },
  { path: '/assets/js/i18n.js', label: 'i18n JS', kind: 'js' },
  { path: '/assets/index-vAuRGWiM.css', label: '主 CSS', kind: 'css' },
  { path: '/assets/pages-C2UaL6ML.css', label: '页面 CSS', kind: 'css' },
  { path: '/wallImage.webp', label: '首页壁纸', kind: 'binary' },
  { path: '/i18n/zh.json', label: '中文翻译 JSON', kind: 'json' },
];

/** 报告分类（顺序即输出顺序） */
const CATEGORIES = [
  { id: 'pages', letter: 'a', title: '关键页面可访问性', description: '首页与 8 个关键页面最终 HTTP 200' },
  { id: 'headers', letter: 'b', title: '安全响应头', description: '首页与工具页的 6 项安全头（Phase A 由 vercel.json 统一下发）' },
  { id: 'redirects', letter: 'c', title: '重定向与 URL 规范化', description: '?lang=、尾斜杠、/public 路径、http→https、apex→www' },
  { id: 'notfound', letter: 'd', title: '不存在的 URL（404 页）', description: '随机 404 路径的状态码、页面标记、无广告/无自动跳转、noindex' },
  { id: 'soft404', letter: 'e', title: '软 404（/404 与 /404/）', description: '状态记录 + noindex + 无广告/无自动跳转（状态不强制 404）' },
  { id: 'legacy', letter: 'f', title: '遗留文件暴露面', description: 'Phase A 应删除或 .vercelignore 排除的文件必须 404；ads.txt 于 2026-11-07 移除' },
  { id: 'assets', letter: 'g', title: '关键资产回归', description: 'sitemap / robots / JS / CSS / 图片 / i18n 必须 200' },
  { id: 'default-domain', letter: 'h', title: '默认域 noindex', description: 'mecollage.vercel.app 不得与主域重复收录（X-Robots-Tag noindex）' },
];

/** 目标被 Vercel Deployment Protection 阻断时使用的单列分类（避免几十条虚假 FAIL/WARN） */
const BLOCKED_CATEGORY = {
  id: 'blocked',
  letter: '!',
  title: '访问控制（Deployment Protection）',
  description: '目标站点启用了 Vercel Deployment Protection，验收被阻断，未产生 PASS/FAIL',
};

/** 默认请求头（可被 --header 覆盖） */
const DEFAULT_REQUEST_HEADERS = {
  'user-agent': USER_AGENT,
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
  'cache-control': 'no-cache',
  pragma: 'no-cache',
};

/** Vercel Deployment Protection 的 SSO 跳转目标（命中即停止跟随，不访问登录页） */
const VERCEL_SSO_API_PATTERN = /^https:\/\/vercel\.com\/sso-api(?:\/|\?|$)/i;

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const USAGE = `
MeCollage 部署验收脚本 v${VERSION}（Node.js，零依赖）

用法：
  node scripts/verify-site.mjs --base <URL> [选项]

必需：
  --base <URL>      待验收站点根地址，例如 https://www.mecollage.top/
                    或 Vercel Preview：https://mecollage-<hash>-<team>.vercel.app/

可选：
  --json <path>     将结构化结果写入 JSON 文件（自动创建目录）
  --md <path>       将人类可读报告写入 Markdown 文件（自动创建目录）
  --label <name>    报告标签，例如 baseline / preview / production（默认取运行模式）
  --timeout <ms>    单请求超时，默认 ${DEFAULT_TIMEOUT_MS} ms（允许 1000–30000）
  --header "K: V"   追加/覆盖请求头，可重复。需要访问受 Vercel Deployment Protection
                    保护的 Preview 时传：--header "x-vercel-protection-bypass: <secret>"
  -h, --help        显示本帮助

环境变量：
  VERCEL_AUTOMATION_BYPASS_SECRET
                    存在且非空时自动追加 x-vercel-protection-bypass 请求头
                    （值不会写入报告/证据/命令行；等价于 --header 传同一个头）

Preview 访问保护：
  受 Vercel Authentication 保护的 Preview 会 302 → https://vercel.com/sso-api…；
  脚本判定为 BLOCKED（不是 FAIL），不尝试绕过。三种验收方式见 scripts/README.md：
    A. 提供 VERCEL_AUTOMATION_BYPASS_SECRET（推荐）
    B. 用已登录 Vercel 的 vercel curl / 浏览器打开
    C. 临时关闭 Deployment Protection（不推荐，验收后立即恢复）

示例：
  # 生产基线
  node scripts/verify-site.mjs --base https://www.mecollage.top/ \\
    --label baseline --json audit/evidence/phase-a/verification/baseline.json \\
    --md audit/evidence/phase-a/verification/baseline.md

  # Preview 验收（URL 由 Vercel Deployment 提供；如为 401 需先解决认证，脚本不绕过）
  node scripts/verify-site.mjs --base "https://mecollage-<hash>-keeey-is-projects.vercel.app/" \\
    --label preview --json audit/evidence/phase-a/verification/preview.json \\
    --md audit/evidence/phase-a/verification/preview.md

退出码：
  0 = 无 FAIL（WARN 可接受）
  1 = 存在 FAIL（Phase A 未达标 / 线上回归）
  2 = 无法判定：参数错误 / 站点不可达 / Preview 被 Deployment Protection 阻断（BLOCKED）/
      输出写入失败

判定规则与预期基线见 scripts/README.md。
`;

/** 脱敏 --header 的值，避免 bypass secret 等敏感值写进证据 */
function redactHeaderValue(raw) {
  const text = String(raw);
  const separator = text.indexOf(':');
  return separator > 0 ? `${text.slice(0, separator)}: ***` : '***';
}

/** 记录命令行时对 --header 的值脱敏（key 保留，便于审计；secret 不落盘） */
function sanitizeCommandLine(argv) {
  const sanitized = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--header') {
      sanitized.push(arg);
      if (i + 1 < argv.length) {
        i += 1;
        sanitized.push(redactHeaderValue(argv[i]));
      }
    } else if (arg.startsWith('--header=')) {
      sanitized.push(`--header=${redactHeaderValue(arg.slice('--header='.length))}`);
    } else {
      sanitized.push(arg);
    }
  }
  return ['node', 'scripts/verify-site.mjs', ...sanitized].join(' ');
}

/**
 * @returns {{
 *   baseUrl: URL, baseHref: string, origin: string, host: string, mode: string,
 *   label: string, timeoutMs: number, jsonPath: string|null, mdPath: string|null,
 *   commandLine: string, customHeaders: Record<string,string>, requestHeaderNames: string[],
 *   bypassHeaderApplied: boolean, bypassSource: 'env'|'flag'|null
 * }}
 */
function parseCli() {
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      allowPositionals: false,
      options: {
        base: { type: 'string' },
        json: { type: 'string' },
        md: { type: 'string' },
        label: { type: 'string' },
        timeout: { type: 'string' },
        header: { type: 'string', multiple: true },
        help: { type: 'boolean', short: 'h' },
      },
    });
  } catch (err) {
    console.error(`参数错误：${err.message}\n`);
    console.error(USAGE);
    process.exit(2);
  }

  const values = parsed.values;
  if (values.help) {
    console.log(USAGE);
    process.exit(0);
  }
  if (!values.base) {
    console.error('缺少必需参数 --base <URL>\n');
    console.error(USAGE);
    process.exit(2);
  }

  let baseUrl;
  try {
    baseUrl = new URL(values.base);
  } catch {
    console.error(`--base 不是合法 URL：${values.base}\n`);
    console.error(USAGE);
    process.exit(2);
  }
  if (!/^https?:$/.test(baseUrl.protocol)) {
    console.error(`--base 仅支持 http/https，收到：${baseUrl.protocol}`);
    process.exit(2);
  }
  if (baseUrl.pathname !== '/' || baseUrl.search || baseUrl.hash) {
    console.error('--base 需为站点根地址（例如 https://www.mecollage.top/），不要带路径/查询/锚点。');
    process.exit(2);
  }

  const timeoutMs = values.timeout === undefined ? DEFAULT_TIMEOUT_MS : Number(values.timeout);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30000) {
    console.error('--timeout 需为 1000–30000 之间的毫秒数（默认 10000）。');
    process.exit(2);
  }

  const host = baseUrl.hostname.toLowerCase();
  const mode =
    PRODUCTION_HOSTS.has(host) || host === 'mecollage.vercel.app'
      ? 'production'
      : host.endsWith('.vercel.app')
        ? 'preview'
        : 'custom';
  const label = values.label && values.label.trim() ? values.label.trim() : mode;

  // 自定义请求头：--header "K: V"（可重复）+ VERCEL_AUTOMATION_BYPASS_SECRET 自动注入
  /** @type {Record<string,string>} */
  const customHeaders = {};
  for (const raw of values.header ?? []) {
    const separator = raw.indexOf(':');
    if (separator <= 0 || separator === raw.length - 1) {
      console.error(`--header 格式应为 "Key: Value"，收到：${redactHeaderValue(raw)}`);
      process.exit(2);
    }
    const key = raw.slice(0, separator).trim();
    const value = raw.slice(separator + 1).trim();
    if (!/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(key) || !value) {
      console.error(`--header 名称非法或值为空：${redactHeaderValue(raw)}`);
      process.exit(2);
    }
    customHeaders[key.toLowerCase()] = value;
  }
  const bypassSecret = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? '').trim();
  const bypassFromEnv = bypassSecret.length > 0 && !customHeaders['x-vercel-protection-bypass'];
  if (bypassFromEnv) customHeaders['x-vercel-protection-bypass'] = bypassSecret;
  const bypassHeaderApplied = Boolean(customHeaders['x-vercel-protection-bypass']);

  return {
    baseUrl,
    baseHref: `${baseUrl.origin}/`,
    origin: baseUrl.origin,
    host,
    mode,
    label,
    timeoutMs: Math.round(timeoutMs),
    jsonPath: values.json ? resolve(process.cwd(), values.json) : null,
    mdPath: values.md ? resolve(process.cwd(), values.md) : null,
    commandLine: sanitizeCommandLine(process.argv.slice(2)),
    customHeaders,
    requestHeaderNames: Object.keys(customHeaders).sort(),
    bypassHeaderApplied,
    bypassSource: bypassHeaderApplied ? (bypassFromEnv ? 'env' : 'flag') : null,
  };
}

// ---------------------------------------------------------------------------
// HTTP 层：手动跟随重定向 + 容错
// ---------------------------------------------------------------------------

let site = null; // parseCli 后赋值（供 abs()/fetch 使用）
const responseCache = new Map();

function absolute(inputUrl) {
  if (/^https?:\/\//i.test(inputUrl)) return inputUrl;
  return new URL(inputUrl, site.baseUrl).href;
}

/** 循环检测用的 URL 归一化（去掉 hash；URL 构造器会统一编码/默认端口） */
function normalizeUrlForLoop(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.href;
  } catch {
    return String(url);
  }
}

function safeResolveLocation(location, base) {
  try {
    return new URL(location, base).href;
  } catch {
    return null;
  }
}

function classifyError(err, timeoutMs) {
  const name = err?.name ?? '';
  const causeCode = err?.cause?.code ?? err?.code ?? null;
  if (name === 'TimeoutError' || name === 'AbortError') {
    return { kind: 'timeout', message: `请求超时（>${timeoutMs}ms）`, code: causeCode };
  }
  return {
    kind: 'network',
    message: err?.message ? String(err.message) : String(err),
    code: causeCode,
  };
}

/**
 * 单次请求（不跟随重定向），返回统一结构。
 * 永远不抛异常：错误收敛为 { ok:false, error }。
 */
async function fetchRaw(url) {
  const started = performance.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(site.timeoutMs),
      headers: {
        ...DEFAULT_REQUEST_HEADERS,
        ...site.customHeaders,
      },
    });

    const buffer = Buffer.from(await res.arrayBuffer());
    const bytes = buffer.byteLength;
    const body = buffer.subarray(0, MAX_BODY_BYTES).toString('utf8');

    /** @type {Record<string,string>} */
    const headers = {};
    for (const [key, value] of res.headers) headers[key.toLowerCase()] = value;

    return {
      ok: true,
      url,
      status: res.status,
      headers,
      body,
      bodyTruncated: bytes > MAX_BODY_BYTES,
      bytes,
      contentType: headers['content-type'] ?? null,
      ms: Math.round(performance.now() - started),
    };
  } catch (err) {
    return {
      ok: false,
      url,
      error: classifyError(err, site.timeoutMs),
      ms: Math.round(performance.now() - started),
    };
  }
}

/** 同一次运行内按 URL 缓存响应（同一 URL 只请求一次；静态站验收足够） */
function fetchCached(url) {
  let promise = responseCache.get(url);
  if (!promise) {
    promise = fetchRaw(url);
    responseCache.set(url, promise);
  }
  return promise;
}

/**
 * 手动跟随重定向（最多 MAX_REDIRECTS 跳）。
 * @param {string} startUrl
 * @returns {Promise<{
 *   startUrl: string,
 *   chain: Array<{status:number, from:string, to:string, ms:number}>,
 *   final: null | {ok:true, url:string, status:number, headers:Record<string,string>,
 *                  body:string, bytes:number, contentType:string|null, ms:number},
 *   hops: number, loop: boolean, exceeded: boolean,
 *   error: null | {kind:string, message:string, code:string|null},
 *   finalUrl: string, totalMs: number
 * }>}
 */
async function follow(startUrl) {
  const started = performance.now();
  /** @type {Array<{status:number, from:string, to:string, ms:number}>} */
  const chain = [];
  const seen = new Set();
  let currentUrl = startUrl;
  let loop = false;
  let exceeded = false;
  let error = null;
  /** @type {string|null} 命中 Vercel Deployment Protection SSO 跳转时记录目标（停止跟随） */
  let blockedRedirect = null;
  /** @type {any} */
  let final = null;

  while (true) {
    const normalized = normalizeUrlForLoop(currentUrl);
    if (seen.has(normalized)) {
      loop = true;
      break;
    }
    seen.add(normalized);

    const res = await fetchCached(currentUrl);
    if (!res.ok) {
      error = res.error;
      break;
    }

    const isRedirect = [301, 302, 303, 307, 308].includes(res.status);
    const locationHeader = res.headers.location ?? res.headers.Location ?? null;
    const location = locationHeader ? safeResolveLocation(locationHeader, currentUrl) : null;

    if (isRedirect && location) {
      chain.push({ status: res.status, from: currentUrl, to: location, ms: res.ms });
      // Vercel Deployment Protection：遇到 vercel.com/sso-api 立即停止，不访问外部登录页
      if (VERCEL_SSO_API_PATTERN.test(location)) {
        blockedRedirect = location;
        break;
      }
      if (chain.length > MAX_REDIRECTS) {
        exceeded = true;
        break;
      }
      currentUrl = location;
      continue;
    }

    final = res;
    break;
  }

  return {
    startUrl,
    chain,
    final,
    hops: chain.length,
    loop,
    exceeded,
    error,
    blockedRedirect,
    finalUrl: final?.url ?? blockedRedirect ?? currentUrl,
    totalMs: Math.round(performance.now() - started),
  };
}

/**
 * 检测目标是否被 Vercel Deployment Protection 阻断。
 * 判定优先级：显式点击 sso-api > 最终 401 > 其他 Vercel SSO 跳转。
 * @returns {'vercel-sso-api'|'401'|'vercel-sso'|null}
 */
function detectProtection(result) {
  if (!result) return null;
  if (result.blockedRedirect) return 'vercel-sso-api';
  if (result.final?.status === 401) return '401';

  const baseHost = site?.host ?? '';
  for (const hop of result.chain ?? []) {
    const location = hop.to ?? '';
    if (VERCEL_SSO_API_PATTERN.test(location)) return 'vercel-sso-api';
    try {
      const target = new URL(location);
      if (
        (target.hostname === 'vercel.com' || target.hostname.endsWith('.vercel.com')) &&
        !baseHost.endsWith('vercel.com') &&
        /sso|login|auth/i.test(target.pathname + target.search)
      ) {
        return 'vercel-sso';
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** 兼容各检查项内的单点认证检测（正常情况下初始探测已提前判定 BLOCKED） */
function authBlockReason(result) {
  return detectProtection(result);
}

/** 跨主机检查（http→https、apex→www、默认域）是否适用于当前 base */
function crossHostApplicable() {
  return PRODUCTION_HOSTS.has(site.host) || site.host === 'mecollage.vercel.app';
}

// ---------------------------------------------------------------------------
// 断言 / 结果项
// ---------------------------------------------------------------------------

function pass(label, detail = null) {
  return { label, status: 'PASS', detail };
}
function fail(label, detail = null) {
  return { label, status: 'FAIL', detail };
}
function warn(label, detail = null) {
  return { label, status: 'WARN', detail };
}

/**
 * 通用断言：ok 为 true 记 PASS，否则按 level（FAIL/WARN）记录。
 */
function check(label, ok, { level = 'FAIL', detail = null } = {}) {
  if (ok) return pass(label, detail);
  return { label, status: level, detail };
}

function networkWarn(error) {
  return warn(
    `请求失败（${error.kind}）`,
    `${error.message}${error.code ? ` [${error.code}]` : ''} —— 按约定网络错误记 WARN，不中断`,
  );
}

function authWarn(reason) {
  const isSso = reason !== '401';
  return warn(
    isSso ? 'Vercel Deployment Protection 拦截（302 → vercel.com/sso-api）' : 'Preview 返回 401：需要 Vercel 认证',
    '无法验收该部署；按约定脚本不尝试绕过认证。需 maintainer 提供 bypass secret 或代跑（见 scripts/README.md 三种方式）。',
  );
}

/** 统一处理 error / auth / 无最终响应；返回 false 表示后续断言应跳过 */
function guardResponse(result, assertions) {
  if (result.error) {
    assertions.push(networkWarn(result.error));
    return false;
  }
  const auth = authBlockReason(result);
  if (auth) {
    assertions.push(authWarn(auth));
    return false;
  }
  if (!result.final) {
    assertions.push(
      warn(
        '未到达最终响应',
        result.loop ? '检测到重定向循环' : result.exceeded ? `超过 ${MAX_REDIRECTS} 跳上限` : '未知原因',
      ),
    );
    return false;
  }
  return true;
}

/**
 * @param {{
 *   id: string, category: string, name: string, url: string, expected: string,
 *   assertions: Array<{label:string,status:'PASS'|'FAIL'|'WARN',detail:string|null}>,
 *   evidence?: Record<string, any>, evidenceLines?: string[],
 *   applicable?: boolean, notes?: string[]
 * }} input
 */
function buildItem(input) {
  let status = 'PASS';
  for (const assertion of input.assertions) {
    if (assertion.status === 'FAIL') {
      status = 'FAIL';
      break;
    }
    if (assertion.status === 'WARN') status = 'WARN';
  }
  return {
    id: input.id,
    category: input.category,
    name: input.name,
    url: input.url,
    expected: input.expected,
    status,
    applicable: input.applicable !== false,
    assertions: input.assertions,
    evidence: input.evidence ?? {},
    evidenceLines: input.evidenceLines ?? [],
    notes: input.notes ?? [],
  };
}

// ---------------------------------------------------------------------------
// 证据 / 内容分析工具
// ---------------------------------------------------------------------------

function formatInt(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US').format(value);
}

/** 生成内联代码文本（去掉反引号/换行，截断） */
function code(value, maxLength = 160) {
  if (value === null || value === undefined) return '`—`';
  const text = String(value).replace(/`/g, "'").replace(/\s+/g, ' ').trim();
  const clipped = text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
  return `\`${clipped || '∅'}\``;
}

function truncateText(value, maxLength) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

function extractTitle(html) {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html ?? '');
  if (!match) return null;
  return match[1].replace(/\s+/g, ' ').trim().slice(0, 140) || null;
}

function extractHtmlLang(html) {
  const match = /<html\b[^>]*\blang\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(html ?? '');
  if (!match) return null;
  return (match[1] ?? match[2] ?? match[3] ?? '').trim() || null;
}

/** 从跳转结果中提取通用证据（写入 JSON；Markdown 另用 evidenceLines） */
function responseEvidence(result) {
  const evidence = {
    startUrl: result.startUrl,
    finalUrl: result.final?.url ?? null,
    status: result.final?.status ?? null,
    hops: result.hops,
    loop: result.loop,
    exceeded: result.exceeded,
    totalMs: result.totalMs,
    chain: (result.chain ?? []).map((hop) => ({ status: hop.status, from: hop.from, to: hop.to })),
  };
  if (result.final) {
    evidence.bytes = result.final.bytes;
    evidence.contentType = result.final.contentType;
    evidence.bodyTruncated = result.final.bodyTruncated || undefined;
  }
  if (result.blockedRedirect) evidence.blockedRedirect = result.blockedRedirect;
  if (result.error) evidence.error = result.error.message;
  return evidence;
}

/** 跳转链 Markdown（用于 evidenceLines / 报告） */
function chainMarkdown(result) {
  if (!result) return null;
  const parts = [];
  for (const hop of result.chain ?? []) {
    parts.push(`${code(hop.status, 8)} ${code(hop.from, 220)} → ${code(hop.to, 220)}`);
  }
  if (result.final) {
    parts.push(`${code(result.final.status, 8)} ${code(result.final.url, 220)}`);
  } else if (result.blockedRedirect) {
    parts.push(`**BLOCKED**（Deployment Protection：${code(result.blockedRedirect, 220)}，未跟随到外部登录页）`);
  } else if (result.error) {
    parts.push(`请求失败：${truncateText(result.error.message, 160)}`);
  } else {
    parts.push(`无最终响应${result.loop ? '（检测到重定向循环）' : result.exceeded ? '（超过跳数上限）' : ''}`);
  }
  return parts.join(' → ');
}

/** 404 页面标记（任一命中即可视为存在 404 页标记） */
function detect404Markers(html) {
  const found = [];
  const source = html ?? '';
  if (/data-404-page/i.test(source)) found.push('data-404-page 标记');
  if (/page\s+not\s+found/i.test(source)) found.push('"Page not found" 文案');
  const title = extractTitle(source);
  if (title && /\b404\b/.test(title)) found.push('<title> 含 "404"');
  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(source);
  if (h1 && /\b404\b/.test(h1[1].replace(/<[^>]*>/g, ''))) found.push('<h1> 含 "404"');
  return found;
}

function detectAdScripts(html) {
  const lower = (html ?? '').toLowerCase();
  const hits = [];
  if (lower.includes('pagead2')) hits.push('pagead2');
  if (lower.includes('adsbygoogle')) hits.push('adsbygoogle');
  return hits;
}

function detectAutoRedirects(html) {
  const lower = (html ?? '').toLowerCase();
  const hits = [];
  if (lower.includes('location.replace(')) hits.push('location.replace(');
  return hits;
}

/** noindex 检测：<meta name="robots"> 或 X-Robots-Tag 响应头 */
function detectNoindex(html, headers) {
  const headerValue = headers?.['x-robots-tag'] ?? '';
  if (/noindex/i.test(headerValue)) {
    return { present: true, source: 'X-Robots-Tag 响应头', value: headerValue };
  }
  const metaTags = (html ?? '').match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    const nameMatch = /name\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag);
    const name = (nameMatch?.[1] ?? nameMatch?.[2] ?? nameMatch?.[3] ?? '').trim().toLowerCase();
    if (name !== 'robots') continue;
    if (/noindex/i.test(tag)) {
      const contentMatch = /content\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag);
      return {
        present: true,
        source: '<meta name="robots">',
        value: contentMatch ? contentMatch[0] : 'noindex',
      };
    }
  }
  return { present: false, source: null, value: null };
}

function analyze404Page(html, headers) {
  return {
    markers: detect404Markers(html),
    adHits: detectAdScripts(html),
    autoRedirectHits: detectAutoRedirects(html),
    noindex: detectNoindex(html, headers),
    bodyBytes: Buffer.byteLength(html ?? '', 'utf8'),
    bodySnippet: truncateText(html ?? '', 240),
  };
}

// ---------------------------------------------------------------------------
// 检查 a) 关键页面可访问性
// ---------------------------------------------------------------------------

async function checkPages() {
  const items = [];
  for (const path of KEY_PAGES) {
    const url = absolute(path);
    const result = await follow(url);
    /** @type {Array<any>} */
    const assertions = [];
    const evidenceLines = [];
    if (guardResponse(result, assertions)) {
      const status = result.final.status;
      assertions.push(check('最终状态 200', status === 200, { detail: `实际 ${status}` }));
      let finalPath = null;
      try {
        finalPath = new URL(result.final.url).pathname;
      } catch {
        /* ignore */
      }
      assertions.push(
        check(`最终路径 = ${path}`, finalPath === path, {
          level: 'WARN',
          detail: `实际 ${finalPath ?? '(不可解析)'}`,
        }),
      );
      assertions.push(
        check('返回 HTML', /text\/html/i.test(result.final.contentType ?? ''), {
          level: 'WARN',
          detail: `content-type: ${result.final.contentType ?? '(无)'}`,
        }),
      );
      const adHits = detectAdScripts(result.final.body);
      assertions.push(
        check('不含广告脚本（pagead2 / adsbygoogle）', adHits.length === 0, {
          detail: adHits.length > 0 ? `命中：${adHits.join('、')}` : '无命中',
        }),
      );
      const title = extractTitle(result.final.body);
      const htmlLang = extractHtmlLang(result.final.body);
      evidenceLines.push(`最终 URL：${code(result.final.url, 200)}`);
      evidenceLines.push(`状态：\`${status}\` · 字节数：\`${formatInt(result.final.bytes)}\` B`);
      evidenceLines.push(`content-type：${code(result.final.contentType ?? '(无)', 120)}`);
      evidenceLines.push(`title：${title ? code(title) : '`(无 <title>)`'}`);
      evidenceLines.push(`html lang：${htmlLang ? code(htmlLang) : '`(无 lang 属性)`'}`);
      evidenceLines.push(`广告脚本命中：${adHits.length ? `**${adHits.join('、')}**` : '无'}`);
    }
    items.push(
      buildItem({
        id: `page:${path}`,
        category: 'pages',
        name: `关键页面 ${path}`,
        url,
        expected: '最终状态 200，返回 HTML，不含广告脚本',
        assertions,
        evidence: {
          ...responseEvidence(result),
          title: extractTitle(result.final?.body),
          htmlLang: extractHtmlLang(result.final?.body),
        },
        evidenceLines,
      }),
    );
  }
  return items;
}

// ---------------------------------------------------------------------------
// 检查 b) 安全响应头
// ---------------------------------------------------------------------------

async function checkHeaders() {
  const items = [];
  for (const path of HEADER_TARGETS) {
    const url = absolute(path);
    const result = await follow(url);
    /** @type {Array<any>} */
    const assertions = [];
    const evidenceLines = [];
    const headerEvidence = {};
    if (guardResponse(result, assertions)) {
      const headers = result.final.headers;
      for (const spec of SECURITY_HEADERS) {
        const value = headers[spec.key] ?? null;
        headerEvidence[spec.key] = value;
        if (!value || !String(value).trim()) {
          assertions.push(fail(spec.label, '响应头缺失'));
          evidenceLines.push(`${code(spec.key)}：**缺失**`);
          continue;
        }

        let ok = true;
        let detail = `值：${truncateText(value, 120)}`;
        if (spec.mode === 'exact') {
          ok = String(value).trim().toLowerCase() === spec.expect.toLowerCase();
          detail = `期望 ${code(spec.expect)}，实际 ${code(value, 120)}`;
        } else if (spec.mode === 'oneOf') {
          ok = spec.expect.includes(String(value).trim().toUpperCase());
          detail = `期望 ${spec.expect.map((v) => code(v)).join(' / ')}，实际 ${code(value, 120)}`;
        } else if (spec.mode === 'pattern') {
          ok = spec.match.test(String(value));
          detail = ok ? `值：${code(value, 120)}` : `${spec.hint}；实际 ${code(value, 120)}`;
        }
        assertions.push(check(ok ? spec.label : `${spec.label}（取值不合格）`, ok, { detail }));
        evidenceLines.push(`${code(spec.key)}：${ok ? code(truncateText(value, 160)) : `**${truncateText(value, 120)}**（不合格）`}`);
      }

      // CSP 额外提示：若只加 enforce CSP 而未加 Report-Only，给出可诊断信息（不影响判定）
      if (!headers['content-security-policy-report-only'] && headers['content-security-policy']) {
        evidenceLines.push('补充观察：检测到 enforcing `content-security-policy`，但 Phase A 验收矩阵要求的是 `content-security-policy-report-only`。');
      }
      evidenceLines.push(`最终 URL：${code(result.final.url, 200)} · 状态 \`${result.final.status}\``);
    }
    items.push(
      buildItem({
        id: `headers:${path}`,
        category: 'headers',
        name: `安全响应头 ${path}`,
        url,
        expected: 'HSTS / XCTO:nosniff / XFO / Referrer-Policy / Permissions-Policy / CSP-Report-Only 全部存在',
        assertions,
        evidence: {
          ...responseEvidence(result),
          securityHeaders: headerEvidence,
        },
        evidenceLines,
      }),
    );
  }
  return items;
}

// ---------------------------------------------------------------------------
// 检查 c) 重定向
// ---------------------------------------------------------------------------

/** 基础重定向断言（循环 / 超限 / 跳数 / 最终状态 / 最终路径 / query / https / host） */
function redirectAssertions(result, options) {
  /** @type {Array<any>} */
  const assertions = [];
  if (result.error) {
    assertions.push(networkWarn(result.error));
    return assertions;
  }
  const auth = authBlockReason(result);
  if (auth) {
    assertions.push(authWarn(auth));
    return assertions;
  }

  assertions.push(
    check('无重定向循环', !result.loop, {
      detail: result.loop ? '检测到循环（跳转目标回到已访问 URL）' : '未检测到循环',
    }),
  );
  assertions.push(
    check(`未超过最大跳数（${MAX_REDIRECTS}）`, !result.exceeded, {
      detail: result.exceeded ? `已跟随 ${result.hops} 跳仍未结束` : `实际 ${result.hops} 跳`,
    }),
  );
  if (options.expectedHops !== undefined && options.expectedHops !== null) {
    assertions.push(
      check(`跳转次数 = ${options.expectedHops}`, result.hops === options.expectedHops, {
        detail: `实际 ${result.hops} 跳`,
      }),
    );
  }
  assertions.push(
    check('最终状态 200', result.final?.status === 200, {
      detail: result.final ? `实际 ${result.final.status}` : '无最终响应（循环 / 超限 / 请求失败）',
    }),
  );

  let finalUrlObject = null;
  if (result.final?.url) {
    try {
      finalUrlObject = new URL(result.final.url);
    } catch {
      finalUrlObject = null;
    }
  }

  if (options.expectedPath) {
    const actualPath = finalUrlObject?.pathname ?? null;
    assertions.push(
      check(`最终路径 = ${options.expectedPath}`, actualPath === options.expectedPath, {
        detail: `实际 ${actualPath ?? '(无)'}`,
      }),
    );
  }
  if (options.forbidLangParam) {
    const hasLang = finalUrlObject ? finalUrlObject.searchParams.has('lang') : null;
    assertions.push(
      check('最终 URL 不含 ?lang=', hasLang === false, {
        detail: hasLang === null ? '无最终响应' : hasLang ? '最终 URL 仍携带 lang 参数' : '无 lang 参数',
      }),
    );
  }
  if (options.requireHttps) {
    assertions.push(
      check('最终 URL 使用 HTTPS', finalUrlObject?.protocol === 'https:', {
        detail: `实际 ${finalUrlObject?.protocol ?? '(无)'}`,
      }),
    );
  }
  if (options.expectedHost) {
    assertions.push(
      check(`最终主机 = ${options.expectedHost}`, finalUrlObject?.hostname === options.expectedHost, {
        detail: `实际 ${finalUrlObject?.hostname ?? '(无)'}`,
      }),
    );
  }
  return assertions;
}

async function checkNBaseRedirects() {
  const items = [];

  // ?lang=zh|es|ja|tw|en
  for (const spec of LANG_REDIRECTS) {
    const start = absolute(`/?lang=${spec.lang}`);
    const result = await follow(start);
    const assertions = redirectAssertions(result, {
      expectedHops: 1,
      expectedPath: spec.expectedPath,
      forbidLangParam: true,
    });
    items.push(
      buildItem({
        id: `redirect:?lang=${spec.lang}`,
        category: 'redirects',
        name: `/?lang=${spec.lang} → ${spec.expectedPath}`,
        url: start,
        expected: `单跳重定向 → ${spec.expectedPath} 最终 200；最终 URL 不含 ?lang=；无循环`,
        assertions,
        evidence: responseEvidence(result),
        evidenceLines: [`跳转链：${chainMarkdown(result)}`],
      }),
    );
  }

  // /about → /about/
  {
    const start = absolute('/about');
    const result = await follow(start);
    const assertions = redirectAssertions(result, { expectedHops: 1, expectedPath: '/about/' });
    items.push(
      buildItem({
        id: 'redirect:/about',
        category: 'redirects',
        name: '/about → /about/',
        url: start,
        expected: '单跳尾斜杠规范化，最终 200',
        assertions,
        evidence: responseEvidence(result),
        evidenceLines: [`跳转链：${chainMarkdown(result)}`],
      }),
    );
  }

  // /public/tools/square/ → /tools/square/
  {
    const start = absolute('/public/tools/square/');
    const result = await follow(start);
    const assertions = redirectAssertions(result, { expectedHops: 1, expectedPath: '/tools/square/' });
    items.push(
      buildItem({
        id: 'redirect:/public/tools/square/',
        category: 'redirects',
        name: '/public/tools/square/ → /tools/square/',
        url: start,
        expected: '单跳收敛到公开入口，最终 200',
        assertions,
        evidence: responseEvidence(result),
        evidenceLines: [`跳转链：${chainMarkdown(result)}`],
      }),
    );
  }

  return items;
}

async function checkCrossHostRedirects() {
  /** @type {Array<any>} */
  const items = [];
  const applicable = crossHostApplicable();

  const specs = [
    {
      id: 'redirect:http-apex',
      name: 'http://mecollage.top/ → https://www.mecollage.top/',
      start: 'http://mecollage.top/',
      expected: '最终 HTTPS + 主机 www.mecollage.top + 200（跨主机检查，仅生产域评估）',
      requireHttps: true,
      expectedHops: null,
    },
    {
      id: 'redirect:apex-www',
      name: 'https://mecollage.top/ → https://www.mecollage.top/',
      start: 'https://mecollage.top/',
      expected: '最终 HTTPS + 主机 www.mecollage.top + 200（跨主机检查，仅生产域评估）',
      requireHttps: true,
      expectedHops: null,
    },
  ];

  for (const spec of specs) {
    const result = await follow(spec.start);
    /** @type {Array<any>} */
    let assertions;
    const evidenceLines = [`跳转链：${chainMarkdown(result)}`];

    if (!applicable) {
      assertions = [
        warn(
          'N/A（跨主机检查）',
          '该检查指向生产域（mecollage.top），仅在以生产域运行时评估；当前 base 不是生产域，仅记录原始响应供参考。',
        ),
      ];
    } else {
      assertions = redirectAssertions(result, {
        requireHttps: spec.requireHttps,
        expectedHost: 'www.mecollage.top',
      });
      if (spec.id === 'redirect:http-apex') {
        assertions.push(
          check('至少发生一次重定向', result.hops >= 1, {
            level: 'WARN',
            detail: `实际 ${result.hops} 跳`,
          }),
        );
      }
      if (spec.id === 'redirect:apex-www') {
        assertions.push(
          check('跳转次数不超过 2', result.hops >= 1 && result.hops <= 2, {
            level: 'WARN',
            detail: `实际 ${result.hops} 跳`,
          }),
        );
      }
    }

    items.push(
      buildItem({
        id: spec.id,
        category: 'redirects',
        name: spec.name,
        url: spec.start,
        expected: spec.expected,
        assertions,
        evidence: responseEvidence(result),
        evidenceLines,
        applicable,
        notes: applicable ? [] : ['跨主机检查在 Preview / 自定义 base 下仅记录，不参与判定'],
      }),
    );
  }
  return items;
}

async function checkRedirects() {
  const [baseItems, crossHostItems] = await Promise.all([checkNBaseRedirects(), checkCrossHostRedirects()]);
  return [...baseItems, ...crossHostItems];
}

// ---------------------------------------------------------------------------
// 检查 d) 不存在的 URL（404 页）
// ---------------------------------------------------------------------------

async function checkNotFound() {
  const token = randomBytes(6).toString('hex');
  const path = `/this-page-should-not-exist-${token}/`;
  const url = absolute(path);
  const result = await follow(url);
  /** @type {Array<any>} */
  const assertions = [];
  const evidenceLines = [];
  let analysis = null;

  if (guardResponse(result, assertions)) {
    analysis = analyze404Page(result.final.body, result.final.headers);
    const status = result.final.status;
    assertions.push(check('最终状态 404', status === 404, { detail: `实际 ${status}` }));
    assertions.push(
      check('响应体含 404 页标记', analysis.markers.length > 0, {
        detail:
          analysis.markers.length > 0
            ? `命中：${analysis.markers.join('、')}`
            : `未命中（支持：data-404-page / "Page not found" / title 或 h1 含 404）；响应体片段：${code(analysis.bodySnippet, 160)}`,
      }),
    );
    assertions.push(
      check('不含广告脚本（pagead2 / adsbygoogle）', analysis.adHits.length === 0, {
        detail: analysis.adHits.length > 0 ? `命中：${analysis.adHits.join('、')}` : '无命中',
      }),
    );
    assertions.push(
      check('不含自动跳转 location.replace(', analysis.autoRedirectHits.length === 0, {
        detail: analysis.autoRedirectHits.length > 0 ? `命中：${analysis.autoRedirectHits.join('、')}` : '无命中',
      }),
    );
    assertions.push(
      check('含 noindex（meta robots 或 X-Robots-Tag）', analysis.noindex.present, {
        detail: analysis.noindex.present
          ? `来源：${analysis.noindex.source}（${truncateText(analysis.noindex.value, 80)}）`
          : 'meta robots 与 X-Robots-Tag 均未发现 noindex',
      }),
    );
    assertions.push(
      check('响应为 HTML', /text\/html/i.test(result.final.contentType ?? ''), {
        level: 'WARN',
        detail: `content-type: ${result.final.contentType ?? '(无)'}`,
      }),
    );
    evidenceLines.push(`请求路径：${code(path, 200)}（随机 token：\`${token}\`）`);
    evidenceLines.push(`最终 URL：${code(result.final.url, 200)} · 状态 \`${status}\` · 字节数 \`${formatInt(result.final.bytes)}\` B`);
    evidenceLines.push(`404 页标记：${analysis.markers.length ? analysis.markers.map((m) => code(m, 60)).join('、') : '**无**'}`);
    evidenceLines.push(`广告脚本命中：${analysis.adHits.length ? `**${analysis.adHits.join('、')}**` : '无'}`);
    evidenceLines.push(`自动跳转命中：${analysis.autoRedirectHits.length ? `**${analysis.autoRedirectHits.join('、')}**` : '无'}`);
    evidenceLines.push(
      `noindex：${analysis.noindex.present ? `${code(analysis.noindex.source, 80)}（${truncateText(analysis.noindex.value, 80)}）` : '**无**'}`,
    );
    evidenceLines.push(`响应体片段：${code(analysis.bodySnippet, 240)}`);
  }

  return [
    buildItem({
      id: 'notfound:random',
      category: 'notfound',
      name: `不存在的 URL ${path}`,
      url,
      expected: '404 + 404 页标记 + 无广告 + 无自动跳转 + noindex',
      assertions,
      evidence: { ...responseEvidence(result), randomToken: token, analysis },
      evidenceLines,
    }),
  ];
}

// ---------------------------------------------------------------------------
// 检查 e) /404 与 /404/（软 404 记录）
// ---------------------------------------------------------------------------

async function checkSoft404() {
  const items = [];
  for (const path of ['/404', '/404/']) {
    const url = absolute(path);
    const result = await follow(url);
    /** @type {Array<any>} */
    const assertions = [];
    const evidenceLines = [];
    let analysis = null;

    if (guardResponse(result, assertions)) {
      analysis = analyze404Page(result.final.body, result.final.headers);
      const status = result.final.status;

      // 状态：记录项，不强制 404（Vercel 静态站无法对 /404/ 返回 404，除非额外 rewrite）
      if (status === 404) {
        assertions.push(pass('状态记录：404', '标准 404 响应'));
      } else if (status === 200) {
        assertions.push(
          warn(
            '状态记录：200（软 404，记录项不判 FAIL）',
            'Vercel 静态站会将 404.html 当普通页面返回 200；Phase A 通过 noindex 止血，不强制状态码。',
          ),
        );
      } else {
        assertions.push(warn('状态记录', `最终状态 ${status}（预期 200 或 404，记录项）`));
      }

      assertions.push(
        check('含 noindex（meta robots 或 X-Robots-Tag）', analysis.noindex.present, {
          detail: analysis.noindex.present
            ? `来源：${analysis.noindex.source}（${truncateText(analysis.noindex.value, 80)}）`
            : 'meta robots 与 X-Robots-Tag 均未发现 noindex',
        }),
      );
      assertions.push(
        check('不含广告脚本（pagead2 / adsbygoogle）', analysis.adHits.length === 0, {
          detail: analysis.adHits.length > 0 ? `命中：${analysis.adHits.join('、')}` : '无命中',
        }),
      );
      assertions.push(
        check('不含自动跳转 location.replace(', analysis.autoRedirectHits.length === 0, {
          detail: analysis.autoRedirectHits.length > 0 ? `命中：${analysis.autoRedirectHits.join('、')}` : '无命中',
        }),
      );

      evidenceLines.push(`最终 URL：${code(result.final.url, 200)} · 状态 \`${status}\` · 字节数 \`${formatInt(result.final.bytes)}\` B`);
      if (result.hops > 0) evidenceLines.push(`跳转链：${chainMarkdown(result)}`);
      evidenceLines.push(`noindex：${analysis.noindex.present ? `${code(analysis.noindex.source, 80)}（${truncateText(analysis.noindex.value, 80)}）` : '**无**'}`);
      evidenceLines.push(`广告脚本命中：${analysis.adHits.length ? `**${analysis.adHits.join('、')}**` : '无'}`);
      evidenceLines.push(`自动跳转命中：${analysis.autoRedirectHits.length ? `**${analysis.autoRedirectHits.join('、')}**` : '无'}`);
      evidenceLines.push(`响应体片段：${code(analysis.bodySnippet, 200)}`);
    }

    items.push(
      buildItem({
        id: `soft404:${path}`,
        category: 'soft404',
        name: `${path} 页面行为`,
        url,
        expected: '状态记录（不强制 404）+ noindex + 无广告 + 无自动跳转',
        assertions,
        evidence: { ...responseEvidence(result), analysis },
        evidenceLines,
      }),
    );
  }
  return items;
}

// ---------------------------------------------------------------------------
// 检查 f) 遗留文件暴露面
// ---------------------------------------------------------------------------

async function checkLegacy() {
  const items = [];
  for (const file of LEGACY_FILES) {
    const url = absolute(file.path);
    const result = await follow(url);
    /** @type {Array<any>} */
    const assertions = [];
    const evidenceLines = [];

    if (guardResponse(result, assertions)) {
      const status = result.final.status;
      if (status === 404) {
        assertions.push(pass('最终状态 404（已删除/已排除）'));
      } else if (status === 200) {
        assertions.push(
          fail('最终状态 404（已删除/已排除）', `仍可公开访问：200，${formatInt(result.final.bytes)} B，${truncateText(result.final.contentType ?? '', 60)}`),
        );
        evidenceLines.push(`内容片段：${code(truncateText(result.final.body, 200), 200)}`);
      } else {
        assertions.push(
          warn('最终状态记录', `实际 ${status}（预期 404；可能被平台层拦截，需人工确认）`),
        );
      }
      if (result.hops > 0) evidenceLines.push(`跳转链：${chainMarkdown(result)}`);
      evidenceLines.push(
        `最终 URL：${code(result.final.url, 200)} · 状态 \`${status}\` · 字节数 \`${formatInt(result.final.bytes)}\` B`,
      );
    }

    items.push(
      buildItem({
        id: `legacy:${file.path}`,
        category: 'legacy',
        name: `遗留文件 ${file.path}（${file.label}）`,
        url,
        expected: 'Phase A 后最终状态 404（删除或 .vercelignore 排除）',
        assertions,
        evidence: responseEvidence(result),
        evidenceLines,
      }),
    );
  }
  return items;
}

// ---------------------------------------------------------------------------
// 检查 g) 关键资产回归
// ---------------------------------------------------------------------------

function assetSpecificLines(asset, result) {
  const lines = [];
  const body = result.final?.body ?? '';
  if (asset.kind === 'sitemap') {
    const locCount = (body.match(/<loc>/gi) ?? []).length;
    lines.push(`<urlset>：${/<urlset\b/i.test(body) ? '存在' : '**缺失**'} · <loc> 数量：\`${locCount}\``);
    return { lines };
  }
  if (asset.kind === 'robots') {
    lines.push(`User-agent：${/user-agent\s*:/i.test(body) ? '存在' : '**缺失**'} · Sitemap 声明：${/sitemap\s*:/i.test(body) ? '存在' : '**缺失**'}`);
    return { lines };
  }
  if (asset.kind === 'json') {
    let parsed = false;
    let keys = 0;
    try {
      const data = JSON.parse(body);
      parsed = true;
      keys = data && typeof data === 'object' ? Object.keys(data).length : 0;
    } catch {
      parsed = false;
    }
    lines.push(`JSON 可解析：${parsed ? '是' : '**否**'}${parsed ? ` · 顶层键数量：\`${keys}\`` : ''}`);
    return { parsed, lines };
  }
  if (asset.kind === 'binary') {
    lines.push('二进制资源，仅校验状态与字节数');
    return { lines };
  }
  return { lines };
}

async function checkAssets() {
  const items = [];
  for (const asset of KEY_ASSETS) {
    const url = absolute(asset.path);
    const result = await follow(url);
    /** @type {Array<any>} */
    const assertions = [];
    const evidenceLines = [];

    if (guardResponse(result, assertions)) {
      const status = result.final.status;
      assertions.push(check('最终状态 200', status === 200, { detail: `实际 ${status}` }));

      const specific = assetSpecificLines(asset, result);
      evidenceLines.push(...specific.lines);

      if (asset.kind === 'sitemap' && status === 200) {
        assertions.push(
          check('sitemap 含 <urlset>', /<urlset\b/i.test(result.final.body), {
            level: 'WARN',
            detail: `<loc> 数量 ${(result.final.body.match(/<loc>/gi) ?? []).length}`,
          }),
        );
      }
      if (asset.kind === 'robots' && status === 200) {
        assertions.push(
          check('robots.txt 含 User-agent', /user-agent\s*:/i.test(result.final.body), { level: 'WARN' }),
        );
        assertions.push(
          check('robots.txt 含 Sitemap 声明', /sitemap\s*:/i.test(result.final.body), { level: 'WARN' }),
        );
      }
      if (asset.kind === 'json' && status === 200) {
        assertions.push(
          check('i18n/zh.json 可被 JSON.parse', specific.parsed === true, { level: 'WARN' }),
        );
      }

      evidenceLines.push(
        `最终 URL：${code(result.final.url, 200)} · 状态 \`${status}\` · 字节数 \`${formatInt(result.final.bytes)}\` B · content-type：${code(result.final.contentType ?? '(无)', 100)}`,
      );
      if (result.hops > 0) evidenceLines.push(`跳转链：${chainMarkdown(result)}`);
    }

    items.push(
      buildItem({
        id: `asset:${asset.path}`,
        category: 'assets',
        name: `关键资产 ${asset.path}（${asset.label}）`,
        url,
        expected: '最终状态 200，内容未被误改/误删',
        assertions,
        evidence: responseEvidence(result),
        evidenceLines,
      }),
    );
  }
  return items;
}

// ---------------------------------------------------------------------------
// 检查 h) 默认域 X-Robots-Tag
// ---------------------------------------------------------------------------

async function checkDefaultDomain() {
  const result = await follow(DEFAULT_DOMAIN_URL);
  const applicable = crossHostApplicable();
  /** @type {Array<any>} */
  const assertions = [];
  const evidenceLines = [];

  if (!applicable) {
    assertions.push(
      warn(
        'N/A（跨主机检查）',
        '默认域 mecollage.vercel.app 的 host 级 X-Robots-Tag 只能在生产部署验证；当前 base 不是生产域，仅记录默认域当前响应供参考。',
      ),
    );
    if (result.final) {
      evidenceLines.push(
        `默认域当前：状态 \`${result.final.status}\` · X-Robots-Tag：${result.final.headers['x-robots-tag'] ? code(result.final.headers['x-robots-tag']) : '**无**'}`,
      );
    } else if (result.error) {
      evidenceLines.push(`默认域请求失败：${truncateText(result.error.message, 160)}`);
    }
  } else if (guardResponse(result, assertions)) {
    const status = result.final.status;
    const xRobotsTag = result.final.headers['x-robots-tag'] ?? '';
    assertions.push(check('最终状态 200', status === 200, { detail: `实际 ${status}` }));
    assertions.push(
      check('X-Robots-Tag 含 noindex', /noindex/i.test(xRobotsTag), {
        detail: xRobotsTag ? `实际值：${truncateText(xRobotsTag, 120)}` : '响应无 X-Robots-Tag',
      }),
    );
    evidenceLines.push(`最终 URL：${code(result.final.url, 200)} · 状态 \`${status}\``);
    evidenceLines.push(`x-robots-tag：${xRobotsTag ? code(xRobotsTag, 160) : '**缺失**'}`);
    evidenceLines.push(`content-type：${code(result.final.contentType ?? '(无)', 100)} · 字节数 \`${formatInt(result.final.bytes)}\` B`);
  }

  return [
    buildItem({
      id: 'default-domain:x-robots-tag',
      category: 'default-domain',
      name: `默认域 ${DEFAULT_DOMAIN_URL} X-Robots-Tag`,
      url: DEFAULT_DOMAIN_URL,
      expected: '状态 200 且 X-Robots-Tag 含 noindex（避免与主域重复收录）',
      assertions,
      evidence: responseEvidence(result),
      evidenceLines,
      applicable,
      notes: applicable ? [] : ['默认域配置需生产部署后复跑验证'],
    }),
  ];
}

// ---------------------------------------------------------------------------
// 汇总 / 输出
// ---------------------------------------------------------------------------

/** 尽力记录被验收仓库的 git 信息（便于把证据与 commit 对应；无 git 环境时不报错） */
function readGitInfo() {
  try {
    const head = execSync('git rev-parse HEAD', { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return { head, branch };
  } catch {
    return null;
  }
}

function countStatuses(items) {
  const counts = { pass: 0, fail: 0, warn: 0 };
  for (const item of items) {
    if (item.status === 'FAIL') counts.fail += 1;
    else if (item.status === 'WARN') counts.warn += 1;
    else counts.pass += 1;
  }
  return counts;
}

function buildReport({ cli, results, startedAt, blocked, blockedReason, unreachable, globalNotes }) {
  const counts = countStatuses(results);
  const total = results.length;
  const verdict = counts.fail > 0 ? 'FAIL' : blocked ? 'BLOCKED' : unreachable ? 'INCONCLUSIVE' : 'PASS';
  const exitCode = counts.fail > 0 ? 1 : blocked || unreachable ? 2 : 0;
  const categories = blocked ? [BLOCKED_CATEGORY, ...CATEGORIES] : CATEGORIES;

  const byCategory = {};
  for (const category of categories) {
    const categoryItems = results.filter((item) => item.category === category.id);
    byCategory[category.id] = { ...countStatuses(categoryItems), total: categoryItems.length };
  }

  return {
    tool: TOOL,
    version: VERSION,
    generatedAt: new Date().toISOString(),
    durationMs: Math.round(performance.now() - startedAt),
    label: cli.label,
    base: cli.baseHref,
    baseHost: cli.host,
    mode: cli.mode,
    blocked,
    blockedReason,
    unreachable,
    timeoutMs: cli.timeoutMs,
    maxRedirects: MAX_REDIRECTS,
    commandLine: cli.commandLine,
    requestHeaderNames: cli.requestHeaderNames,
    bypassHeaderApplied: cli.bypassHeaderApplied,
    bypassSource: cli.bypassSource,
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    cwd: process.cwd(),
    git: readGitInfo(),
    summary: {
      total,
      pass: counts.pass,
      fail: counts.fail,
      warn: counts.warn,
      verdict,
      exitCode,
    },
    categories,
    byCategory,
    globalNotes,
    results,
  };
}

function printConsole(report, outputPaths) {
  const lines = [];
  lines.push('');
  lines.push(`MeCollage 部署验收 — ${report.label}`);
  lines.push(`base: ${report.base}`);
  lines.push(
    `模式: ${report.mode} · 单请求超时: ${report.timeoutMs} ms · 最多跳转: ${report.maxRedirects} 跳 · 用时: ${(report.durationMs / 1000).toFixed(1)} s`,
  );
  if (report.blocked) {
    lines.push('🔒 BLOCKED：Preview 受 Vercel Deployment Protection 保护，需 maintainer 提供 bypass secret 或代跑。');
    lines.push(`   检测方式：${report.blockedReason}；脚本不会尝试绕过认证，未产生 PASS/FAIL。`);
    lines.push('   三种验收方式见 scripts/README.md（A 提供 bypass secret；B 用已登录 Vercel 的 vercel curl / 浏览器；C 临时关闭 Protection）。');
  }
  if (report.unreachable) {
    lines.push('❌ 初始连接失败：目标 base 不可达，其余检查已跳过（结论不可判定）。');
  }
  lines.push('');

  for (const category of report.categories) {
    const categoryItems = report.results.filter((item) => item.category === category.id);
    if (categoryItems.length === 0) continue;
    lines.push(`── ${category.letter}) ${category.title} ──`);
    for (const item of categoryItems) {
      const icon = item.status === 'PASS' ? '✅' : item.status === 'FAIL' ? '❌' : '⚠️';
      const na = item.applicable ? '' : ' [N/A]';
      lines.push(`${icon} ${item.id}${na}`);
      if (item.status !== 'PASS') {
        for (const assertion of item.assertions) {
          if (assertion.status === 'PASS') continue;
          lines.push(
            `    ${assertion.status} ${assertion.label}${assertion.detail ? ` — ${assertion.detail}` : ''}`,
          );
        }
      }
    }
    lines.push('');
  }

  lines.push(
    `汇总: PASS=${report.summary.pass}  FAIL=${report.summary.fail}  WARN=${report.summary.warn}  合计=${report.summary.total}`,
  );
  lines.push(`判定: ${report.summary.verdict} → 退出码 ${report.summary.exitCode}`);
  if (outputPaths.json) lines.push(`JSON 已写入: ${outputPaths.json}`);
  if (outputPaths.md) lines.push(`Markdown 已写入: ${outputPaths.md}`);
  lines.push('');

  console.log(lines.join('\n'));

  if (report.globalNotes.length > 0) {
    console.log('备注：');
    for (const note of report.globalNotes) console.log(`  - ${note}`);
    console.log('');
  }
}

// ---------------------------------------------------------------------------
// Markdown 报告
// ---------------------------------------------------------------------------

function mdEscapeCell(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ');
}

function itemActualSummary(item) {
  const evidence = item.evidence ?? {};
  if (evidence.error) return `请求失败：${evidence.error}`;
  const parts = [];
  if (evidence.status !== null && evidence.status !== undefined) parts.push(`状态 ${evidence.status}`);
  if (evidence.finalUrl) parts.push(evidence.finalUrl);
  if (evidence.hops) parts.push(`${evidence.hops} 跳`);
  if (evidence.bytes !== null && evidence.bytes !== undefined) parts.push(`${formatInt(evidence.bytes)} B`);
  return parts.length > 0 ? parts.join(' · ') : '—';
}

function renderMarkdown(report) {
  const out = [];
  const s = report.summary;

  out.push(`# MeCollage 部署验收报告 — ${report.label}`);
  out.push('');
  out.push(`> 由 \`scripts/verify-site.mjs\` v${report.version} 自动生成；本文件是部署验收证据，请连同 JSON 一起归档。`);
  out.push('');
  out.push('| 项目 | 值 |');
  out.push('|---|---|');
  out.push(`| 生成时间 | ${report.generatedAt} |`);
  out.push(`| 目标 base | \`${report.base}\` |`);
  out.push(`| 运行模式 | ${report.mode} |`);
  out.push(`| 标签 | ${report.label} |`);
  out.push(`| 单请求超时 | ${report.timeoutMs} ms |`);
  out.push(`| 最大跳转 | ${report.maxRedirects} 跳 |`);
  out.push(`| 用时 | ${(report.durationMs / 1000).toFixed(1)} s |`);
  out.push(`| Node / 平台 | ${report.node} / ${report.platform} |`);
  out.push(
    `| 本地仓库 HEAD（证据对应，非线上部署证明） | ${report.git ? `${report.git.head.slice(0, 12)}（${report.git.branch}）` : '（不可用：当前目录无 git 信息）'} |`,
  );
  out.push(
    `| Deployment Protection 阻断 | ${report.blocked ? `是（BLOCKED：${report.blockedReason}）` : '否'} |`,
  );
  out.push(
    `| 自定义请求头 | ${
      report.requestHeaderNames.length > 0
        ? `${report.requestHeaderNames.map((name) => `\`${name}\``).join('、')}${report.bypassHeaderApplied ? '（bypass 值已脱敏，不落盘）' : ''}`
        : '无'
    } |`,
  );
  out.push(`| 目标不可达 | ${report.unreachable ? '是' : '否'} |`);
  out.push(`| 命令 | \`${mdEscapeCell(report.commandLine)}\` |`);
  out.push('');

  if (report.blocked) {
    out.push('## ⛔ 验收被阻断（BLOCKED）');
    out.push('');
    out.push(
      'Preview 受 Vercel Deployment Protection 保护，需 maintainer 提供 bypass secret 或代跑。本报告不产生 PASS/FAIL 判定。',
    );
    out.push('');
    out.push('| 方式 | 操作 |');
    out.push('|---|---|');
    out.push(
      '| A（推荐） | 维护者提供 `VERCEL_AUTOMATION_BYPASS_SECRET`，复跑：`VERCEL_AUTOMATION_BYPASS_SECRET=<secret> node scripts/verify-site.mjs --base <preview-url> --json … --md …`；或 `--header "x-vercel-protection-bypass: <secret>"` |',
    );
    out.push('| B | 用已登录 Vercel 的 `vercel curl`（或浏览器）打开 Preview 人工核对，再对未受保护部署跑本脚本取证 |');
    out.push('| C（不推荐） | Vercel Dashboard → Project → Settings → Deployment Protection 临时关闭 → 复跑 → 立即恢复 |');
    out.push('');
  }

  if (report.globalNotes.length > 0) {
    out.push('## 备注');
    out.push('');
    for (const note of report.globalNotes) out.push(`- ${note}`);
    out.push('');
  }

  out.push('## 汇总');
  out.push('');
  out.push('| 结果 | 数量 |');
  out.push('|---|---|');
  out.push(`| PASS | ${s.pass} |`);
  out.push(`| FAIL | ${s.fail} |`);
  out.push(`| WARN | ${s.warn} |`);
  out.push(`| 合计 | ${s.total} |`);
  out.push('');
  out.push(
    `**判定：${s.verdict}**（退出码 ${s.exitCode}${
      s.verdict === 'INCONCLUSIVE' ? '；目标不可达，结论不可判定' : s.verdict === 'BLOCKED' ? '；验收被 Deployment Protection 阻断，结论不可判定' : ''
    }）`,
  );
  out.push('');

  out.push('### 分类汇总');
  out.push('');
  out.push('| 分类 | PASS | FAIL | WARN | 合计 |');
  out.push('|---|---|---|---|---|');
  for (const category of report.categories) {
    const counts = report.byCategory[category.id];
    if (!counts || counts.total === 0) continue; // BLOCKED / 不可达时只展示实际执行的分类
    out.push(
      `| ${category.letter}) ${mdEscapeCell(category.title)} | ${counts.pass} | ${counts.fail} | ${counts.warn} | ${counts.total} |`,
    );
  }
  out.push('');

  const failingAssertions = [];
  const warningAssertions = [];
  for (const item of report.results) {
    for (const assertion of item.assertions) {
      if (assertion.status === 'FAIL') failingAssertions.push({ item, assertion });
      if (assertion.status === 'WARN') warningAssertions.push({ item, assertion });
    }
  }

  out.push('## 失败明细（FAIL）');
  out.push('');
  if (failingAssertions.length === 0) {
    out.push('无。');
  } else {
    out.push('| 分类 | 检查项 | 失败断言 | 实际 |');
    out.push('|---|---|---|---|');
    for (const { item, assertion } of failingAssertions) {
      out.push(
        `| ${mdEscapeCell(item.category)} | \`${mdEscapeCell(item.id)}\` | ${mdEscapeCell(assertion.label)} | ${mdEscapeCell(assertion.detail ?? '')} |`,
      );
    }
  }
  out.push('');

  out.push('## 警告明细（WARN）');
  out.push('');
  if (warningAssertions.length === 0) {
    out.push('无。');
  } else {
    out.push('| 分类 | 检查项 | 警告断言 | 说明 |');
    out.push('|---|---|---|---|');
    for (const { item, assertion } of warningAssertions) {
      out.push(
        `| ${mdEscapeCell(item.category)} | \`${mdEscapeCell(item.id)}\` | ${mdEscapeCell(assertion.label)} | ${mdEscapeCell(assertion.detail ?? '')} |`,
      );
    }
  }
  out.push('');

  out.push('## 详细结果');
  out.push('');
  for (const category of report.categories) {
    const categoryItems = report.results.filter((item) => item.category === category.id);
    if (categoryItems.length === 0) continue;
    out.push(`### ${category.letter}) ${category.title}`);
    out.push('');
    out.push(`_${category.description}_`);
    out.push('');
    for (const item of categoryItems) {
      const icon = item.status === 'PASS' ? '✅' : item.status === 'FAIL' ? '❌' : '⚠️';
      const na = item.applicable ? '' : ' · N/A';
      out.push(`#### ${icon} \`${item.id}\` — ${item.name}`);
      out.push('');
      out.push(`- **结果**：${item.status}${na}`);
      out.push(`- **预期**：${item.expected}`);
      out.push(`- **实际**：${mdEscapeCell(itemActualSummary(item))}`);
      out.push('- **断言**：');
      for (const assertion of item.assertions) {
        const assertionIcon = assertion.status === 'PASS' ? '✅' : assertion.status === 'FAIL' ? '❌' : '⚠️';
        out.push(
          `  - ${assertionIcon} ${assertion.label}${assertion.detail ? ` — ${mdEscapeCell(assertion.detail)}` : ''}`,
        );
      }
      if (item.evidenceLines.length > 0) {
        out.push('- **证据**：');
        for (const line of item.evidenceLines) out.push(`  - ${line}`);
      }
      for (const note of item.notes) out.push(`- **备注**：${note}`);
      out.push('');
    }
  }

  out.push('---');
  out.push('');
  out.push('判定规则：FAIL > 0 → 退出码 1；WARN 不影响退出码；Preview 认证阻断 / 目标不可达 / 参数错误 → 退出码 2（结论不可判定）。');
  out.push('跨主机检查（http→https、apex→www、默认域 X-Robots-Tag）仅在以生产域运行（www.mecollage.top / mecollage.top / mecollage.vercel.app）时参与判定，其余 base 下标记 N/A。');
  out.push('');
  return out.join('\n');
}

async function writeOutputs(report, cli, outputPaths, markdown) {
  /** @type {string[]} */
  const errors = [];
  if (cli.jsonPath) {
    try {
      await mkdir(dirname(cli.jsonPath), { recursive: true });
      await writeFile(cli.jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      outputPaths.json = cli.jsonPath;
    } catch (err) {
      errors.push(`写入 JSON 失败：${cli.jsonPath}：${err.message}`);
      outputPaths.json = null;
    }
  }
  if (cli.mdPath) {
    try {
      await mkdir(dirname(cli.mdPath), { recursive: true });
      await writeFile(cli.mdPath, markdown, 'utf8');
      outputPaths.md = cli.mdPath;
    } catch (err) {
      errors.push(`写入 Markdown 失败：${cli.mdPath}：${err.message}`);
      outputPaths.md = null;
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

/** 目标被 Deployment Protection 阻断时唯一的结果项（避免几十条虚假 FAIL/WARN） */
function buildBlockedItem(cli, initial, reason) {
  const reasonText =
    reason === '401'
      ? '初始请求返回 HTTP 401（Vercel Deployment Protection）'
      : '初始请求被 302 到 https://vercel.com/sso-api…（Vercel Authentication / Deployment Protection）';
  return buildItem({
    id: 'blocked:deployment-protection',
    category: 'blocked',
    name: 'Vercel Deployment Protection 拦截',
    url: cli.baseHref,
    expected: '可直接访问（未启用 Deployment Protection，或已提供有效 bypass secret）',
    assertions: [
      warn('验收被 Deployment Protection 阻断（BLOCKED）', reasonText),
      warn(
        'Preview 受 Vercel Deployment Protection 保护，需 maintainer 提供 bypass secret 或代跑',
        '三种验收方式见 scripts/README.md：A 提供 VERCEL_AUTOMATION_BYPASS_SECRET；B 用已登录 Vercel 的 vercel curl / 浏览器；C 临时关闭 Protection（不推荐）。',
      ),
    ],
    evidence: { ...responseEvidence(initial), blockedReason: reason },
    evidenceLines: [
      `blockedReason：${code(reason)}`,
      `跳转链：${chainMarkdown(initial)}`,
      ...(cli.bypassHeaderApplied
        ? ['已携带 bypass 请求头，但仍被拦截：secret 可能无效/过期，或该部署不在 bypass 范围内。']
        : ['未携带 bypass 请求头（可通过 --header 或 VERCEL_AUTOMATION_BYPASS_SECRET 提供）。']),
    ],
  });
}

async function run() {
  const startedAt = performance.now();
  const cli = parseCli();
  site = cli;

  const globalNotes = [];
  if (cli.mode === 'preview') {
    globalNotes.push(
      '当前 base 为 Vercel Preview：安全头 / 404 / ?lang= 重定向 / 遗留文件 / 关键资产检查均适用于 Preview；跨主机检查（http→https、apex→www、默认域 X-Robots-Tag）标 N/A，需生产部署后复跑。',
    );
    globalNotes.push(
      '若 Preview 302 → vercel.com/sso-api 或返回 401，说明启用了 Vercel Deployment Protection；脚本判定为 BLOCKED、不尝试绕过，需 maintainer 提供 bypass secret 或代跑。',
    );
  } else if (cli.mode === 'custom') {
    globalNotes.push(
      '当前 base 不是已知生产域（mecollage.top / mecollage.vercel.app）：跨主机检查标 N/A，仅做记录；其余检查适用于任意静态部署。',
    );
  }
  if (cli.mode === 'production') {
    globalNotes.push(
      '以生产域运行：若本报告用于 Phase A 上线后验证，跨主机检查（http→https、apex→www、默认域 X-Robots-Tag）会参与判定。',
    );
  }

  // 初始探测（首页 `/`）：区分 ① Deployment Protection 阻断 ② 站点不可达 ③ 正常
  const initial = await follow(absolute('/'));
  const protectionReason = detectProtection(initial);
  const blocked = protectionReason !== null;
  const unreachable = !blocked && initial.error !== null;

  if (blocked) {
    globalNotes.push(
      'Preview 受 Vercel Deployment Protection 保护，需 maintainer 提供 bypass secret 或代跑；脚本不尝试绕过认证，未产生 PASS/FAIL。',
    );
    globalNotes.push(
      '方式 A（推荐）：设置 VERCEL_AUTOMATION_BYPASS_SECRET 后复跑，或用 --header "x-vercel-protection-bypass: <secret>"。方式 B：用已登录 Vercel 的 vercel curl / 浏览器打开。方式 C：临时关闭 Protection（不推荐，验收后恢复）。',
    );
    if (cli.bypassHeaderApplied) {
      globalNotes.push('本次运行已携带 bypass 请求头但仍被拦截：secret 可能无效/过期，或 Deployment Protection 范围不包含该部署。');
    }
  }
  if (unreachable) {
    globalNotes.push(`初始探测失败：${initial.error.message}。其余检查已跳过，避免对不可达目标重复超时等待。`);
  }

  /** @type {Array<any>} */
  let results = [];
  if (blocked) {
    // 被访问控制阻断时不再跑矩阵：任何请求都会被 SSO 跳转拦截，避免几十条虚假 FAIL/WARN
    results = [buildBlockedItem(cli, initial, protectionReason)];
  } else if (unreachable) {
    results = [
      buildItem({
        id: 'connectivity:base',
        category: 'pages',
        name: `目标 base 连通性 ${cli.baseHref}`,
        url: cli.baseHref,
        expected: '能够建立 HTTP 连接并返回响应',
        assertions: [networkWarn(initial.error)],
        evidence: responseEvidence(initial),
        evidenceLines: [`请求失败：${truncateText(initial.error.message, 200)}`],
      }),
    ];
  } else {
    const groups = await Promise.all([
      checkPages(),
      checkHeaders(),
      checkRedirects(),
      checkNotFound(),
      checkSoft404(),
      checkLegacy(),
      checkAssets(),
      checkDefaultDomain(),
    ]);
    results = groups.flat();
  }

  const report = buildReport({
    cli,
    results,
    startedAt,
    blocked,
    blockedReason: protectionReason,
    unreachable,
    globalNotes,
  });

  const markdown = renderMarkdown(report);
  const outputPaths = { json: null, md: null };
  const outputErrors = await writeOutputs(report, cli, outputPaths, markdown);
  if (outputErrors.length > 0) {
    report.outputErrors = outputErrors;
    for (const error of outputErrors) console.error(`[verify-site] ${error}`);
    report.summary.exitCode = 2;
  }

  printConsole(report, outputPaths);
  process.exitCode = report.summary.exitCode;
}

run().catch((err) => {
  console.error('[verify-site] 未预期错误：', err);
  process.exitCode = 2;
});
