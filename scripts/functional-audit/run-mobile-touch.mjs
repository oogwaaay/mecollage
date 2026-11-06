#!/usr/bin/env node
/**
 * MeCollage R2 移动端触摸交互回归 v1.0.0
 * ============================================================================
 * 背景（R1 遗留 / 真机无法自动覆盖的项）：
 *   - 移动端导航折叠（Phase G R0）是否单行 ≤64px、菜单开合/Esc/焦点返回；
 *   - 语言抽屉是否完整落在 390×844 视口内、选项 ≥44px；
 *   - 触控拖拽排序（main.js bindTouchReorder：长按 250ms + pointer capture）是否真的改变图片顺序；
 *   - **滚动后导出**（L-36：html2canvas foreignObject 按滚动偏移克隆，页面已滚动时可能导出全白）；
 *   - 移动端触控目标 ≥44×44。
 *
 * 零依赖：Node ≥ 20（验证于 v24）+ 本地 Chrome + 复用
 *   scripts/functional-audit/cdp.mjs（CDP 客户端）
 *   scripts/seo-audit/server.mjs（本地 Vercel 路由模拟）
 * 通过 CDP `Emulation.setDeviceMetricsOverride(mobile:true)` +
 * `Emulation.setTouchEmulationEnabled` + `Input.dispatchTouchEvent` 模拟 390×844 真机触摸。
 *
 * 用法：
 *   node scripts/functional-audit/run-mobile-touch.mjs
 *   node scripts/functional-audit/run-mobile-touch.mjs --json out.json --md out.md --shots dir
 *   node scripts/functional-audit/run-mobile-touch.mjs --base https://preview.example/   # 对 Preview/线上跑
 *   node scripts/functional-audit/run-mobile-touch.mjs --keep-open                        # 调试保留 Chrome
 *
 * 退出码：0 = 无 FAIL（WARN 允许）；1 = 存在 FAIL；2 = 环境/用法错误。
 *
 * 覆盖口径与限制见 scripts/functional-audit/README.md §6。
 */

import { parseArgs } from 'node:util';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

import { launchChrome, ChromePage } from './cdp.mjs';
import { startStaticServer } from '../seo-audit/server.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..', '..');
const TOOL = 'mobile-touch';
const VERSION = '1.0.0';

const VIEWPORT = { width: 390, height: 844 };
/** 外部请求拦截（广告/统计 + AI 大库 + 字体）；保留 cdnjs（html2canvas 导出依赖，与生产一致） */
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
const DEFAULT_OUT_DIR = join(ROOT, 'audit/design-migration/r2/mobile-touch');

/**
 * 本轮（2026-11-06）由「交互后状态」断言发现的产品问题 / 门禁盲区。
 * 说明：这些控件或打开态在「静态首屏 / 未交互」时不可见，check-layout 的静态扫描测不到；
 * 本脚本在「上传后 / 点按后」再断言，是 L-39 候选（交互后才出现的状态必须在交互后测）。
 */
const PRODUCT_FINDINGS = [
  {
    id: 'L-39',
    title: '交互后才出现 / 打开态才可见的控件，必须在交互后断言（静态首屏门禁会漏测）',
    detail:
      'MT-06 的底部工具栏按钮只有上传图片后才显示（初始 display:none），MT-02 的导航展开面板只有点按菜单后才存在。' +
      '两者都从 check-layout 的静态首屏扫描中漏过：前者 8 个按钮实测宽只有 14–24px（flex-shrink），后者 position:absolute;top:100% 因移动端 .ghibli-nav{position:static} 锚到 .app-container 整页底部（y=4524，视口 844）。' +
      '两者均由本脚本在交互后状态断言发现并修复。',
  },
  {
    id: 'MT-06/产品缺陷已修',
    title: '390 底部工具栏触控目标 14–24px（应 ≥44×44）',
    detail:
      '根因：5 个首页内联 .bottom-toolbar{max-width:300px;gap:1rem;padding:1rem} + R0 新增 undo/redo 后 8 个按钮在 300px 内被 flex-shrink。' +
      '修复：components.css 移动端覆盖（max-width:none / width:100% / 内部横向滚动 / 按钮 flex:0 0 auto + 44×44）。修复后本脚本 MT-06 PASS。',
  },
  {
    id: 'MT-02/产品缺陷已修',
    title: '移动导航展开面板在页面底部、视口外（点 ☰ 看不到菜单）',
    detail:
      '根因：bundle @media(max-width:768px) 把 .ghibli-nav 设成 position:static，展开面板 .nav-left{position:absolute;top:100%} 的 offsetParent 变成 .app-container（高度=整页），面板被定位到页面最底部（实测 y=4524 / 视口 844）。' +
      '修复：移动端给 body .ghibli-nav 补 position:relative，使面板锚定在 60px 顶栏下方（面板 y=60、链接在视口内）。修复后本脚本 MT-02 PASS。',
  },
];

const args = parseArgs({
  options: {
    help: { type: 'boolean', short: 'h', default: false },
    json: { type: 'string' },
    md: { type: 'string' },
    shots: { type: 'string' },
    base: { type: 'string' },
    fixtures: { type: 'string' },
    'keep-open': { type: 'boolean', default: false },
    'max-list': { type: 'string', default: '20' },
  },
  allowPositionals: false,
});

if (args.values.help) {
  console.log(`MeCollage 移动端触摸/导航/滚动导出回归 v${VERSION}

用法：node scripts/functional-audit/run-mobile-touch.mjs [选项]
  --json <path>     报告 JSON 输出（默认 audit/design-migration/r2/mobile-touch/report.json）
  --md <path>       报告 Markdown 输出（默认同目录 report.md）
  --shots <dir>     截图目录（默认同目录 screenshots/）
  --base <url>      对已部署地址跑（默认本地 Vercel 模拟服务器）
  --fixtures <dir>  测试图目录（默认 scripts/functional-audit/fixtures，其次 audit/evidence/phase-f/browser/fixtures）
  --keep-open       调试用：保留 headless Chrome 进程（结束需手动清理）
  --max-list <n>    报告中每项截断条数（默认 20）
  -h, --help        显示帮助

覆盖：
  MT-01 移动导航结构（390×844 下顶栏 ≤64px / 品牌 + 菜单按钮 / 无横向溢出）
  MT-02 移动导航行为（触摸开合 / aria-expanded / Esc 关闭 + 焦点返回 / 展开面板触控目标）
  MT-03 语言抽屉（落在视口内 / 选项 ≥44px / 打开聚焦 / Esc 关闭 + 焦点返回）
  MT-04 触控拖拽排序（长按 250ms → 移动 → 释放；图片顺序变化且无丢失）
  MT-05 滚动后导出（scrollTo(0,600) → #exportBtn → 导出像素非全白、无异常）
  MT-06 触控目标（工具栏 / 导航 / 语言 / 菜单按钮 ≥44×44）
  MT-07 Aspect Ratio Calculator（390×844 无溢出 / 控件 ≥44 / 触摸 9:16 换算）

退出码：0 无 FAIL；1 有 FAIL；2 环境/用法错误。
需要网络访问 cdnjs（html2canvas，导出用例依赖，与生产一致）；其余外部请求被拦截。`);
  process.exit(0);
}

const MAX_LIST = Math.max(1, Number.parseInt(args.values['max-list'], 10) || 20);
const OUT_DIR = join(ROOT, 'audit/design-migration/r2/mobile-touch');
const JSON_PATH = resolve(ROOT, args.values.json || join(OUT_DIR, 'report.json'));
const MD_PATH = resolve(ROOT, args.values.md || join(OUT_DIR, 'report.md'));
const SHOTS_DIR = resolve(ROOT, args.values.shots || join(OUT_DIR, 'screenshots'));

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function locateFixtures(explicitDir) {
  const candidates = explicitDir
    ? [resolve(ROOT, explicitDir)]
    : [join(ROOT, 'scripts/functional-audit/fixtures'), join(ROOT, 'audit/evidence/phase-f/browser/fixtures')];
  for (const dir of candidates) {
    const needed = ['multi-01.png', 'multi-02.png', 'multi-03.png', 'multi-04.png'];
    if (needed.every((f) => existsSync(join(dir, f)))) {
      const manifestPath = join(dir, 'manifest.json');
      let manifest = null;
      try {
        manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      } catch {
        manifest = null;
      }
      return { dir, files: needed.map((f) => join(dir, f)), manifest };
    }
  }
  return null;
}

function gitInfo() {
  const run = (cmd) => {
    try {
      return execFileSync('git', cmd, { cwd: ROOT, encoding: 'utf8' }).trim();
    } catch {
      return '';
    }
  };
  return { branch: run(['branch', '--show-current']), head: run(['rev-parse', '--short', 'HEAD']) };
}

/** 注入到每个新 document 的观测脚本：捕获导出 canvas 像素、anchor 点击、页面错误、pointer 事件 */
const INSTRUMENT_SOURCE = String.raw`
(() => {
  if (window.__mt && window.__mt.installed) return;
  const mt = (window.__mt = {
    installed: true,
    toDataURL: [],
    anchors: 0,
    lastAnchor: null,
    errors: [],
    pointerLog: [],
  });
  window.addEventListener('error', (event) => mt.errors.push(String(event.message || '')));
  window.addEventListener('unhandledrejection', (event) => mt.errors.push('unhandledrejection: ' + String(event.reason && event.reason.message || event.reason)));

  const snapshot = (canvas) => {
    const w = canvas.width;
    const h = canvas.height;
    if (!w || !h) return { w, h, error: 'zero-size' };
    try {
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(0, 0, w, h).data;
      const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 4000)));
      let sampled = 0;
      let nonWhite = 0;
      let transparent = 0;
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          sampled += 1;
          if (data[i + 3] === 0) transparent += 1;
          if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) nonWhite += 1;
        }
      }
      return { w, h, sampled, nonWhite, transparent, nonWhiteRatio: sampled ? nonWhite / sampled : 0 };
    } catch (error) {
      return { w, h, error: String(error) };
    }
  };

  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function (...params) {
    let result;
    try {
      result = originalToDataURL.apply(this, params);
    } catch (error) {
      mt.errors.push('toDataURL: ' + String(error));
      throw error;
    }
    try {
      if (this.width >= 200 && this.height >= 200) {
        mt.toDataURL.push({
          ...snapshot(this),
          type: params[0] || 'image/png',
          quality: params[1] === undefined ? null : params[1],
          dataUrlBytes: result.length,
        });
      }
    } catch (error) {
      mt.errors.push('snapshot: ' + String(error));
    }
    return result;
  };

  // 拦截真实下载（不产生文件），只记录 anchor 点击
  HTMLAnchorElement.prototype.click = function () {
    mt.anchors += 1;
    mt.lastAnchor = { download: this.download || '', href: String(this.href || '').slice(0, 48) };
  };

  // 记录拖拽相关 pointer 事件（用于判定「测试合成事件是否被浏览器接受」）
  ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach((type) => {
    document.addEventListener(
      type,
      (event) => {
        const target = event.target;
        if (target && target.closest && target.closest('.image-outer-container')) {
          mt.pointerLog.push(type);
        }
      },
      { capture: true, passive: true },
    );
  });
})();
`;

// ---------------------------------------------------------------------------
// 用例框架
// ---------------------------------------------------------------------------
const cases = [];
const screenshots = [];
const limitations = [];
let page = null;

function truncate(value, max = MAX_LIST) {
  if (Array.isArray(value)) return value.slice(0, max);
  if (value && typeof value === 'object') return value;
  return value;
}

function createCase(id, group, name) {
  const record = {
    id,
    group,
    name,
    status: 'PASS',
    durationMs: 0,
    assertions: [],
    measurements: {},
    screenshots: [],
    error: null,
  };
  cases.push(record);
  const startedAt = performance.now();
  return {
    id,
    record,
    check(label, ok, meta = {}) {
      const level = meta.level || 'FAIL';
      const assertion = {
        label,
        status: ok ? 'PASS' : level,
        actual: truncate(meta.actual === undefined ? null : meta.actual),
      };
      record.assertions.push(assertion);
      const icon = assertion.status === 'PASS' ? '✅' : assertion.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`${icon} [${id}] ${label}${assertion.actual === null ? '' : ` — ${JSON.stringify(assertion.actual).slice(0, 260)}`}`);
      return Boolean(ok);
    },
    measure(label, value) {
      record.measurements[label] = value;
    },
    async screenshot(label, name) {
      if (!page) return null;
      const file = join(SHOTS_DIR, name);
      try {
        await page.screenshot({ path: file });
        screenshots.push({ label, path: relative(ROOT, file) });
        record.screenshots.push(relative(ROOT, file));
        return file;
      } catch (error) {
        record.assertions.push({ label: `截图失败：${label}`, status: 'WARN', actual: String(error) });
        return null;
      }
    },
    async end() {
      record.durationMs = Math.round(performance.now() - startedAt);
      const failed = record.assertions.some((a) => a.status === 'FAIL');
      const warned = record.assertions.some((a) => a.status === 'WARN');
      record.status = failed ? 'FAIL' : warned ? 'WARN' : 'PASS';
      if (record.error) record.status = 'FAIL';
      const icon = record.status === 'PASS' ? '✅' : record.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`${icon} [${id}] ${name} — ${record.status} (${record.durationMs}ms)`);
    },
  };
}

// ---------------------------------------------------------------------------
// 页面工具（触摸 / 滚动 / 状态读取）
// ---------------------------------------------------------------------------
async function dispatchTouch(type, points) {
  await page.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: points.map((point, index) => ({
      x: point.x,
      y: point.y,
      radiusX: 2,
      radiusY: 2,
      force: 1,
      id: point.id === undefined ? index + 1 : point.id,
    })),
  });
}

/** 单点触摸点击（touchStart → touchEnd，Chrome 会合成 click） */
async function tap(x, y) {
  await dispatchTouch('touchStart', [{ x, y }]);
  await sleep(60);
  await dispatchTouch('touchEnd', []);
  await sleep(320);
}

async function centerOf(selector) {
  return page.eval(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height } };
  })()`);
}

async function tapSelector(selector) {
  const center = await centerOf(selector);
  if (!center) throw new Error(`无法点击（不存在或不可见）：${selector}`);
  await tap(center.x, center.y);
  return center;
}

async function waitFor(expression, { timeoutMs = 10000, label = expression } = {}) {
  try {
    await page.waitFor(expression, { timeoutMs });
    return true;
  } catch {
    return false;
  }
}

async function gotoPage(pathname) {
  const url = args.values.base ? new URL(pathname, args.values.base).toString() : `${server.url}${pathname}`;
  await page.navigate(url, { timeoutMs: 30000 });
  await waitFor("document.readyState === 'complete'", { timeoutMs: 15000 });
  await sleep(350);
  return url;
}

/** 等待首页编辑器就绪（ui.js/i18n/main.js 均加载） */
async function waitHomeReady() {
  const ok = await waitFor(
    "document.readyState === 'complete' && typeof window.mecollage !== 'undefined' && typeof window.mcUI === 'object' && !!document.querySelector('.mc-menu-btn') && !!document.querySelector('.lang-selector-toggle')",
    { timeoutMs: 20000 },
  );
  await sleep(250);
  return ok;
}

async function waitImageCount(count) {
  const ok = await waitFor(`document.querySelectorAll('#collageGrid .image-outer-container').length >= ${count}`, {
    timeoutMs: 25000,
  });
  if (!ok) return false;
  return waitFor(
    "[...document.querySelectorAll('#collageGrid .image-outer-container img')].every((img) => img.naturalWidth > 0)",
    { timeoutMs: 15000 },
  );
}

/** 图片顺序签名（data URL 长度 + 尾部 24 字符，足以区分 fixture） */
const ORDER_EXPR = `[...document.querySelectorAll('#collageGrid .image-outer-container img')].map((img) => img.src.length + '|' + img.src.slice(-24))`;

async function readOrder() {
  return page.eval(ORDER_EXPR);
}

async function scrollInfo() {
  return page.eval(`({
    scrollY: window.scrollY,
    scrollX: window.scrollX,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    pageHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
  })`);
}

async function readToastTexts() {
  return page.eval(
    "[...document.querySelectorAll('#mc-toast-stack .mc-toast__msg, #mc-toast-stack .mc-toast')].map((el) => el.textContent).join(' | ')",
  );
}

// ---------------------------------------------------------------------------
// 用例定义
// ---------------------------------------------------------------------------
async function runNavStructure() {
  const c = createCase('MT-01', 'mobile-nav', '移动导航结构（390×844 顶栏 ≤64px / 品牌 + 菜单按钮 / 无横向溢出）');
  try {
    await gotoPage('/');
    const ready = await waitHomeReady();
    c.check('首页编辑器 + 移动 UI 就绪（mcUI / mc-menu-btn / i18n）', ready);

    const metrics = await page.eval(`(() => {
      const nav = document.querySelector('.ghibli-nav');
      const navRect = nav ? nav.getBoundingClientRect() : null;
      const menu = document.querySelector('.mc-menu-btn');
      const brand = document.querySelector('.mc-brand');
      const menuRect = menu ? menu.getBoundingClientRect() : null;
      const brandRect = brand ? brand.getBoundingClientRect() : null;
      return {
        viewport: { w: window.innerWidth, h: window.innerHeight },
        nav: navRect ? { height: navRect.height, top: navRect.top, width: navRect.width } : null,
        menu: menuRect ? { x: menuRect.x, y: menuRect.y, w: menuRect.width, h: menuRect.height, display: getComputedStyle(menu).display } : null,
        brand: brandRect ? { w: brandRect.width, h: brandRect.height, display: getComputedStyle(brand).display } : null,
        scrollWidth: document.documentElement.scrollWidth,
        bodyClass: document.body.className,
        touch: { hasTouchStart: 'ontouchstart' in window, maxTouchPoints: navigator.maxTouchPoints },
        navLeftDisplay: nav ? getComputedStyle(nav.querySelector('.nav-left')).display : null,
      };
    })()`);
    c.measure('metrics', metrics);
    c.check('触摸环境已启用（maxTouchPoints ≥ 1）', metrics.touch.maxTouchPoints >= 1, {
      actual: metrics.touch,
      level: 'FAIL',
    });
    c.check('顶栏高度 ≤64px', metrics.nav && metrics.nav.height <= 64, { actual: metrics.nav });
    c.check('移动品牌 .mc-brand 可见', !!metrics.brand && metrics.brand.display !== 'none' && metrics.brand.w > 0, {
      actual: metrics.brand,
    });
    c.check(
      '菜单按钮 .mc-menu-btn 可见且 ≥44×44',
      !!metrics.menu && metrics.menu.display !== 'none' && metrics.menu.w >= 44 && metrics.menu.h >= 44,
      { actual: metrics.menu },
    );
    c.check('默认不展开导航面板（.nav-left 隐藏）', metrics.navLeftDisplay === 'none', { actual: metrics.navLeftDisplay });
    c.check('无横向溢出（scrollWidth ≤ innerWidth）', metrics.scrollWidth <= metrics.viewport.w + 1, {
      actual: { scrollWidth: metrics.scrollWidth, innerWidth: metrics.viewport.w },
    });
    c.check('ui.js 已标记页面类型 body.mc-collage-page（R1 移动布局依赖）', /mc-collage-page/.test(metrics.bodyClass), {
      actual: metrics.bodyClass,
    });
    await c.screenshot('移动首页 390×844', '01-mobile-home-390x844.png');
  } catch (error) {
    c.record.error = String(error && error.stack ? error.stack : error);
    console.error('❌ [MT-01] 执行异常：', String(error).slice(0, 300));
  }
  await c.end();
}

async function runNavBehavior() {
  const c = createCase('MT-02', 'mobile-nav', '移动导航行为（触摸开合 / aria-expanded / Esc 关闭 + 焦点返回 / 展开面板触控目标）');
  try {
    const tapPoint = await tapSelector('.mc-menu-btn');
    c.measure('tapPoint', tapPoint);
    const opened = await waitFor("document.body.classList.contains('mc-nav-open')", { timeoutMs: 3000 });
    c.check('触摸点按菜单按钮后 body.mc-nav-open', opened);

    const openedState = await page.eval(`(() => {
      const nav = document.querySelector('.ghibli-nav');
      const left = nav.querySelector('.nav-left');
      const button = document.querySelector('.mc-menu-btn');
      const links = [...nav.querySelectorAll('.nav-left .nav-link')].map((a) => {
        const r = a.getBoundingClientRect();
        const inViewport = r.bottom > 0 && r.top < window.innerHeight && r.width > 0 && r.height > 0;
        return { text: (a.textContent || '').trim().slice(0, 16), w: Math.round(r.width), h: Math.round(r.height), visible: r.width > 0 && r.height > 0, inViewport };
      });
      const leftRect = left.getBoundingClientRect();
      return {
        expanded: button.getAttribute('aria-expanded'),
        leftDisplay: getComputedStyle(left).display,
        leftRect: { x: leftRect.x, y: leftRect.y, w: leftRect.width, h: leftRect.height, right: leftRect.right, bottom: leftRect.bottom },
        navRect: (() => { const r = nav.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: r.height }; })(),
        viewport: { w: window.innerWidth, h: window.innerHeight },
        pageHeight: document.documentElement.scrollHeight,
        links,
        activeInNav: !!(document.activeElement && nav.contains(document.activeElement)),
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        backdropDisplay: document.querySelector('.mc-mobile-backdrop') ? getComputedStyle(document.querySelector('.mc-mobile-backdrop')).display : null,
      };
    })()`);
    c.measure('openedState', openedState);
    c.check('aria-expanded = true', openedState.expanded === 'true', { actual: openedState.expanded });
    c.check('导航面板 .nav-left 展开（display ≠ none）', openedState.leftDisplay !== 'none', { actual: openedState.leftDisplay });
    c.check('遮罩 .mc-mobile-backdrop 显示', openedState.backdropDisplay === 'block', { actual: openedState.backdropDisplay });
    c.check('聚焦移入导航面板（可访问性）', openedState.activeInNav === true, {
      actual: openedState.activeInNav,
      level: 'WARN',
    });
    const smallLinks = openedState.links.filter((link) => link.visible && link.h < 44);
    c.check(
      '展开后导航链接触控高度 ≥44px',
      openedState.links.length > 0 && smallLinks.length === 0,
      { actual: smallLinks.length ? smallLinks : { links: openedState.links.length } },
    );
    c.check('展开面板不产生横向溢出', openedState.scrollWidth <= openedState.innerWidth + 1, {
      actual: { scrollWidth: openedState.scrollWidth, innerWidth: openedState.innerWidth },
    });
    c.check('展开面板顶部/右侧在视口内', openedState.leftRect.right <= openedState.innerWidth + 1, {
      actual: openedState.leftRect,
      level: 'WARN',
    });
    // 关键回归（2026-11-06 实测发现）：bundle 在 ≤768 把 .ghibli-nav 设成 position:static，
    // 而展开面板是 position:absolute;top:100%，偏移量会锚到 .app-container 高度 = 整页底部，
    // 结果「点菜单后面板在页面最底部、视口外」——必须断言面板真的出现在导航下方、视口内。
    const panelInViewport =
      openedState.leftRect.y >= openedState.navRect.bottom - 2 &&
      openedState.leftRect.y < openedState.viewport.h - 60 &&
      openedState.leftRect.bottom > openedState.navRect.bottom;
    c.check('展开面板出现在导航下方且位于视口内（不是页面底部）', panelInViewport, {
      actual: {
        panelY: Math.round(openedState.leftRect.y),
        navBottom: Math.round(openedState.navRect.bottom),
        viewportH: openedState.viewport.h,
        pageHeight: openedState.pageHeight,
      },
    });
    const firstLink = openedState.links.find((link) => link.inViewport);
    c.check('展开后至少一个导航链接落在视口内', !!firstLink, {
      actual: { links: openedState.links.length, firstLinkInViewport: firstLink || null },
    });
    await c.screenshot('移动导航展开', '02-mobile-nav-open.png');

    await page.pressEscape();
    await sleep(350);
    const closed = await page.eval(`({
      open: document.body.classList.contains('mc-nav-open'),
      expanded: document.querySelector('.mc-menu-btn').getAttribute('aria-expanded'),
      focusReturned: document.activeElement === document.querySelector('.mc-menu-btn'),
      activeClass: document.activeElement ? document.activeElement.className : '',
    })`);
    c.measure('afterEsc', closed);
    c.check('Esc 关闭导航面板', closed.open === false, { actual: closed.open });
    c.check('aria-expanded = false', closed.expanded === 'false', { actual: closed.expanded });
    c.check('Esc 后焦点返回菜单按钮', closed.focusReturned === true, { actual: { focusReturned: closed.focusReturned, activeClass: closed.activeClass } });
  } catch (error) {
    c.record.error = String(error && error.stack ? error.stack : error);
    console.error('❌ [MT-02] 执行异常：', String(error).slice(0, 300));
  }
  await c.end();
}

async function runLanguageDrawer() {
  const c = createCase('MT-03', 'language', '语言抽屉（落在视口内 / 选项 ≥44px / 打开聚焦首项 / Esc 关闭 + 焦点返回）');
  try {
    await page.eval('window.scrollTo(0, 0)');
    await sleep(250);
    await tapSelector('.lang-selector-toggle');
    const opened = await waitFor("document.querySelector('.lang-selector').classList.contains('is-open')", { timeoutMs: 3000 });
    c.check('触摸点按语言按钮后 .lang-selector.is-open', opened);

    const drawer = await page.eval(`(() => {
      const selector = document.querySelector('.lang-selector');
      const menu = document.querySelector('.lang-menu');
      const toggle = document.querySelector('.lang-selector-toggle');
      const rect = menu.getBoundingClientRect();
      const options = [...menu.querySelectorAll('.lang-option')].map((option) => {
        const r = option.getBoundingClientRect();
        return { text: (option.textContent || '').trim().slice(0, 12), w: Math.round(r.width), h: Math.round(r.height), href: option.getAttribute('href') };
      });
      return {
        isOpen: selector.classList.contains('is-open'),
        display: getComputedStyle(menu).display,
        rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, w: rect.width, h: rect.height },
        toggleRect: (() => { const r = toggle.getBoundingClientRect(); return { w: r.width, h: r.height }; })(),
        options,
        activeIsOption: !!(document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('lang-option')),
        viewport: { w: window.innerWidth, h: window.innerHeight },
        expanded: toggle.getAttribute('aria-expanded'),
        scrollWidth: document.documentElement.scrollWidth,
      };
    })()`);
    c.measure('drawer', drawer);
    c.check('menu 可见（display ≠ none）', drawer.display !== 'none' && drawer.rect.h > 0, { actual: { display: drawer.display, h: drawer.rect.h } });
    c.check('aria-expanded = true', drawer.expanded === 'true', { actual: drawer.expanded });
    c.check(
      '抽屉顶部在视口内（top ≥ 0）',
      drawer.rect.top >= 0,
      { actual: drawer.rect },
    );
    c.check(
      '抽屉底部在视口内（bottom ≤ 视口高+1）',
      drawer.rect.bottom <= drawer.viewport.h + 1,
      { actual: { bottom: drawer.rect.bottom, viewportH: drawer.viewport.h } },
    );
    c.check(
      '抽屉水平方向在视口内',
      drawer.rect.left >= 0 && drawer.rect.right <= drawer.viewport.w + 1,
      { actual: drawer.rect },
    );
    c.check('语言选项 ≥1 个', drawer.options.length >= 1, { actual: drawer.options.length });
    const shortOptions = drawer.options.filter((option) => option.h < 44);
    c.check('每个语言选项高度 ≥44px', drawer.options.length > 0 && shortOptions.length === 0, {
      actual: shortOptions.length ? shortOptions : drawer.options.map((option) => option.h),
    });
    c.check('打开后焦点在语言选项上', drawer.activeIsOption === true, { actual: drawer.activeIsOption, level: 'WARN' });
    c.check('抽屉打开不产生横向溢出', drawer.scrollWidth <= drawer.viewport.w + 1, {
      actual: { scrollWidth: drawer.scrollWidth, innerWidth: drawer.viewport.w },
    });
    await c.screenshot('语言抽屉展开', '03-lang-drawer-open.png');

    await page.pressEscape();
    await sleep(350);
    const closed = await page.eval(`({
      open: document.querySelector('.lang-selector').classList.contains('is-open'),
      expanded: document.querySelector('.lang-selector-toggle').getAttribute('aria-expanded'),
      focusReturned: document.activeElement === document.querySelector('.lang-selector-toggle'),
    })`);
    c.measure('afterEsc', closed);
    c.check('Esc 关闭语言抽屉', closed.open === false, { actual: closed.open });
    c.check('aria-expanded = false', closed.expanded === 'false', { actual: closed.expanded });
    c.check('Esc 后焦点返回语言按钮', closed.focusReturned === true, { actual: closed.focusReturned });
  } catch (error) {
    c.record.error = String(error && error.stack ? error.stack : error);
    console.error('❌ [MT-03] 执行异常：', String(error).slice(0, 300));
  }
  await c.end();
}

async function runTouchReorder() {
  const c = createCase('MT-04', 'touch', '触控拖拽排序（长按 250ms → 移动 → 释放；图片顺序变化且无丢失）');
  try {
    const ready = await waitHomeReady();
    c.check('编辑器就绪', ready);
    await page.eval('window.scrollTo(0, 0)');
    await page.setFiles('#fileInput', [fixtures.files[0], fixtures.files[1], fixtures.files[2]]);
    const loaded = await waitImageCount(3);
    c.check('上传 3 张 fixture 完成', loaded);
    await sleep(600);

    const before = await readOrder();
    c.measure('orderBefore', before);
    c.check('拖拽前有 3 张图片', before.length === 3, { actual: before.length });

    // 记录 pointer 事件数量 + 把手滚到视口中心
    await page.eval('window.__mt.pointerLog.length = 0');
    const geometry = await page.eval(`(() => {
      const containers = [...document.querySelectorAll('#collageGrid .image-outer-container')];
      const handle = containers[0].querySelector('.drag-handle');
      if (!handle) return null;
      handle.scrollIntoView({ block: 'center' });
      const handleRect = handle.getBoundingClientRect();
      const targetRect = containers[2].getBoundingClientRect();
      return {
        handle: { x: handleRect.x + handleRect.width / 2, y: handleRect.y + handleRect.height / 2, w: handleRect.width, h: handleRect.height },
        target: { x: targetRect.x + targetRect.width / 2, y: targetRect.y + targetRect.height / 2 },
        scrollY: window.scrollY,
      };
    })()`);
    c.measure('geometry', geometry);
    c.check('拖拽手柄 .drag-handle 存在且 ≥24×24', !!geometry && geometry.handle.w >= 24 && geometry.handle.h >= 24, {
      actual: geometry && geometry.handle,
    });

    // 长按 250ms（主代码 LONG_PRESS_MS=250）→ 中间态断言
    await dispatchTouch('touchStart', [{ x: geometry.handle.x, y: geometry.handle.y }]);
    await sleep(420);
    const midState = await page.eval(`(() => {
      const active = document.querySelector('.image-outer-container.touch-reorder-active');
      return {
        active: !!active,
        opacity: active ? active.style.opacity : null,
        log: window.__mt.pointerLog.slice(),
      };
    })()`);
    c.measure('longPressState', midState);
    c.check('长按 250ms 后进入拖拽态（.touch-reorder-active）', midState.active === true, { actual: midState.active });
    c.check('拖拽中视觉反馈：透明度 ≈0.6', midState.opacity === '0.6', { actual: midState.opacity, level: 'WARN' });
    c.check('长按阶段收到 pointerdown', midState.log.includes('pointerdown'), { actual: midState.log.slice(0, 8), level: 'WARN' });

    // 移动到第 3 格（分步 move）
    const steps = 6;
    for (let i = 1; i <= steps; i += 1) {
      const x = geometry.handle.x + ((geometry.target.x - geometry.handle.x) * i) / steps;
      const y = geometry.handle.y + ((geometry.target.y - geometry.handle.y) * i) / steps;
      await dispatchTouch('touchMove', [{ x, y }]);
      await sleep(70);
    }
    const midTarget = await page.eval(`({
      targetHighlight: document.querySelectorAll('.image-outer-container.touch-reorder-target').length,
      moveCount: window.__mt.pointerLog.filter((type) => type === 'pointermove').length,
    })`);
    c.measure('duringMove', midTarget);
    c.check('移动过程中命中目标格高亮', midTarget.targetHighlight >= 1, { actual: midTarget.targetHighlight, level: 'WARN' });
    c.check('移动过程中收到 pointermove', midTarget.moveCount > 0, { actual: midTarget.moveCount, level: 'WARN' });

    await dispatchTouch('touchEnd', []);
    await sleep(800);

    const after = await readOrder();
    const pointerLog = await page.eval('window.__mt.pointerLog.slice()');
    c.measure('orderAfter', after);
    c.measure('pointerEvents', pointerLog.reduce((acc, type) => ((acc[type] = (acc[type] || 0) + 1), acc), {}));
    const changed = before.length === after.length && before.some((sig, index) => sig !== after[index]);
    c.check('触控拖拽后 3 张图片顺序发生变化', changed, { actual: { before, after } });
    const sameSet = before.length === after.length && [...before].sort().join('§') === [...after].sort().join('§');
    c.check('排序后图片无丢失/无重复（集合一致）', sameSet === true, { actual: { beforeCount: before.length, afterCount: after.length } });
    c.check('拖拽以 pointerup 正常结束（未被滚动截获）', pointerLog.includes('pointerup') && !pointerLog.includes('pointercancel'), {
      actual: pointerLog.filter((type) => type === 'pointerup' || type === 'pointercancel'),
      level: 'WARN',
    });
    const scrollAfterDrag = await page.eval('window.scrollY');
    c.measure('scrollYAfterDrag', scrollAfterDrag);
    c.check('拖拽期间页面未被滚动带动（scrollY 基本不变）', Math.abs(scrollAfterDrag - geometry.scrollY) <= 2, {
      actual: { before: geometry.scrollY, after: scrollAfterDrag },
      level: 'WARN',
    });
    await c.screenshot('触控拖拽排序后', '04-touch-reorder-after.png');
  } catch (error) {
    c.record.error = String(error && error.stack ? error.stack : error);
    console.error('❌ [MT-04] 执行异常：', String(error).slice(0, 300));
  }
  await c.end();
}

async function runScrollExport() {
  const c = createCase('MT-05', 'export', '滚动后导出（scrollTo(0,600) → #exportBtn → 导出像素非全白、无异常）');
  try {
    await gotoPage('/');
    const ready = await waitHomeReady();
    c.check('首页编辑器就绪', ready);
    await page.setFiles('#fileInput', [fixtures.files[3], fixtures.files[1]]);
    const loaded = await waitImageCount(2);
    c.check('上传 2 张 fixture 完成', loaded);

    const html2canvasReady = await waitFor("typeof window.html2canvas === 'function'", { timeoutMs: 25000 });
    c.check('html2canvas 可用（cdnjs，与生产一致）', html2canvasReady, { level: 'WARN' });
    if (!html2canvasReady) {
      limitations.push('html2canvas 未能加载（cdnjs 网络不可达）→ 滚动后导出用例无法验证像素，标记 WARN；这不是产品缺陷，需联网复跑。');
    }

    // 关键：先滚动到编辑器中段（模拟真机用户上传后继续浏览/操作）
    await page.eval('window.scrollTo(0, 600)');
    await sleep(400);
    const scroll = await scrollInfo();
    c.measure('scrollBeforeExport', scroll);
    c.check('页面已滚动（scrollY > 0）', scroll.scrollY > 0, { actual: scroll.scrollY });
    c.check('目标滚动位置 ≥500（scrollTo(600) 生效）', scroll.scrollY >= 500, {
      actual: { scrollY: scroll.scrollY, pageHeight: scroll.pageHeight },
    });

    // 清空观测缓冲，触摸点按导出按钮（底部工具栏在移动端 sticky 于视口底部）
    await page.eval('window.__mt.toDataURL.length = 0; window.__mt.anchors = 0; window.__mt.errors.length = 0');
    const exportBtn = await page.eval(`(() => {
      const btn = document.getElementById('exportBtn');
      if (!btn) return null;
      const rect = btn.getBoundingClientRect();
      btn.scrollIntoView({ block: 'nearest' });
      const rect2 = btn.getBoundingClientRect();
      return { display: getComputedStyle(btn).display, disabled: btn.disabled, rect: { x: rect2.x, y: rect2.y, w: rect2.width, h: rect2.height } };
    })()`);
    c.measure('exportButton', exportBtn);
    if (!exportBtn || exportBtn.display === 'none' || exportBtn.rect.w === 0) {
      c.check('导出按钮 #exportBtn 可见', false, { actual: exportBtn });
    } else {
      c.check('导出按钮 #exportBtn 可见', true, { actual: { w: exportBtn.rect.w, h: exportBtn.rect.h } });
      await sleep(250);
      const center = await page.eval(`(() => { const r = document.getElementById('exportBtn').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, scrollY: window.scrollY }; })()`);
      c.measure('scrollYAtExportClick', center.scrollY);
      c.check('点击导出时页面处于滚动状态（L-36 回归防护）', center.scrollY > 0, { actual: center.scrollY });
      await tap(center.x, center.y);
      // 若合成触摸点按未触发（极端情况），2s 后回退为 DOM click 并标注
      let started = await waitFor('window.__mt.toDataURL.length > 0 || window.__mt.anchors > 0', { timeoutMs: 2500 });
      if (!started) {
        c.check('触摸点按导出按钮触发导出（合成事件）', false, { level: 'WARN', actual: '合成 touch tap 未触发，回退 DOM click' });
        await page.eval("document.getElementById('exportBtn').click()");
      }
    }

    // 等待导出完成（成功 toast / anchor / toDataURL 记录）
    const finished = await waitFor(
      "window.__mt.toDataURL.length > 0 && (window.__mt.anchors > 0 || /export|导出/i.test([...document.querySelectorAll('#mc-toast-stack .mc-toast__msg')].map((el) => el.textContent).join(' ')))",
      { timeoutMs: 40000 },
    );
    await sleep(500);
    const result = await page.eval(`(() => {
      const exports = window.__mt.toDataURL.slice();
      const last = exports[exports.length - 1] || null;
      const toast = [...document.querySelectorAll('#mc-toast-stack .mc-toast__msg')].map((el) => el.textContent).join(' | ');
      const button = document.getElementById('exportBtn');
      return {
        exportCount: exports.length,
        last,
        toast,
        anchors: window.__mt.anchors,
        lastAnchor: window.__mt.lastAnchor,
        errors: window.__mt.errors.slice(0, 10),
        button: { disabled: button.disabled, ariaBusy: button.getAttribute('aria-busy') },
        scrollYAfter: window.scrollY,
        pageExceptions: window.__mt.errors.slice(0, 10),
      };
    })()`);
    c.measure('exportResult', result);
    c.check('导出完成（捕获到导出 canvas + 下载动作/成功 toast）', finished, {
      actual: { exportCount: result.exportCount, anchors: result.anchors, toast: result.toast, errors: result.errors.length },
    });
    if (result.last) {
      c.check('导出 canvas 尺寸 ≥600×600（scale 2 的 390 视口网格）', result.last.w >= 600 && result.last.h >= 600, {
        actual: { w: result.last.w, h: result.last.h },
      });
      c.check('导出像素非全白（nonWhite > 1%，L-36 回归核心断言）', result.last.nonWhiteRatio > 0.01, {
        actual: { nonWhiteRatio: Number(result.last.nonWhiteRatio?.toFixed(4)), nonWhite: result.last.nonWhite, sampled: result.last.sampled },
      });
      c.check('导出 canvas 无采样错误', !result.last.error, { actual: result.last.error || null });
    }
    c.check('导出后按钮恢复（未 disabled / 无 aria-busy）', result.button.disabled === false && result.button.ariaBusy === null, {
      actual: result.button,
    });
    c.check('页面无未捕获异常（导出过程）', (page.exceptions || []).length === 0, { actual: page.exceptions.slice(0, MAX_LIST) });
    c.check('导出过程无 toDataURL/快照错误', result.errors.length === 0, { actual: result.errors });
    await c.screenshot('滚动后导出成功 toast', '05-scroll-export-toast.png');
  } catch (error) {
    c.record.error = String(error && error.stack ? error.stack : error);
    console.error('❌ [MT-05] 执行异常：', String(error).slice(0, 300));
  }
  await c.end();
}

async function runTouchTargets() {
  const c = createCase('MT-06', 'a11y', '触控目标（工具栏 / 导航 / 语言按钮 / 菜单按钮 ≥44×44）');
  try {
    const ready = await waitHomeReady();
    c.check('编辑器就绪', ready);
    const editor = await page.eval(`(() => {
      const ids = ['undoBtn', 'redoBtn', 'exportBtn', 'layoutBtn', 'filterBtn', 'textBtn', 'stickerBtn', 'aiBtn'];
      const targets = ids.map((id) => {
        const el = document.getElementById(id);
        if (!el) return { id, found: false };
        const rect = el.getBoundingClientRect();
        return { id, found: true, w: Math.round(rect.width), h: Math.round(rect.height), visible: rect.width > 0 && rect.height > 0 };
      });
      const menu = document.querySelector('.mc-menu-btn');
      const menuRect = menu.getBoundingClientRect();
      const lang = document.querySelector('.lang-selector-toggle');
      const langRect = lang.getBoundingClientRect();
      return {
        targets,
        menu: { w: Math.round(menuRect.width), h: Math.round(menuRect.height) },
        lang: { w: Math.round(langRect.width), h: Math.round(langRect.height) },
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        toolbarVisible: getComputedStyle(document.querySelector('.bottom-toolbar')).display,
      };
    })()`);
    c.measure('editorTargets', editor);
    c.check('编辑器工具栏已显示', editor.toolbarVisible === 'flex', { actual: editor.toolbarVisible });
    const undersized = editor.targets.filter((target) => target.found && target.visible && (target.w < 44 || target.h < 44));
    c.check(
      '工具栏按钮（含 undo/redo/export）全部 ≥44×44',
      editor.targets.every((target) => target.found) && undersized.length === 0,
      { actual: { targets: editor.targets, undersized } },
    );
    c.check('移动菜单按钮 ≥44×44', editor.menu.w >= 44 && editor.menu.h >= 44, { actual: editor.menu });
    c.check('语言按钮 ≥44 高', editor.lang.h >= 44, { actual: editor.lang });
    c.check('编辑器态无横向溢出', editor.scrollWidth <= editor.innerWidth + 1, {
      actual: { scrollWidth: editor.scrollWidth, innerWidth: editor.innerWidth },
    });
    await c.screenshot('编辑器触控目标 390×844', '06-editor-touch-targets.png');
  } catch (error) {
    c.record.error = String(error && error.stack ? error.stack : error);
    console.error('❌ [MT-06] 执行异常：', String(error).slice(0, 300));
  }
  await c.end();
}

async function runAspectRatioTouch() {
  const c = createCase('MT-07', 'tool-page', 'Aspect Ratio Calculator 390×844：无横向溢出 / 控件 ≥44 / 触摸 9:16 换算');
  try {
    await gotoPage('/tools/aspectratiocalculator/');
    const ready = await waitFor(
      "document.readyState === 'complete' && !!document.querySelector('#arcSize') && typeof window.mcUI === 'object' && !!document.querySelector('.mc-menu-btn')",
      { timeoutMs: 20000, label: 'calculator ready' },
    );
    c.check('计算器 + 共享移动 UI 就绪', ready);

    const layout = await page.eval(`(() => {
      const rect = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height), visible: r.width > 0 && r.height > 0 };
      };
      return {
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        ratioChip: rect('.arc-ratio'),
        widthInput: rect('#arcWidth'),
        swap: rect('#arcSwap'),
        copy: rect('#arcCopy'),
        presetsHidden: document.querySelector('#arcPresets').hidden,
        size: document.querySelector('#arcSize').textContent.trim(),
        h1: (document.querySelector('h1')?.textContent || '').trim(),
      };
    })()`);
    c.measure('layout', layout);
    c.check('H1 = Aspect Ratio Calculator', layout.h1 === 'Aspect Ratio Calculator', { actual: layout.h1 });
    c.check('页面无横向溢出', layout.scrollWidth <= layout.innerWidth + 1, { actual: { scrollWidth: layout.scrollWidth, innerWidth: layout.innerWidth } });
    c.check('比例 chip ≥44×44', layout.ratioChip.w >= 44 && layout.ratioChip.h >= 44, { actual: layout.ratioChip });
    c.check('宽度输入框 ≥44 高', layout.widthInput.h >= 44, { actual: layout.widthInput });
    c.check('Swap 按钮 ≥44×44', layout.swap.w >= 44 && layout.swap.h >= 44, { actual: layout.swap });
    c.check('Copy 按钮 ≥44 高', layout.copy.h >= 44, { actual: layout.copy });
    c.check('默认 Auto-detect 不显示 Common sizes', layout.presetsHidden === true, { actual: layout.presetsHidden });

    const center = await centerOf('.arc-ratio[data-ratio="9:16"]');
    if (!center) throw new Error('9:16 比例 chip 不可见');
    await tap(center.x, center.y);
    const after = await page.eval(`({
      w: document.querySelector('#arcWidth').value,
      h: document.querySelector('#arcHeight').value,
      presetsHidden: document.querySelector('#arcPresets').hidden,
      size: document.querySelector('#arcSize').textContent.trim(),
    })`);
    c.measure('afterTap916', after);
    c.check('触摸 9:16 → 1080 × 1920', after.w === '1080' && after.h === '1920', { actual: after });
    c.check('触摸后显示 Common sizes', after.presetsHidden === false, { actual: after.presetsHidden });
    await c.screenshot('Aspect Ratio Calculator 390×844', '07-aspect-ratio-tool.png');

    for (const localePath of ['/ja/tools/aspectratiocalculator/', '/es/tools/aspectratiocalculator/']) {
      await gotoPage(localePath);
      await waitFor("document.readyState === 'complete' && !!document.querySelector('#arcHeight')", { timeoutMs: 15000, label: 'localized calculator ready' });
      const localized = await page.eval(`(() => {
        document.querySelector('.arc-ratio[data-ratio="9:16"]').click();
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          w: document.querySelector('#arcWidth').value,
          h: document.querySelector('#arcHeight').value,
        };
      })()`);
      c.measure('localized', { localePath, ...localized });
      c.check(`${localePath} 无横向溢出`, localized.scrollWidth <= localized.innerWidth + 1, { actual: localized });
      c.check(`${localePath} 触摸 9:16 = 1080×1920`, localized.w === '1080' && localized.h === '1920', { actual: localized });
    }
  } catch (error) {
    c.record.error = String(error && error.stack ? error.stack : error);
    console.error('❌ [MT-07] 执行异常：', String(error).slice(0, 300));
  }
  await c.end();
}

// ---------------------------------------------------------------------------
// 报告
// ---------------------------------------------------------------------------
function buildReport({ meta, startedAt }) {
  const summary = { pass: 0, fail: 0, warn: 0, total: cases.length };
  for (const item of cases) {
    if (item.status === 'PASS') summary.pass += 1;
    else if (item.status === 'FAIL') summary.fail += 1;
    else summary.warn += 1;
  }
  return {
    tool: TOOL,
    version: VERSION,
    generatedAt: new Date().toISOString(),
    durationMs: Math.round(performance.now() - startedAt),
    meta,
    summary,
    coverageNote:
      '390×844 + Emulation mobile/touch 模拟；覆盖移动导航、语言抽屉、触控拖拽排序、滚动后导出、触控目标。真机手势/系统级滚动惯性与合成事件存在差异，见 limitations。',
    limitations,
    productFindings: PRODUCT_FINDINGS,
    cases,
    screenshots,
  };
}

function writeReports(report) {
  mkdirSync(dirname(JSON_PATH), { recursive: true });
  mkdirSync(dirname(MD_PATH), { recursive: true });
  mkdirSync(SHOTS_DIR, { recursive: true });
  writeFileSync(JSON_PATH, JSON.stringify(report, null, 2));

  const md = [];
  const add = (line = '') => md.push(line);
  add('# MeCollage R2 移动端触摸交互回归报告');
  add();
  add(`- 工具：\`${TOOL}\` v${VERSION}（零依赖 CDP 触摸模拟）`);
  add(`- 时间：${report.generatedAt}（耗时 ${report.durationMs}ms）`);
  add(`- 环境：Node ${report.meta.node} · ${report.meta.chrome} · 视口 ${VIEWPORT.width}×${VIEWPORT.height} · 触摸模拟（mobile:true）`);
  add(`- 被测地址：${report.meta.baseUrl}（${report.meta.local ? '本地 Vercel 模拟服务器' : '外部部署'}）`);
  add(`- git：\`${report.meta.git.branch || '?'}\` @ \`${report.meta.git.head || '?'}\``);
  add(`- fixtures：\`${report.meta.fixtures}\``);
  add();
  add('## 1. 结论');
  add();
  add(`**${report.summary.fail === 0 ? 'PASS' : 'FAIL'}** — PASS ${report.summary.pass} / FAIL ${report.summary.fail} / WARN ${report.summary.warn}（共 ${report.summary.total} 个用例）`);
  add();
  add('| 用例 | 分组 | 状态 | 耗时 | 断言(PASS/WARN/FAIL) | 截图 |');
  add('|---|---|---|---|---|---|');
  for (const item of report.cases) {
    const count = (status) => item.assertions.filter((a) => a.status === status).length;
    const shots = item.screenshots.map((file) => `[\`${file.split('/').pop()}\`](screenshots/${file.split('/').pop()})`).join(' ');
    add(
      `| \`${item.id}\` ${item.name} | ${item.group} | ${item.status === 'PASS' ? '✅ PASS' : item.status === 'FAIL' ? '❌ FAIL' : '⚠️ WARN'} | ${item.durationMs}ms | ${count('PASS')}/${count('WARN')}/${count('FAIL')} | ${shots || '—'} |`,
    );
  }
  add();
  add('## 2. 失败 / 警告明细');
  add();
  const problems = report.cases.filter((item) => item.status !== 'PASS');
  if (!problems.length) add('无 FAIL/WARN。');
  for (const item of problems) {
    add(`### ${item.status === 'FAIL' ? '❌' : '⚠️'} \`${item.id}\` ${item.name}`);
    add();
    if (item.error) add(`- 执行异常：\`${String(item.error).split('\n')[0]}\``);
    for (const assertion of item.assertions.filter((a) => a.status !== 'PASS')) {
      add(`- ${assertion.status} — ${assertion.label} — 实际：\`${JSON.stringify(assertion.actual)}\``);
    }
    add();
  }
  add('## 3. 关键实测数据');
  add();
  for (const item of report.cases) {
    if (!Object.keys(item.measurements).length) continue;
    add(`### \`${item.id}\` ${item.name}`);
    add();
    add('```json');
    add(JSON.stringify(item.measurements, null, 2));
    add('```');
    add();
  }
  add('## 4. 本轮发现的产品问题与门禁盲区（L-39 候选）');
  add();
  add('> 这些问题/控件在「静态首屏 / 未交互」时不可见，`check-layout.mjs` 的静态扫描测不到；本脚本在交互后状态断言才发现。');
  add();
  for (const finding of report.productFindings || []) {
    add(`- **${finding.id}** ${finding.title}`);
    add(`  - ${finding.detail}`);
  }
  add();
  add('## 5. 覆盖说明与限制');
  add();
  add(`- 视口/设备模拟：CDP \`Emulation.setDeviceMetricsOverride({width:390,height:844,mobile:true})\` + \`Emulation.setTouchEmulationEnabled\` + \`Input.dispatchTouchEvent\`。`);
  add(`- 外部请求拦截：${report.meta.blockedUrls.map((url) => `\`${url}\``).join('、')}；cdnjs（html2canvas）保留以复现真实导出。`);
  for (const note of report.limitations) add(`- ${note}`);
  add();
  add('## 6. 复现');
  add();
  add('```bash');
  add('# 全量（自动起本地服务器 + headless Chrome）');
  add('node scripts/functional-audit/run-mobile-touch.mjs');
  add();
  add('# 对 Preview/线上地址跑');
  add('node scripts/functional-audit/run-mobile-touch.mjs --base https://<preview-url>/');
  add('```');
  add();
  writeFileSync(MD_PATH, md.join('\n'));
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------
let server = null;
let chrome = null;
const startedAt = performance.now();

const fixtures = locateFixtures(args.values.fixtures);
if (!fixtures) {
  console.error(
    '[mobile-touch] 未找到测试图。请先运行：python3 scripts/functional-audit/make-fixtures.py\n' +
      '  期望目录：scripts/functional-audit/fixtures 或 audit/evidence/phase-f/browser/fixtures（含 multi-01..04.png）',
  );
  process.exit(2);
}
mkdirSync(SHOTS_DIR, { recursive: true });

const git = gitInfo();
const isLocal = !args.values.base;

try {
  if (isLocal) server = await startStaticServer({ root: ROOT });
  const baseUrl = args.values.base || server.url;
  chrome = await launchChrome({ width: VIEWPORT.width, height: VIEWPORT.height });
  page = await ChromePage.connect(chrome.pageWsUrl, { timeoutMs: 25000 });
  await page.enableDomains({ blockedUrls: BLOCKED_URLS, width: VIEWPORT.width, height: VIEWPORT.height });
  // 真机移动模拟：mobile:true（meta viewport 生效）+ 触摸事件源
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: VIEWPORT.width,
    height: VIEWPORT.height,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: VIEWPORT.width,
    screenHeight: VIEWPORT.height,
  });
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }).catch(() => {});
  await page.send('Emulation.setEmitTouchEventsForMouse', { enabled: false }).catch(() => {});
  await page.addInitScript(INSTRUMENT_SOURCE);

  console.log(`[${TOOL}] v${VERSION} · 视口 ${VIEWPORT.width}×${VIEWPORT.height}（mobile+touch）· ${baseUrl}`);
  console.log(`[${TOOL}] fixtures: ${relative(ROOT, fixtures.dir)} · 输出: ${relative(ROOT, OUT_DIR)}`);

  await runNavStructure();
  await runNavBehavior();
  await runLanguageDrawer();
  await runTouchReorder();
  await runScrollExport();
  await runTouchTargets();
  await runAspectRatioTouch();

  const meta = {
    node: process.version,
    chrome: chrome.browserVersion || 'unknown',
    branch: git.branch,
    head: git.head,
    git,
    baseUrl,
    local: isLocal,
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    mobileEmulation: true,
    touchEmulation: true,
    fixtures: relative(ROOT, fixtures.dir),
    fixtureFiles: fixtures.files.map((file) => relative(ROOT, file)),
    blockedUrls: BLOCKED_URLS,
    durationMs: Math.round(performance.now() - startedAt),
  };
  const report = buildReport({ meta, startedAt });
  writeReports(report);

  console.log('');
  console.log(`[${TOOL}] 完成：PASS ${report.summary.pass} / FAIL ${report.summary.fail} / WARN ${report.summary.warn}（共 ${report.summary.total}）`);
  console.log(`[${TOOL}] JSON: ${JSON_PATH}`);
  console.log(`[${TOOL}] MD:   ${MD_PATH}`);
  console.log(`[${TOOL}] 截图: ${SHOTS_DIR}`);
  const fails = report.cases.filter((item) => item.status === 'FAIL');
  if (fails.length) {
    console.log(`[${TOOL}] FAIL 用例：${fails.map((item) => item.id).join(', ')}`);
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
} catch (error) {
  console.error(`[${TOOL}] 运行器错误：${error && error.stack ? error.stack : error}`);
  process.exitCode = 2;
} finally {
  try {
    if (page && !args.values['keep-open']) page.close();
  } catch {
    /* noop */
  }
  try {
    if (chrome && !args.values['keep-open']) await chrome.close();
  } catch {
    /* noop */
  }
  try {
    if (server) await server.close();
  } catch {
    /* noop */
  }
}
