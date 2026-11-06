#!/usr/bin/env node
/**
 * Phase F-3：真实浏览器功能自动化测试（零依赖 CDP harness，无 Playwright/Puppeteer）
 *
 * 运行：
 *   node scripts/functional-audit/run-tests.mjs
 *   node scripts/functional-audit/run-tests.mjs --keep-open   # 保留 Chrome/profile 便于排查（不推荐）
 *
 * 测试对象：本地启动的静态服务器（server.mjs 模拟 Vercel 路由），加载仓库真实页面/脚本；
 * 浏览器：Chrome headless（CDP over WebSocket）。
 *
 * 输出：
 *   audit/evidence/phase-f/browser/report.json
 *   audit/evidence/phase-f/browser/report.md
 *   audit/evidence/phase-f/browser/shots/*.png
 *   audit/evidence/phase-f/browser/fixtures/*（由 make-fixtures.py 生成）
 *
 * 约束：只读被测站点文件；不真正下载文件；不对外部 AI 模型发起真实调用（jsdelivr/esm.sh 被拦截）。
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

import { launchChrome, ChromePage } from './cdp.mjs';
import { startStaticServer } from './server.mjs';
import { INSTRUMENT_SOURCE } from './instrument.mjs';

// ---------------------------------------------------------------------------
// 路径与常量
// ---------------------------------------------------------------------------

const ROOT = process.cwd();
const AUDIT_DIR = resolve(ROOT, 'audit/evidence/phase-f/browser');
const FIXTURES_DIR = join(AUDIT_DIR, 'fixtures');
const SHOTS_DIR = join(AUDIT_DIR, 'shots');
const REPORT_JSON = join(AUDIT_DIR, 'report.json');
const REPORT_MD = join(AUDIT_DIR, 'report.md');
const FIXTURE_SCRIPT = resolve(ROOT, 'scripts/functional-audit/make-fixtures.py');

const VIEWPORT = { width: 1440, height: 1000 };
const KEEP_OPEN = process.argv.includes('--keep-open');

/** 外部请求拦截：广告/统计（与本测试无关）+ AI 模型库（测试失败路径，不做真实模型调用） */
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

/** fixtures 文件映射 */
const FIXTURES = {
  landscape: join(FIXTURES_DIR, 'landscape-800x600.png'),
  portrait: join(FIXTURES_DIR, 'portrait-600x800.png'),
  wide: join(FIXTURES_DIR, 'wide-1920x1080.png'),
  square: join(FIXTURES_DIR, 'square-1024x1024.png'),
  transparent: join(FIXTURES_DIR, 'transparent-800x600.png'),
  jpg: join(FIXTURES_DIR, 'photo-1200x900.jpg'),
};
const multiFixtures = (n) =>
  Array.from({ length: n }, (_, index) => join(FIXTURES_DIR, `multi-${String(index + 1).padStart(2, '0')}.png`));

/** 预期滤镜关键 token（app getFilterStyle 与 computed style 的序列化不同，用 token 校验） */
const FILTER_EXPECTATIONS = {
  none: [],
  noir: ['grayscale', 'contrast'],
  retro: ['sepia', 'contrast', 'saturate'],
  fade: ['brightness', 'contrast', 'saturate'],
  glow: ['brightness', 'saturate'],
  cool: ['hue-rotate', 'saturate'],
};

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex').slice(0, 16);

// ---------------------------------------------------------------------------
// 运行器
// ---------------------------------------------------------------------------

const results = [];
const pageLoads = {};
const limitations = [];
let currentGroup = 'env';
let shotIndex = 0;

const GROUP_TITLES = {
  env: '环境与测试基础设施',
  index: '首页拼图编辑器',
  square: '/tools/square/（Square Image Converter）',
  squarecrop: '/tools/squarecrop/（Square Crop）',
  roundedcorners: '/tools/roundedcorners/（Rounded Corners）',
  blurredframe: '/tools/blurredframe/（Blurred Frame）',
  aspectratio: '/tools/aspectratiocalculator/（Aspect Ratio Calculator）',
  coverage: '覆盖范围与人工确认项',
};
const GROUP_ORDER = Object.keys(GROUP_TITLES);

function safeName(text) {
  return String(text).replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80);
}

function relativePath(absolutePath) {
  return absolutePath.startsWith(`${ROOT}/`) ? absolutePath.slice(ROOT.length + 1) : absolutePath;
}

async function captureShot(page, name, selector = null) {
  shotIndex += 1;
  const fileName = `${String(shotIndex).padStart(2, '0')}-${safeName(name)}.png`;
  const absolutePath = join(SHOTS_DIR, fileName);
  mkdirSync(SHOTS_DIR, { recursive: true });
  let buffer;
  if (selector) {
    try {
      buffer = await page.screenshotElement(selector, absolutePath);
    } catch {
      buffer = await page.screenshot({ path: absolutePath });
    }
  } else {
    buffer = await page.screenshot({ path: absolutePath });
  }
  return { path: relativePath(absolutePath), hash: sha256(buffer) };
}

/**
 * 执行一个用例。
 * @param {{id:string, group:string, name:string, page:string, fn:(ctx:any)=>Promise<void>}} definition
 */
async function runCase(page, definition) {
  currentGroup = definition.group;
  /** @type {Array<any>} */
  const assertions = [];
  /** @type {Record<string, any>} */
  const measurements = {};
  /** @type {Array<{path:string, hash:string}>} */
  const screenshots = [];

  const ctx = {
    /** 断言：ok=false 时按 level（默认 FAIL）记录 */
    check(label, ok, { level = 'FAIL', actual = null, expected = null } = {}) {
      assertions.push({ label, status: ok ? 'PASS' : level, actual, expected });
      return Boolean(ok);
    },
    /** 记录实测值（不影响判定） */
    measure(label, value) {
      measurements[label] = value;
    },
    /** 记录截图 */
    async screenshot(name, selector = null) {
      if (!page) return null;
      const shot = await captureShot(page, name, selector);
      screenshots.push(shot);
      return shot;
    },
    /** 无法自动判定 → WARN + 记入人工确认清单 */
    manual(label, note) {
      assertions.push({ label, status: 'WARN', actual: note, manual: true });
      limitations.push({ id: definition.id, label, note });
    },
  };

  let thrown = null;
  const startedAt = performance.now();
  try {
    if (definition.fn) await definition.fn(ctx);
  } catch (error) {
    thrown = error;
    assertions.push({
      label: '用例执行异常',
      status: 'FAIL',
      actual: String(error?.message || error).slice(0, 600),
    });
  }
  const durationMs = Math.round(performance.now() - startedAt);

  const failed = assertions.filter((assertion) => assertion.status === 'FAIL');
  const warned = assertions.filter((assertion) => assertion.status === 'WARN');
  const status = failed.length > 0 ? 'FAIL' : warned.length > 0 ? 'WARN' : 'PASS';

  // 关键 FAIL 必须截图
  if (status === 'FAIL' && page) {
    try {
      await ctx.screenshot(`${definition.id}-FAIL`);
    } catch {
      /* 截图失败不改变判定 */
    }
  }

  const record = {
    id: definition.id,
    group: definition.group,
    page: definition.page,
    name: definition.name,
    status,
    durationMs,
    assertions,
    measurements,
    screenshots,
    error: thrown ? String(thrown.message || thrown).slice(0, 800) : null,
  };
  results.push(record);
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} [${definition.group}] ${definition.id} — ${definition.name}（${durationMs}ms）`);
  if (status !== 'PASS') {
    for (const assertion of [...failed, ...warned]) {
      console.log(`    ${assertion.status} ${assertion.label}${assertion.actual !== null && assertion.actual !== undefined ? ` — ${formatActual(assertion.actual)}` : ''}`);
    }
  }
  return record;
}

function formatActual(actual) {
  if (typeof actual === 'string') return actual.length > 300 ? `${actual.slice(0, 300)}…` : actual;
  try {
    const json = JSON.stringify(actual);
    return json.length > 300 ? `${json.slice(0, 300)}…` : json;
  } catch {
    return String(actual);
  }
}

function requireCheck(ctx, label, ok, options) {
  if (!ok) throw new Error(`前置条件失败：${label}${options?.actual ? `（${formatActual(options.actual)}）` : ''}`);
}

// ---------------------------------------------------------------------------
// 页面辅助
// ---------------------------------------------------------------------------

let page = null;
let server = null;
let chrome = null;

async function gotoPage(path, { waitForFa = true } = {}) {
  const url = `${server.url}${path}`;
  await page.navigate(url, { timeoutMs: Number(process.env.FA_NAV_TIMEOUT_MS || 30000) });
  if (waitForFa) {
    await page.waitFor("typeof window.__fa !== 'undefined' && typeof document.body !== 'undefined' && document.readyState === 'complete'", {
      timeoutMs: 15000,
    });
  }
  await sleep(200);
  const errors = await page.eval('window.__fa ? window.__fa.errors : []').catch(() => []);
  pageLoads[path] = {
    exceptions: page.exceptions.map((exception) => exception.text).slice(0, 10),
    consoleErrors: page.console.filter((entry) => entry.type === 'error').map((entry) => entry.text).slice(0, 10),
    blockedRequests: page.failedRequests.filter((request) => request.blockedReason).length,
    faErrors: errors,
  };
  return url;
}

async function uploadImages(paths, { expectCount, waitLoaded = true } = {}) {
  await page.setFiles('#fileInput', paths);
  const expected = expectCount ?? paths.length;
  await page.waitFor(`__fa.count('.image-outer-container') >= ${expected}`, { timeoutMs: 45000 });
  if (waitLoaded) {
    await page.waitFor(
      "[...document.querySelectorAll('.image-outer-container img')].every((img) => img.naturalWidth > 0)",
      { timeoutMs: 45000 },
    );
  }
  await sleep(150);
}

async function waitStateImage(width) {
  await page.waitFor("typeof state !== 'undefined' && state.image && state.image.width > 0", { timeoutMs: 30000 });
  if (width) await page.waitFor(`state.image.width === ${width}`, { timeoutMs: 10000 });
  await sleep(250);
}

async function toolExport(_page, expression) {
  const before = await page.eval('__fa.cap.toBlob.length');
  await page.eval(expression);
  try {
    await page.waitFor(`__fa.cap.toBlob.length > ${before}`, { timeoutMs: 20000 });
  } catch (error) {
    const dialogs = page.dialogs.map((dialog) => dialog.message).slice(-3);
    throw new Error(`导出未触发 toBlob（可能页面报错）${dialogs.length ? `；对话框：${dialogs.join(' | ')}` : ''}`);
  }
  return page.eval('__fa.cap.toBlob.slice(-1)[0]');
}

const CLICK_VISIBLE_DOWNLOAD = `(() => {
  const buttons = [...document.querySelectorAll('button[onclick*="downloadImage"]')].filter((b) => b.offsetParent !== null);
  const button = buttons[0] || document.querySelector('button[onclick*="downloadImage"]');
  if (!button) return 'MISSING';
  button.click();
  return 'OK';
})()`;

  // R0（2026-11-06）：产品反馈从阻塞 alert() 改为非阻塞 toast。
  // 断言口径：原生 dialog + #mc-toast-stack 里的文本都算“用户可见提示”。
  const readFeedback = async () => {
    const dialogs = page.dialogs.map((d) => d.message).join(' | ');
    let toasts = '';
    try {
      toasts = await page.eval(
        "[...document.querySelectorAll('#mc-toast-stack .mc-toast__msg, #mc-toast-stack .mc-toast')].map((e) => e.textContent).join(' | ')",
      );
    } catch {
      /* page not ready */
    }
    return [dialogs, toasts].filter(Boolean).join(' | ');
  };

async function indexExport(expected = 1) {
  const before = await page.eval('__fa.cap.h2c.length');
  await page.eval("__fa.click('#exportBtn')");
  try {
    await page.waitFor(`__fa.cap.h2c.length >= ${before + expected}`, { timeoutMs: 30000 });
  } catch (error) {
    const dialogs = page.dialogs.map((dialog) => dialog.message).slice(-3);
    throw new Error(`html2canvas 导出超时/失败${dialogs.length ? `；对话框：${dialogs.join(' | ')}` : ''}`);
  }
  return page.eval('__fa.cap.h2c.slice(-1)[0]');
}

async function setRatio(ratio) {
  await page.eval(`__fa.click('.aspect-ratio-btn[data-ratio="${ratio}"]')`);
  await sleep(200);
}

async function selectTool(tool) {
  await page.eval(`document.querySelector('.tool-btn[data-tool="${tool}"]').click()`);
  await sleep(250);
}

// ---------------------------------------------------------------------------
// 首页编辑器测试
// ---------------------------------------------------------------------------

async function runIndexGroup() {
  // ---------- 页面 A：上传数量 / 删除 / 排序 ----------
  await gotoPage('/');
  await runCase(page, {
    id: 'IDX-01',
    group: 'index',
    page: '/',
    name: '页面加载：标题 / 上传界面 / 无未捕获 JS 异常',
    async fn(ctx) {
      const state = await page.eval(`({
        title: document.title,
        uploadVisible: getComputedStyle(document.getElementById('uploadScreen')).display !== 'none',
        fileInput: !!document.getElementById('fileInput'),
        html2canvas: typeof window.html2canvas,
        i18n: typeof window.i18n,
      })`);
      await ctx.screenshot('index-loaded');
      ctx.measure('title', state.title);
      ctx.measure('html2canvasType', state.html2canvas);
      ctx.measure('blockedExternalRequests', pageLoads['/']?.blockedRequests);
      ctx.check('页面标题包含 MeCollage', /MeCollage/i.test(state.title), { actual: state.title });
      ctx.check('上传界面默认可见', state.uploadVisible === true, { actual: state.uploadVisible });
      ctx.check('文件输入存在', state.fileInput === true);
      ctx.check('无未捕获 JS 异常', pageLoads['/']?.exceptions.length === 0, { actual: pageLoads['/']?.exceptions });
      ctx.check('无页面级未处理错误', pageLoads['/']?.faErrors.length === 0, { actual: pageLoads['/']?.faErrors });
      ctx.check('html2canvas 已加载（导出依赖）', state.html2canvas === 'function', { actual: state.html2canvas, level: 'WARN' });
    },
  });

  await uploadImages([FIXTURES.landscape]);
  await runCase(page, {
    id: 'IDX-02',
    group: 'index',
    page: '/',
    name: '上传 1 张：数量计数 / 画布显示 / 图片解码',
    async fn(ctx) {
      const state = await page.eval(`({
        count: __fa.count('.image-outer-container'),
        counter: document.getElementById('photoCounter').textContent,
        canvasVisible: getComputedStyle(document.getElementById('collageCanvas')).display !== 'none',
        image: (() => { const img = document.querySelector('.image-outer-container img'); return img ? { w: img.naturalWidth, h: img.naturalHeight, dataUrl: img.src.startsWith('data:image/') } : null; })(),
      })`);
      await ctx.screenshot('index-upload-1');
      ctx.measure('photoCounter', state.counter);
      ctx.check('图片容器数量 = 1', state.count === 1, { actual: state.count });
      ctx.check('计数显示 1 / 20', /1\s*\/\s*20/.test(state.counter), { actual: state.counter });
      ctx.check('画布已显示、上传区隐藏', state.canvasVisible === true, { actual: state.canvasVisible });
      ctx.check('图片已解码（800×600 且为 dataURL）', state.image?.w === 800 && state.image?.h === 600 && state.image?.dataUrl, { actual: state.image });
    },
  });

  await uploadImages([FIXTURES.portrait, FIXTURES.square], { expectCount: 3 });
  await runCase(page, {
    id: 'IDX-03',
    group: 'index',
    page: '/',
    name: '继续上传至 3 张：追加而非覆盖',
    async fn(ctx) {
      const state = await page.eval(`({ count: __fa.count('.image-outer-container'), counter: document.getElementById('photoCounter').textContent })`);
      ctx.measure('photoCounter', state.counter);
      ctx.check('图片容器数量 = 3', state.count === 3, { actual: state.count });
      ctx.check('计数显示 3 / 20', /3\s*\/\s*20/.test(state.counter), { actual: state.counter });
    },
  });

  await uploadImages(multiFixtures(20).slice(0, 2), { expectCount: 5 });
  await runCase(page, {
    id: 'IDX-04',
    group: 'index',
    page: '/',
    name: '继续上传至 5 张',
    async fn(ctx) {
      const state = await page.eval(`({ count: __fa.count('.image-outer-container'), counter: document.getElementById('photoCounter').textContent })`);
      ctx.check('图片容器数量 = 5', state.count === 5, { actual: state.count });
      ctx.check('计数显示 5 / 20', /5\s*\/\s*20/.test(state.counter), { actual: state.counter });
    },
  });

  page.dialogs.length = 0;
  await uploadImages(multiFixtures(20).slice(2), { expectCount: 20 });
  await runCase(page, {
    id: 'IDX-05',
    group: 'index',
    page: '/',
    name: '上传至 20 张（上限）：计数封顶',
    async fn(ctx) {
      const state = await page.eval(`({ count: __fa.count('.image-outer-container'), counter: document.getElementById('photoCounter').textContent })`);
      ctx.measure('photoCounter', state.counter);
      ctx.check('图片容器数量 = 20', state.count === 20, { actual: state.count });
      ctx.check('计数显示 20 / 20', /20\s*\/\s*20/.test(state.counter), { actual: state.counter });
    },
  });

  await runCase(page, {
    id: 'IDX-06',
    group: 'index',
    page: '/',
    name: '第 21 张：拒绝上传 / 是否有提示',
    async fn(ctx) {
      const before = await page.eval('__fa.count(".image-outer-container")');
      page.dialogs.length = 0;
      await page.setFiles('#fileInput', [join(FIXTURES_DIR, 'multi-21.png')]);
      await sleep(900);
      const state = await page.eval(`({ count: __fa.count('.image-outer-container'), counter: document.getElementById('photoCounter').textContent })`);
      ctx.measure('countBefore', before);
      ctx.measure('countAfter', state.count);
      const feedback = await readFeedback();
      ctx.measure('dialogs', feedback);
      ctx.check('第 21 张未被加入（数量仍为 20）', state.count === 20, { actual: state.count });
      ctx.check('计数仍为 20 / 20', /20\s*\/\s*20/.test(state.counter), { actual: state.counter });
      ctx.check(
        '超出上限时给出用户可见提示（toast 或 dialog）',
        feedback.length > 0,
        { actual: feedback || '无任何提示' },
      );
    },
  });

  await runCase(page, {
    id: 'IDX-07',
    group: 'index',
    page: '/',
    name: '删除图片：数量与计数回退',
    async fn(ctx) {
      const before = await page.eval('__fa.count(".image-outer-container")');
      await page.eval("document.querySelector('.image-outer-container .remove-btn').click()");
      await sleep(400);
      const state = await page.eval(`({ count: __fa.count('.image-outer-container'), counter: document.getElementById('photoCounter').textContent })`);
      ctx.measure('before', before);
      ctx.measure('after', state.count);
      ctx.check('删除后数量 = 19', state.count === 19, { actual: state.count });
      ctx.check('计数同步为 19 / 20', /19\s*\/\s*20/.test(state.counter), { actual: state.counter });
      await ctx.screenshot('index-after-delete');
    },
  });

  await runCase(page, {
    id: 'IDX-08',
    group: 'index',
    page: '/',
    name: '拖拽排序：第 1 张拖到第 3 位',
    async fn(ctx) {
      const before = await page.eval('__fa.imageSrcTail()');
      const dragResult = await page.eval('__fa.syntheticReorder(0, 2)');
      await sleep(400);
      const after = await page.eval('__fa.imageSrcTail()');
      ctx.measure('before', before.slice(0, 5));
      ctx.measure('after', after.slice(0, 5));
      ctx.measure('dragEventResult', dragResult);
      ctx.check('合成 HTML5 dragstart/drop 执行成功', dragResult === 'OK', { actual: dragResult });
      ctx.check(
        '图片顺序发生变化（第 1 张移动到第 3 位）',
        JSON.stringify(before) !== JSON.stringify(after) && after[0] === before[1] && after[2] === before[0],
        { actual: { before: before.slice(0, 5), after: after.slice(0, 5) } },
      );
      await ctx.screenshot('index-reordered');
    },
  });

  // ---------- 页面 B：布局 / 滑块 / 滤镜 / 文字 / 贴纸 / 网格 / 撤销 / 导出 / AI ----------
  await gotoPage('/');
  await uploadImages([FIXTURES.landscape, FIXTURES.portrait, FIXTURES.square], { expectCount: 3 });

  await runCase(page, {
    id: 'IDX-09',
    group: 'index',
    page: '/',
    name: '纵横比按钮清单（任务要求 4:3 = UI 无此选项）',
    async fn(ctx) {
      const ratios = await page.eval("[...document.querySelectorAll('.aspect-ratio-btn')].map((btn) => btn.dataset.ratio)");
      ctx.measure('ratioButtons', ratios);
      ctx.check('存在 1:1 / 16:9 比例按钮', ratios.includes('1:1') && ratios.includes('16:9'), { actual: ratios });
      ctx.check(
        '存在 4:3 比例按钮（任务矩阵要求）',
        ratios.includes('4:3'),
        { level: 'WARN', actual: `UI 实际提供 ${ratios.join(' / ')}；4:3 不存在，以 3:4 代替测试（需产品确认是否补 4:3）` },
      );
    },
  });

  const ratioProbe = async (ratio) => {
    await setRatio(ratio);
    const probe = await page.eval(`(() => {
      const grid = document.getElementById('collageGrid');
      const rect = grid.getBoundingClientRect();
      return {
        rect: { w: rect.width, h: rect.height, ratio: rect.height ? rect.width / rect.height : 0 },
        computedAspectRatio: getComputedStyle(grid).aspectRatio,
        inlineHeight: grid.style.height,
        computedMaxHeight: getComputedStyle(grid).maxHeight,
        active: document.querySelector('.aspect-ratio-btn.active')?.dataset.ratio,
      };
    })()`);
    return probe;
  };

  await runCase(page, {
    id: 'IDX-10',
    group: 'index',
    page: '/',
    name: '纵横比 1:1：预览实际比例',
    async fn(ctx) {
      const probe = await ratioProbe('1:1');
      ctx.measure('probe', probe);
      await ctx.screenshot('index-ratio-1-1');
      ctx.check('1:1 按钮为激活态', probe.active === '1:1', { actual: probe.active });
      ctx.check(
        '预览渲染比例 ≈ 1:1（容差 2%）',
        Math.abs(probe.rect.ratio - 1) <= 0.02,
        { actual: `渲染 ${probe.rect.w}×${probe.rect.h}（比例 ${probe.rect.ratio.toFixed(3)}）；inline height=${probe.inlineHeight}，computed max-height=${probe.computedMaxHeight}` },
      );
    },
  });

  await runCase(page, {
    id: 'IDX-11',
    group: 'index',
    page: '/',
    name: '纵横比 16:9：预览实际比例',
    async fn(ctx) {
      const probe = await ratioProbe('16:9');
      ctx.measure('probe', probe);
      await ctx.screenshot('index-ratio-16-9');
      const target = 16 / 9;
      ctx.check(
        '预览渲染比例 ≈ 16:9（容差 1%）',
        Math.abs(probe.rect.ratio - target) / target <= 0.01,
        { actual: `渲染 ${probe.rect.w}×${probe.rect.h}（比例 ${probe.rect.ratio.toFixed(4)}，目标 ${target.toFixed(4)}）` },
      );
    },
  });

  await runCase(page, {
    id: 'IDX-12',
    group: 'index',
    page: '/',
    name: '纵横比 3:4（代替 4:3）：预览实际比例',
    async fn(ctx) {
      const probe = await ratioProbe('3:4');
      ctx.measure('probe', probe);
      await ctx.screenshot('index-ratio-3-4');
      const target = 3 / 4;
      ctx.check(
        '预览渲染比例 ≈ 3:4（容差 2%）',
        Math.abs(probe.rect.ratio - target) / target <= 0.02,
        { actual: `渲染 ${probe.rect.w}×${probe.rect.h}（比例 ${probe.rect.ratio.toFixed(3)}，目标 0.750）` },
      );
    },
  });

  await runCase(page, {
    id: 'IDX-13',
    group: 'index',
    page: '/',
    name: '导出尺寸与预览一致（1:1 / 16:9 / 3:4）',
    async fn(ctx) {
      const ratios = ['1:1', '16:9', '3:4'];
      const rows = [];
      for (const ratio of ratios) {
        await setRatio(ratio);
        const previewRect = await page.eval("__fa.rect('#collageGrid')");
        const cap = await indexExport();
        const row = {
          ratio,
          previewW: previewRect.w,
          previewH: previewRect.h,
          canvasW: cap.canvasW,
          canvasH: cap.canvasH,
          scale: cap.scale,
        };
        rows.push(row);
        ctx.check(
          `${ratio}：导出尺寸 = 预览尺寸 × scale（2 倍）`,
          cap.canvasW === Math.round(previewRect.w * cap.scale) && cap.canvasH === Math.round(previewRect.h * cap.scale),
          { actual: row, level: 'FAIL' },
        );
        ctx.check(
          `${ratio}：导出比例与预览比例一致（容差 1%）`,
          Math.abs(cap.canvasW / cap.canvasH - previewRect.w / previewRect.h) / (previewRect.w / previewRect.h) <= 0.01,
          { actual: row, level: 'FAIL' },
        );
      }
      ctx.measure('exports', rows);
      ctx.check('未真正触发文件下载（anchor click 被拦截）', page.dialogs.length === 0, { actual: page.dialogs.slice(), level: 'WARN' });
      ctx.check('导出后页面 URL 未变化', (await page.eval('location.href')).endsWith('/'), { level: 'WARN' });
      await ctx.screenshot('index-export-ratio');
    },
  });

  await runCase(page, {
    id: 'IDX-14',
    group: 'index',
    page: '/',
    name: 'Gutter 滑块：CSS 变量 + 导出像素变化',
    async fn(ctx) {
      await setRatio('1:1');
      await page.eval("__fa.setRange('#gutterSlider', 0)");
      await sleep(200);
      const gutter0Export = await indexExport();
      await page.eval("__fa.setRange('#gutterSlider', 30)");
      await sleep(250);
      const style = await page.eval(`({
        cssVar: document.documentElement.style.getPropertyValue('--gutter'),
        label: document.getElementById('gutterValue').textContent,
        gridGap: getComputedStyle(document.getElementById('collageGrid')).gap,
      })`);
      const gutter30Export = await indexExport();
      ctx.measure('cssVar', style.cssVar);
      ctx.measure('gridGap', style.gridGap);
      ctx.measure('exportHashes', { gutter0: gutter0Export.snapshot?.hash, gutter30: gutter30Export.snapshot?.hash });
      await ctx.screenshot('index-gutter-30');
      ctx.check('CSS 变量 --gutter = 30px', style.cssVar.trim() === '30px', { actual: style.cssVar });
      ctx.check('滑块数值标签更新为 30px', style.label.includes('30'), { actual: style.label });
      ctx.check('导出 canvas 像素随 gutter 变化', gutter0Export.snapshot?.hash !== gutter30Export.snapshot?.hash, {
        actual: { gutter0: gutter0Export.snapshot?.hash, gutter30: gutter30Export.snapshot?.hash },
      });
    },
  });

  await runCase(page, {
    id: 'IDX-15',
    group: 'index',
    page: '/',
    name: 'Radius 滑块：CSS 变量 + 导出像素变化',
    async fn(ctx) {
      await page.eval("__fa.setRange('#radiusSlider', 0)");
      await sleep(250);
      const radius0Export = await indexExport();
      await page.eval("__fa.setRange('#radiusSlider', 60)");
      await sleep(300);
      const style = await page.eval(`({
        cssVar: document.documentElement.style.getPropertyValue('--radius'),
        label: document.getElementById('radiusValue').textContent,
        innerRadius: getComputedStyle(document.querySelector('.image-inner-container')).borderRadius,
      })`);
      const radius60Export = await indexExport();
      ctx.measure('cssVar', style.cssVar);
      ctx.measure('innerRadius', style.innerRadius);
      ctx.measure('exportHashes', { radius0: radius0Export.snapshot?.hash, radius60: radius60Export.snapshot?.hash });
      await ctx.screenshot('index-radius-60');
      ctx.check('CSS 变量 --radius = 60px', style.cssVar.trim() === '60px', { actual: style.cssVar });
      ctx.check('图片容器圆角 = 60px', style.innerRadius === '60px', { actual: style.innerRadius });
      ctx.check('导出 canvas 像素随 radius 变化', radius0Export.snapshot?.hash !== radius60Export.snapshot?.hash, {
        actual: { radius0: radius0Export.snapshot?.hash, radius60: radius60Export.snapshot?.hash },
      });
    },
  });

  await runCase(page, {
    id: 'IDX-16',
    group: 'index',
    page: '/',
    name: '6 种滤镜：DOM 样式 + 预览截图差异 + 导出包含滤镜',
    async fn(ctx) {
      await page.eval("__fa.setRange('#radiusSlider', 0)");
      await page.eval("__fa.click('#filterBtn')");
      await sleep(200);
      const filters = ['none', 'noir', 'retro', 'fade', 'glow', 'cool'];
      const records = [];
      const shotHashes = [];
      for (const filter of filters) {
        await page.eval(`__fa.click('.filter-btn[data-filter="${filter}"]')`);
        await sleep(250);
        const computed = await page.eval("getComputedStyle(document.querySelector('.image-outer-container img')).filter");
        const shot = await ctx.screenshot(`index-filter-${filter}`, '#collageGrid');
        shotHashes.push(shot.hash);
        records.push({ filter, computedFilter: computed, shotHash: shot.hash });
        const tokens = FILTER_EXPECTATIONS[filter];
        if (filter === 'none') {
          ctx.check('none 滤镜：computed filter = none', computed === 'none', { actual: computed });
        } else {
          ctx.check(
            `${filter} 滤镜：computed filter 含 ${tokens.join(' + ')}`,
            tokens.every((token) => computed.includes(token)),
            { actual: computed },
          );
        }
      }
      ctx.measure('filters', records);
      ctx.check('6 种滤镜视觉互不相同（截图 hash 全唯一）', new Set(shotHashes).size === filters.length, {
        actual: shotHashes,
      });

      // 导出对比：6 种滤镜逐一导出，验证导出像素随滤镜变化（不做真实下载）
      const exportRecords = {};
      for (const filter of filters) {
        await page.eval(`__fa.click('.filter-btn[data-filter="${filter}"]')`);
        await sleep(200);
        const exported = await indexExport();
        exportRecords[filter] = { hash: exported.snapshot?.hash, filters: exported.images };
      }
      const exportHashes = Object.fromEntries(Object.entries(exportRecords).map(([filter, record]) => [filter, record.hash]));
      ctx.measure('exportHashes', exportHashes);
      ctx.measure('exportedFilters', Object.fromEntries(Object.entries(exportRecords).map(([filter, record]) => [filter, record.filters])));
      ctx.check('6 种滤镜导出像素两两不同（6 个唯一 hash）', new Set(Object.values(exportHashes)).size === filters.length, {
        actual: exportHashes,
      });
      ctx.check('导出克隆 DOM 应用了 grayscale 滤镜（noir）', (exportRecords.noir.filters || []).some((filter) => filter.includes('grayscale')), {
        actual: exportRecords.noir.filters,
      });
      ctx.check('none 导出克隆 DOM 未应用滤镜', (exportRecords.none.filters || []).every((filter) => filter === 'none'), {
        actual: exportRecords.none.filters,
      });
      await page.eval("__fa.click('.filter-btn[data-filter=\"none\"]')");
      await sleep(150);
    },
  });

  await runCase(page, {
    id: 'IDX-17',
    group: 'index',
    page: '/',
    name: '文字：添加 / 编辑 / 删除',
    async fn(ctx) {
      await page.eval("__fa.click('#textBtn')");
      await sleep(150);
      await page.eval("__fa.click('#addTextBtn')");
      await page.waitFor("__fa.count('.text-layer') === 1", { timeoutMs: 10000 });
      const added = await page.eval(`({ count: __fa.count('.text-layer'), text: document.querySelector('.text-layer').textContent })`);
      ctx.check('添加文字后图层数量 = 1', added.count === 1, { actual: added.count });
      ctx.check('文字图层有默认内容', Boolean(added.text && added.text.trim()), { actual: added.text });
      await ctx.screenshot('index-text-added', '#collageGrid');

      await page.eval("__fa.dblclick(document.querySelector('.text-layer'))");
      await page.waitFor("!!document.querySelector('.text-edit-dialog')", { timeoutMs: 10000 });
      const dialogOpen = await page.eval("document.querySelector('.text-edit-dialog input')?.value || null");
      await page.eval(`(() => {
        const dialog = document.querySelector('.text-edit-dialog');
        dialog.querySelector('input').value = 'FA-TEST-TEXT';
        const buttons = [...dialog.querySelectorAll('button')];
        buttons[buttons.length - 1].click();
      })()`);
      await sleep(300);
      const edited = await page.eval(`({ dialogClosed: !document.querySelector('.text-edit-dialog'), text: document.querySelector('.text-layer')?.textContent })`);
      ctx.measure('dialogInitialValue', dialogOpen);
      ctx.check('双击打开编辑对话框', dialogOpen !== null, { actual: dialogOpen });
      ctx.check('编辑后文字内容更新为 FA-TEST-TEXT', edited.text === 'FA-TEST-TEXT', { actual: edited.text });
      ctx.check('确认后对话框关闭', edited.dialogClosed === true);
      await ctx.screenshot('index-text-edited', '#collageGrid');

      await page.eval("__fa.click('.text-delete-btn')");
      await sleep(300);
      const afterDelete = await page.eval("__fa.count('.text-layer')");
      ctx.check('删除文字后图层数量 = 0', afterDelete === 0, { actual: afterDelete });
    },
  });

  await runCase(page, {
    id: 'IDX-18',
    group: 'index',
    page: '/',
    name: '贴纸：添加与渲染',
    async fn(ctx) {
      await page.eval("__fa.click('#stickerBtn')");
      await sleep(150);
      await page.eval("__fa.click('.sticker-btn[data-sticker=\"⭐\"]')");
      await sleep(300);
      const state = await page.eval(`({ count: __fa.count('.sticker-layer'), text: document.querySelector('.sticker-layer')?.textContent })`);
      ctx.check('贴纸图层数量 = 1', state.count === 1, { actual: state.count });
      ctx.check('贴纸内容为 ⭐', state.text === '⭐', { actual: state.text });
      await ctx.screenshot('index-sticker', '#collageGrid');
    },
  });

  await runCase(page, {
    id: 'IDX-19',
    group: 'index',
    page: '/',
    name: '自定义网格：2×2 布局与非法 1×1 校验',
    async fn(ctx) {
      await page.eval("__fa.click('#layoutBtn')");
      await sleep(150);
      await page.eval("__fa.click('.layout-mode-btn[data-mode=\"custom\"]')");
      await sleep(150);
      await page.eval("__fa.setValue('#gridRowsInput', 2); __fa.setValue('#gridColsInput', 2)");
      await page.eval("__fa.click('#applyGridBtn')");
      await sleep(400);
      const applied = await page.eval(`({
        customInputsVisible: getComputedStyle(document.getElementById('customGridInputs')).display !== 'none',
        rows: getComputedStyle(document.getElementById('collageGrid')).gridTemplateRows.split(' ').length,
        cols: getComputedStyle(document.getElementById('collageGrid')).gridTemplateColumns.split(' ').length,
        cells: __fa.count('.image-outer-container'),
      })`);
      ctx.measure('applied', applied);
      ctx.check('自定义网格输入区可见', applied.customInputsVisible === true);
      ctx.check('网格行数 = 2', applied.rows === 2, { actual: applied.rows });
      ctx.check('网格列数 = 2', applied.cols === 2, { actual: applied.cols });
      await ctx.screenshot('index-custom-grid');

      page.dialogs.length = 0;
      await page.eval("__fa.setValue('#gridRowsInput', 1); __fa.setValue('#gridColsInput', 1)");
      await page.eval("__fa.click('#applyGridBtn')");
      await sleep(500);
      const dialogMessage = await readFeedback();
      ctx.measure('invalidGridDialog', dialogMessage);
      ctx.check(
        '网格容量不足时给出用户可见提示（toast 或 dialog）',
        /can only hold|capacity|hold|photos|images|网格|照片|格/i.test(dialogMessage) || dialogMessage.length > 0,
        { actual: dialogMessage || '未捕获到提示' },
      );
    },
  });

  await runCase(page, {
    id: 'IDX-20',
    group: 'index',
    page: '/',
    name: '撤销 / 重做（文字图层拖拽）',
    async fn(ctx) {
      await page.eval("__fa.click('#textBtn')");
      await page.eval("__fa.click('#addTextBtn')");
      await page.waitFor("__fa.count('.text-layer') === 1", { timeoutMs: 10000 });
      await sleep(200);
      const position = () => page.eval('__fa.textWrapperLeft()');
      const p0 = await position();
      await page.eval('__fa.dragText(90, 40)');
      await sleep(250);
      const p1 = await position();
      ctx.measure('positions', { p0, p1 });
      ctx.check('拖拽文字改变了位置', p0 !== p1, { actual: { p0, p1 } });

      await page.eval("__fa.keydown('z', true)");
      await sleep(350);
      const undo1 = await position();
      ctx.measure('afterCtrlZ', undo1);
      ctx.check('Ctrl+Z：一次拖拽后应恢复到拖拽前位置', undo1 === p0, {
        actual: { p0, p1, afterUndo: undo1, note: 'saveState() 在 mouseup（拖拽结束）后才入栈，导致第一次撤销恢复到拖拽后状态（无效撤销）' },
      });

      // 第二次拖拽后再撤销：应回到第二次拖拽前（即第一次撤销后的位置）
      const p1b = await position();
      await page.eval('__fa.dragText(60, 30)');
      await sleep(250);
      const p2 = await position();
      await page.eval("__fa.keydown('z', true)");
      await sleep(350);
      const undo2 = await position();
      ctx.measure('secondDrag', { p1, p1b, p2, afterUndo2: undo2 });
      ctx.check('两次拖拽后 Ctrl+Z 能回退到上一保存点', undo2 === p1b, {
        actual: { p1b, p2, afterUndo: undo2 },
      });

      await page.eval("__fa.keydown('y', true)");
      await sleep(350);
      const redo1 = await position();
      ctx.measure('afterCtrlY', redo1);
      ctx.check('Ctrl+Y 重做生效（位置回到撤销前）', redo1 !== undo2, { actual: { undo2, afterRedo: redo1 } });
      await ctx.screenshot('index-undo-redo');
    },
  });

  await runCase(page, {
    id: 'IDX-21',
    group: 'index',
    page: '/',
    name: 'AI 人脸居中失败路径（不加载外部模型）',
    async fn(ctx) {
      await page.eval("__fa.click('#aiBtn')");
      await sleep(150);
      const sectionVisible = await page.eval("getComputedStyle(document.getElementById('aiSection')).display !== 'none'");
      page.dialogs.length = 0;
      await page.eval("document.getElementById('aiFaceCenterBtn').click()");
      const startedAt = performance.now();
      try {
        await page.waitFor('__fa.cap !== undefined && true', { timeoutMs: 1000 });
      } catch {
        /* noop */
      }
      await sleep(1200);
      const elapsed = Math.round(performance.now() - startedAt);
      const dialogMessage = await readFeedback();
      const buttonState = await page.eval("({ face: document.getElementById('aiFaceCenterBtn').disabled, bg: document.getElementById('aiBgRemovalBtn').disabled })");
      ctx.measure('elapsedMs', elapsed);
      ctx.measure('dialog', dialogMessage);
      ctx.check('AI 面板可见', sectionVisible === true);
      ctx.check(
        '模型加载失败时给出用户可见提示（toast 或 dialog）',
        /AI|model|模型|网络|internet|load|加载/i.test(dialogMessage) || dialogMessage.length > 0,
        { actual: dialogMessage || '未捕获到提示' },
      );
      ctx.check('失败后按钮恢复可用（未卡死）', buttonState.face === false && buttonState.bg === false, { actual: buttonState });
      await ctx.screenshot('index-ai-face-failure');
    },
  });

  await runCase(page, {
    id: 'IDX-22',
    group: 'index',
    page: '/',
    name: 'AI 本地抠图失败路径（esm.sh 被拦截，不真实调用模型）',
    async fn(ctx) {
      page.dialogs.length = 0;
      const srcBefore = await page.eval("document.querySelector('.image-outer-container img')?.src?.slice(0, 64)");
      const startedAt = performance.now();
      await page.eval("document.getElementById('aiBgRemovalBtn').click()");
      try {
        await page.waitFor('true', { timeoutMs: 200 });
      } catch {
        /* noop */
      }
      let elapsed = 0;
      let feedback = '';
      for (let i = 0; i < 40; i += 1) {
        elapsed = Math.round(performance.now() - startedAt);
        feedback = await readFeedback();
        if (feedback.length > 0) break;
        await sleep(500);
      }
      const srcAfter = await page.eval("document.querySelector('.image-outer-container img')?.src?.slice(0, 64)");
      const buttonState = await page.eval("({ face: document.getElementById('aiFaceCenterBtn').disabled, bg: document.getElementById('aiBgRemovalBtn').disabled })");
      ctx.measure('elapsedMs', elapsed);
      ctx.measure('dialog', feedback);
      ctx.check('外部库加载失败时给出用户可见提示（toast 或 dialog）', feedback.length > 0, {
        actual: feedback || `未捕获到提示（等待 ${elapsed}ms）`,
      });
      ctx.check('失败后按钮恢复可用（未卡死）', buttonState.face === false && buttonState.bg === false, { actual: buttonState });
      ctx.check('失败路径未修改图片数据', srcBefore === srcAfter, { actual: { before: srcBefore, after: srcAfter } });
      await ctx.screenshot('index-ai-bg-failure');
    },
  });

  await runCase(page, {
    id: 'IDX-23',
    group: 'index',
    page: '/',
    name: '导出合成：包含文字 / 贴纸 / 滤镜，且不发生真实下载',
    async fn(ctx) {
      await page.eval("__fa.click('#textBtn')");
      const textBefore = await page.eval("__fa.count('.text-layer')");
      await page.eval("__fa.click('#addTextBtn')");
      await page.waitFor(`__fa.count('.text-layer') > ${textBefore}`, { timeoutMs: 10000 });
      await page.eval("__fa.click('#stickerBtn')");
      await page.eval("__fa.click('.sticker-btn[data-sticker=\"🔥\"]')");
      await page.eval("__fa.click('#filterBtn')");
      await page.eval("__fa.click('.filter-btn[data-filter=\"noir\"]')");
      await sleep(400);
      const anchorsBefore = await page.eval('__fa.cap.anchors');
      const urlBefore = await page.eval('location.href');
      const cap = await indexExport();
      const anchorsAfter = await page.eval('__fa.cap.anchors');
      const urlAfter = await page.eval('location.href');
      ctx.measure('cap', { elW: cap.elW, elH: cap.elH, canvasW: cap.canvasW, canvasH: cap.canvasH, texts: cap.texts, stickers: cap.stickers, images: cap.images });
      ctx.check('导出克隆 DOM 含文字图层', (cap.texts || []).some((text) => text && text.trim()), { actual: cap.texts });
      ctx.check('导出克隆 DOM 含贴纸图层', (cap.stickers || []).includes('🔥'), { actual: cap.stickers });
      ctx.check('导出克隆 DOM 应用滤镜', (cap.images || []).some((filter) => filter && filter !== 'none'), { actual: cap.images });
      ctx.check('下载动作被拦截（anchor click 未真正导航）', anchorsAfter > anchorsBefore && urlAfter === urlBefore, {
        actual: { anchorsBefore, anchorsAfter, urlBefore, urlAfter },
      });
      await ctx.screenshot('index-export-composition');
    },
  });
}

// ---------------------------------------------------------------------------
// /tools/square/ 测试
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 博客搜索（R2）
// ---------------------------------------------------------------------------
async function runBlogGroup() {
  await gotoPage('/blog/');

  await runCase(page, {
    id: 'IDX-24',
    group: 'blog',
    page: '/blog/',
    name: '博客搜索：即时过滤 / 结果数 / URL 不变 / 清除恢复',
    async fn(ctx) {
      const before = await page.eval(`({
        cards: document.querySelectorAll('.blog-post-card').length,
        visible: [...document.querySelectorAll('.blog-post-card')].filter((c) => getComputedStyle(c).display !== 'none').length,
        url: location.href,
      })`);
      ctx.measure('before', before);
      await page.eval(`(() => { const el = document.getElementById('blogSearchInput'); el.value = 'mobile'; el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      await sleep(300);
      const filtered = await page.eval(`({
        visible: [...document.querySelectorAll('.blog-post-card')].filter((c) => getComputedStyle(c).display !== 'none').length,
        results: document.getElementById('blogSearchResults').textContent,
        resultsHidden: document.getElementById('blogSearchResults').hidden,
        emptyHidden: document.getElementById('blogSearchEmpty').hidden,
        url: location.href,
      })`);
      ctx.measure('filtered', filtered);
      await ctx.screenshot('blog-search-filtered');
      ctx.check('输入有匹配时至少保留 1 篇文章', filtered.visible >= 1, { actual: filtered.visible });
      ctx.check('输入有匹配时隐藏部分文章（过滤生效）', filtered.visible < before.visible, { actual: { visible: filtered.visible, total: before.visible } });
      ctx.check('结果数可见且非空', filtered.resultsHidden === false && filtered.results.trim().length > 0, { actual: filtered });
      ctx.check('URL 不因搜索改变', filtered.url === before.url, { actual: { before: before.url, after: filtered.url } });

      await page.eval("document.getElementById('blogSearchClear').click()");
      await sleep(200);
      const cleared = await page.eval(`({
        visible: [...document.querySelectorAll('.blog-post-card')].filter((c) => getComputedStyle(c).display !== 'none').length,
        value: document.getElementById('blogSearchInput').value,
      })`);
      ctx.check('清除后恢复全部文章', cleared.visible === before.visible, { actual: cleared });
      ctx.check('清除后输入框为空', cleared.value === '', { actual: cleared.value });
    },
  });

  await runCase(page, {
    id: 'IDX-25',
    group: 'blog',
    page: '/blog/',
    name: '博客搜索：空结果状态 / 清除按钮 / 无障碍语义',
    async fn(ctx) {
      const a11y = await page.eval(`({
        labelFor: document.querySelector('label[for="blogSearchInput"]') !== null,
        inputType: document.getElementById('blogSearchInput')?.type,
        live: document.getElementById('blogSearchResults')?.getAttribute('aria-live'),
      })`);
      await page.eval(`(() => { const el = document.getElementById('blogSearchInput'); el.value = 'zzzz-no-hit-2026'; el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      await sleep(300);
      const empty = await page.eval(`({
        visible: [...document.querySelectorAll('.blog-post-card')].filter((c) => getComputedStyle(c).display !== 'none').length,
        emptyHidden: document.getElementById('blogSearchEmpty').hidden,
        clearVisible: !!document.getElementById('blogSearchClear'),
      })`);
      ctx.measure('a11y', a11y);
      ctx.measure('empty', empty);
      await ctx.screenshot('blog-search-empty');
      ctx.check('label 与输入框关联', a11y.labelFor === true, { actual: a11y });
      ctx.check('使用 type=search', a11y.inputType === 'search', { actual: a11y.inputType });
      ctx.check('结果数使用 aria-live=polite', a11y.live === 'polite', { actual: a11y.live });
      ctx.check('无匹配时隐藏全部文章', empty.visible === 0, { actual: empty.visible });
      ctx.check('空状态可见且清除按钮可用', empty.emptyHidden === false && empty.clearVisible === true, { actual: empty });
    },
  });
}

// ---------------------------------------------------------------------------
// Contact 表单（R2 邮箱接入后）
// ---------------------------------------------------------------------------
async function runContactGroup() {
  await gotoPage('/contact/');

  await runCase(page, {
    id: 'IDX-26',
    group: 'contact',
    page: '/contact/',
    name: 'Contact 表单：结构 / 必填 / 无障碍 / mailto 兜底',
    async fn(ctx) {
      const info = await page.eval(`({
        form: !!document.getElementById('mc-contact-form'),
        action: document.getElementById('mc-contact-form')?.getAttribute('action'),
        fields: [...document.querySelectorAll('#mc-contact-form input, #mc-contact-form select, #mc-contact-form textarea')].map((el) => el.name),
        required: [...document.querySelectorAll('#mc-contact-form [required]')].map((el) => el.name),
        submit: document.querySelector('#mc-contact-form button[type="submit"]')?.textContent.trim(),
        copy: document.getElementById('mc-copy-email')?.textContent.trim(),
        statusLive: document.getElementById('mc-contact-status')?.getAttribute('aria-live'),
        privacy: document.querySelector('.mc-form-privacy')?.textContent.trim(),
        direct: document.getElementById('mc-contact-email-link')?.getAttribute('href'),
        script: [...document.scripts].some((s) => s.src.includes('contact-form.js')),
        minHeights: [...document.querySelectorAll('#mc-contact-form input, #mc-contact-form select, #mc-contact-form textarea')].map((el) => getComputedStyle(el).minHeight),
      })`);
      ctx.measure('form', info);
      await ctx.screenshot('contact-form');
      ctx.check('表单存在', info.form === true);
      ctx.check('form action 指向 contact@mecollage.top', info.action === 'mailto:contact@mecollage.top', { actual: info.action });
      ctx.check('四个字段齐全（name/email/subject/message）', ['name', 'email', 'subject', 'message'].every((k) => info.fields.includes(k)), { actual: info.fields });
      ctx.check('四个字段均 required', ['name', 'email', 'subject', 'message'].every((k) => info.required.includes(k)), { actual: info.required });
      ctx.check('提交/复制按钮存在', Boolean(info.submit) && Boolean(info.copy), { actual: { submit: info.submit, copy: info.copy } });
      ctx.check('状态区 aria-live=polite', info.statusLive === 'polite', { actual: info.statusLive });
      ctx.check('隐私说明存在（不存储/不上传）', Boolean(info.privacy) && info.privacy.length > 10, { actual: info.privacy });
      ctx.check('直邮地址是 mailto', info.direct === 'mailto:contact@mecollage.top', { actual: info.direct });
      ctx.check('contact-form.js 已加载', info.script === true);
      ctx.check('输入控件触控高度 ≥44px', info.minHeights.every((h) => parseInt(h, 10) >= 44), { actual: info.minHeights });
    },
  });

  await runCase(page, {
    id: 'IDX-27',
    group: 'contact',
    page: '/contact/',
    name: 'Contact 表单：mailto 构造 / subject 编码 / body 字段',
    async fn(ctx) {
      const url = await page.eval("window.mcContactForm.buildMailto('Ada', 'ada@example.com', 'Bug report', 'Export is blank')");
      const subject = decodeURIComponent((url.match(/[?&]subject=([^&]*)/) || [])[1] || '');
      const body = decodeURIComponent((url.match(/[?&]body=([^&]*)/) || [])[1] || '');
      ctx.measure('mailto', { url, subject, body });
      ctx.check('mailto 前缀与收件人正确', url.startsWith('mailto:contact@mecollage.top?'), { actual: url.slice(0, 60) });
      ctx.check('subject 带 [MeCollage] 主题前缀', subject === '[MeCollage] Bug report', { actual: subject });
      ctx.check('body 含姓名/邮箱/主题/正文', ['Ada', 'ada@example.com', 'Bug report', 'Export is blank'].every((t) => body.includes(t)), { actual: body });
      const labels = await page.eval(`({
        name: document.getElementById('mc-label-name')?.textContent.trim(),
        message: document.getElementById('mc-label-message')?.textContent.trim(),
      })`);
      ctx.check('body 使用当前页面语言字段标签', body.includes(labels.name) && body.includes(labels.message), { actual: labels });
    },
  });

  await runCase(page, {
    id: 'IDX-28',
    group: 'contact',
    page: '/contact/',
    name: 'Contact 表单：5 语言页面结构一致（zh/tw/ja/es）',
    async fn(ctx) {
      const results = {};
      for (const path of ['/zh/contact/', '/tw/contact/', '/ja/contact/', '/es/contact/']) {
        await gotoPage(path);
        results[path] = await page.eval(`({
          form: !!document.getElementById('mc-contact-form'),
          action: document.getElementById('mc-contact-form')?.getAttribute('action'),
          submit: document.querySelector('#mc-contact-form button[type="submit"]')?.textContent.trim(),
          title: document.querySelector('#contact-form h2')?.textContent.trim(),
        })`);
      }
      ctx.measure('locales', results);
      for (const [path, r] of Object.entries(results)) {
        ctx.check(`${path} 表单存在且 action 正确`, r.form === true && r.action === 'mailto:contact@mecollage.top', { actual: r });
        ctx.check(`${path} 提交文案非空`, Boolean(r.submit) && r.submit.length > 0, { actual: r.submit });
      }
      const uniqueTitles = new Set(Object.values(results).map((r) => r.title));
      ctx.check('本地化标题不是同一份英文', uniqueTitles.size >= 3, { actual: [...uniqueTitles] });
    },
  });
}

async function runSquareGroup() {
  await gotoPage('/tools/square/');
  await runCase(page, {
    id: 'SQR-01',
    group: 'square',
    page: '/tools/square/',
    name: '页面加载 + 上传 800×600：state/画布初始化',
    async fn(ctx) {
      ctx.check('无未捕获 JS 异常', pageLoads['/tools/square/']?.exceptions.length === 0, { actual: pageLoads['/tools/square/']?.exceptions });
      ctx.check('页面状态对象 state 存在', (await page.eval("typeof state !== 'undefined'")) === true);
      await page.setFiles('#fileInput', [FIXTURES.landscape]);
      await waitStateImage(800);
      const info = await page.eval(`({
        image: { w: state.image.width, h: state.image.height },
        canvas: { w: state.canvas.width, h: state.canvas.height },
        selectedTool: state.selectedTool,
        editorVisible: getComputedStyle(document.getElementById('editorContainer')).display !== 'none',
        tools: [...document.querySelectorAll('.tool-btn')].map((btn) => btn.dataset.tool),
      })`);
      ctx.measure('state', info);
      ctx.check('图片尺寸 800×600', info.image.w === 800 && info.image.h === 600, { actual: info.image });
      ctx.check('预览画布为正方形', info.canvas.w === info.canvas.h && info.canvas.w > 0, { actual: info.canvas });
      ctx.check('编辑器已显示', info.editorVisible === true);
      ctx.check('四种模式按钮齐全（blur/solid/resize/crop）', ['blur', 'solid', 'resize', 'crop'].every((tool) => info.tools.includes(tool)), { actual: info.tools });
      await ctx.screenshot('square-loaded');
    },
  });

  await runCase(page, {
    id: 'SQR-02',
    group: 'square',
    page: '/tools/square/',
    name: '四种模式切换：state / 控件 / canvas 尺寸',
    async fn(ctx) {
      const records = [];
      for (const tool of ['blur', 'solid', 'resize', 'crop']) {
        await selectTool(tool);
        const info = await page.eval(`({
          selectedTool: state.selectedTool,
          canvas: { w: state.canvas.width, h: state.canvas.height },
          controls: {
            blur: getComputedStyle(document.getElementById('blurControls')).display,
            color: getComputedStyle(document.getElementById('colorControls')).display,
            crop: getComputedStyle(document.getElementById('cropControls')).display,
          },
        })`);
        records.push({ tool, ...info });
        ctx.check(`切换到 ${tool}：state.selectedTool 同步`, info.selectedTool === tool, { actual: info.selectedTool });
        ctx.check(`切换到 ${tool}：canvas 仍为正方形`, info.canvas.w === info.canvas.h, { actual: info.canvas });
      }
      const blurControls = records.find((record) => record.tool === 'blur').controls.blur;
      const solidControls = records.find((record) => record.tool === 'solid').controls.color;
      const cropControls = records.find((record) => record.tool === 'crop').controls.crop;
      ctx.check('blur 模式显示模糊强度控件', blurControls !== 'none', { actual: blurControls });
      ctx.check('solid 模式显示颜色控件', solidControls !== 'none', { actual: solidControls });
      ctx.check('crop 模式显示缩放控件', cropControls !== 'none', { actual: cropControls });
      await ctx.screenshot('square-mode-controls');
    },
  });

  await runCase(page, {
    id: 'SQR-03',
    group: 'square',
    page: '/tools/square/',
    name: 'blur / solid 模式视觉与参数生效（背景是否可见）',
    async fn(ctx) {
      await selectTool('blur');
      const blurHashDefault = await page.eval('__fa.pixelSnapshot(state.canvas).hash');
      await page.eval("__fa.setRange('#blurSlider', 10)");
      await sleep(300);
      const blurHash10 = await page.eval('__fa.pixelSnapshot(state.canvas).hash');
      await page.eval("__fa.setRange('#blurSlider', 100)");
      await sleep(300);
      const blurHash100 = await page.eval('__fa.pixelSnapshot(state.canvas).hash');

      await selectTool('solid');
      await page.eval("(() => { const el = document.getElementById('backgroundColor'); el.value = '#ffffff'; el.dispatchEvent(new Event('input', { bubbles: true })); })()");
      await sleep(300);
      const solidWhiteHash = await page.eval('__fa.pixelSnapshot(state.canvas).hash');
      await page.eval("(() => { const el = document.getElementById('backgroundColor'); el.value = '#ff0000'; el.dispatchEvent(new Event('input', { bubbles: true })); })()");
      await sleep(300);
      const solidRedHash = await page.eval('__fa.pixelSnapshot(state.canvas).hash');

      await selectTool('crop');
      await page.eval("__fa.setRange('#zoomSlider', 100)");
      await sleep(300);
      const cropHash = await page.eval('__fa.pixelSnapshot(state.canvas).hash');

      ctx.measure('hashes', { blurHashDefault, blurHash10, blurHash100, solidWhiteHash, solidRedHash, cropHash });
      await ctx.screenshot('square-blur-solid');
      ctx.check('blur 强度滑块改变预览像素', blurHash10 !== blurHash100, {
        actual: { blur10: blurHash10, blur100: blurHash100, note: '主图以 cover 方式铺满画布，模糊背景完全不可见，强度无视觉效果' },
      });
      ctx.check('solid 背景色改变预览像素', solidWhiteHash !== solidRedHash, {
        actual: { white: solidWhiteHash, red: solidRedHash, note: '主图 cover 铺满画布，颜色背景完全不可见' },
      });
      ctx.check('blur 与 solid 模式输出应不同（背景差异）', blurHashDefault !== solidWhiteHash, {
        actual: { blur: blurHashDefault, solid: solidWhiteHash },
      });
      ctx.check('blur 与 crop 模式输出应不同（背景差异）', blurHashDefault !== cropHash, {
        actual: { blur: blurHashDefault, crop: cropHash },
      });
    },
  });

  await runCase(page, {
    id: 'SQR-04',
    group: 'square',
    page: '/tools/square/',
    name: 'resize 模式：白底 contain 输出与模式切换',
    async fn(ctx) {
      await selectTool('resize');
      const info = await page.eval(`({
        selectedTool: state.selectedTool,
        canvas: { w: state.canvas.width, h: state.canvas.height },
        samples: __fa.pixelSnapshot(state.canvas).samples,
        hash: __fa.pixelSnapshot(state.canvas).hash,
      })`);
      ctx.check('resize 模式 state 同步', info.selectedTool === 'resize', { actual: info.selectedTool });
      ctx.check('canvas 保持正方形', info.canvas.w === info.canvas.h);
      const expectedStretchHash = await page.eval(`(() => {
        const c = document.createElement('canvas');
        c.width = state.canvas.width;
        c.height = state.canvas.height;
        const x = c.getContext('2d');
        x.fillStyle = '#ffffff';
        x.fillRect(0, 0, c.width, c.height);
        x.drawImage(state.image, 0, 0, c.width, c.height);
        return __fa.pixelSnapshot(c).hash;
      })()`);
      ctx.measure('expectedStretchHash', expectedStretchHash);
      ctx.check(
        'resize 模式 = 整图拉伸铺满（与独立绘制结果一致）',
        info.hash === expectedStretchHash,
        { actual: { actual: info.hash, expected: expectedStretchHash } },
      );
      ctx.measure('resizeHash', info.hash);
      await ctx.screenshot('square-resize');
    },
  });

  await runCase(page, {
    id: 'SQR-05',
    group: 'square',
    page: '/tools/square/',
    name: 'crop 模式：缩放/平移参数生效',
    async fn(ctx) {
      await selectTool('crop');
      await page.eval("__fa.setRange('#zoomSlider', 100)");
      await sleep(250);
      const hash100 = await page.eval('__fa.pixelSnapshot(state.canvas).hash');
      await page.eval("__fa.setRange('#zoomSlider', 180)");
      await sleep(300);
      const state180 = await page.eval(`({ zoom: state.zoom, hash: __fa.pixelSnapshot(state.canvas).hash, pan: { ...state.pan } })`);
      await page.eval("__fa.dragCanvas('#previewCanvas', 300, 300, 380, 340)");
      await sleep(300);
      const statePan = await page.eval(`({ zoom: state.zoom, hash: __fa.pixelSnapshot(state.canvas).hash, pan: { ...state.pan } })`);
      ctx.measure('crop', { hash100, state180, statePan });
      ctx.check('缩放 180% 生效', state180.zoom === 180, { actual: state180.zoom });
      ctx.check('缩放改变输出像素', hash100 !== state180.hash, { actual: { hash100, hash180: state180.hash } });
      ctx.check('平移改变输出像素', state180.hash !== statePan.hash, { actual: { hash180: state180.hash, hashPan: statePan.hash } });
      ctx.check('平移参数非零', statePan.pan.x !== 0 || statePan.pan.y !== 0, { actual: statePan.pan });
      await ctx.screenshot('square-crop');
    },
  });

  await runCase(page, {
    id: 'SQR-06',
    group: 'square',
    page: '/tools/square/',
    name: '导出：四种模式 1200px 均为正方形且内容差异',
    async fn(ctx) {
      const exports = {};
      for (const tool of ['blur', 'solid', 'resize', 'crop']) {
        await selectTool(tool);
        await page.eval("__fa.setSelect('#outputSize', '1200')");
        await sleep(150);
        const blob = await toolExport(page, "document.querySelector('button.download-btn').click()");
        exports[tool] = { w: blob.w, h: blob.h, type: blob.type, snapshot: blob.snapshot };
        ctx.check(`${tool} 导出尺寸 1200×1200`, blob.w === 1200 && blob.h === 1200, { actual: { w: blob.w, h: blob.h } });
      }
      ctx.measure('exports', {
        blur: { w: exports.blur.w, h: exports.blur.h, hash: exports.blur.snapshot?.hash },
        solid: { w: exports.solid.w, h: exports.solid.h, hash: exports.solid.snapshot?.hash },
        resize: { w: exports.resize.w, h: exports.resize.h, hash: exports.resize.snapshot?.hash },
        crop: { w: exports.crop.w, h: exports.crop.h, hash: exports.crop.snapshot?.hash },
      });
      ctx.check('blur 与 solid 导出内容应不同', exports.blur.snapshot?.hash !== exports.solid.snapshot?.hash, {
        actual: { blur: exports.blur.snapshot?.hash, solid: exports.solid.snapshot?.hash },
      });
      ctx.check('blur 与 crop 导出内容应不同', exports.blur.snapshot?.hash !== exports.crop.snapshot?.hash, {
        actual: { blur: exports.blur.snapshot?.hash, crop: exports.crop.snapshot?.hash },
      });
      await ctx.screenshot('square-export-1200');
    },
  });

  await runCase(page, {
    id: 'SQR-07',
    group: 'square',
    page: '/tools/square/',
    name: '导出：original / custom 尺寸',
    async fn(ctx) {
      await selectTool('crop');
      await page.eval("__fa.setSelect('#outputSize', 'original')");
      await sleep(150);
      const original = await toolExport(page, "document.querySelector('button.download-btn').click()");
      ctx.check('original 导出 = max(800,600) = 800×800', original.w === 800 && original.h === 800, { actual: { w: original.w, h: original.h } });

      await page.eval("__fa.setSelect('#outputSize', 'custom')");
      await page.eval("__fa.setValue('#customSize', 300)");
      await sleep(150);
      const custom = await toolExport(page, "document.querySelector('button.download-btn').click()");
      ctx.check('custom 300 导出 = 300×300', custom.w === 300 && custom.h === 300, { actual: { w: custom.w, h: custom.h } });
      ctx.measure('customGroupDisplay', await page.eval("getComputedStyle(document.getElementById('customSizeGroup')).display"));
    },
  });
}

// ---------------------------------------------------------------------------
// /tools/squarecrop/ 测试
// ---------------------------------------------------------------------------

async function runSquarecropGroup() {
  await gotoPage('/tools/squarecrop/');
  await runCase(page, {
    id: 'CRP-01',
    group: 'squarecrop',
    page: '/tools/squarecrop/',
    name: '页面加载 + 上传 800×600：方形画布 / fitScale',
    async fn(ctx) {
      ctx.check('无未捕获 JS 异常', pageLoads['/tools/squarecrop/']?.exceptions.length === 0, { actual: pageLoads['/tools/squarecrop/']?.exceptions });
      await page.setFiles('#fileInput', [FIXTURES.landscape]);
      await waitStateImage(800);
      const info = await page.eval(`({
        image: { w: state.image.width, h: state.image.height },
        canvas: { w: state.canvas.width, h: state.canvas.height },
        fitScale: state.fitScale,
        zoom: state.zoom,
        pan: { ...state.pan },
      })`);
      ctx.measure('state', info);
      ctx.check('图片尺寸 800×600', info.image.w === 800 && info.image.h === 600, { actual: info.image });
      ctx.check('画布 1:1 正方形', info.canvas.w === info.canvas.h && info.canvas.w > 0, { actual: info.canvas });
      ctx.check('fitScale 已计算（>0）', info.fitScale > 0, { actual: info.fitScale });
      await ctx.screenshot('squarecrop-loaded');
    },
  });

  await runCase(page, {
    id: 'CRP-02',
    group: 'squarecrop',
    page: '/tools/squarecrop/',
    name: '缩放滑块边界：100% / 300%',
    async fn(ctx) {
      const values = {};
      await page.eval("__fa.setRange('#zoomSlider', 10)");
      await sleep(150);
      values.min = await page.eval('state.zoom');
      await page.eval("__fa.setRange('#zoomSlider', 300)");
      await sleep(150);
      values.max = await page.eval('state.zoom');
      await page.eval("__fa.setRange('#zoomSlider', 999)");
      await sleep(150);
      values.overMax = await page.eval('state.zoom');
      await page.eval("__fa.setRange('#zoomSlider', 0)");
      await sleep(150);
      values.underMin = await page.eval('state.zoom');
      await page.eval("__fa.setRange('#zoomSlider', 100)");
      await sleep(150);
      values.reset = await page.eval('state.zoom');
      ctx.measure('zoomValues', values);
      ctx.check('滑块 min=100 / max=300 生效', values.min === 100 && values.max === 300, { actual: values });
      ctx.check('超上限被限制在 300', values.overMax === 300, { actual: values.overMax });
      ctx.check('低于下限被限制在 100（cover 模式，避免露底）', values.underMin === 100, { actual: values.underMin });
    },
  });

  await runCase(page, {
    id: 'CRP-03',
    group: 'squarecrop',
    page: '/tools/squarecrop/',
    name: '滚轮缩放：方向 / 步长 / 上下边界',
    async fn(ctx) {
      await page.eval("__fa.setRange('#zoomSlider', 100)");
      await sleep(150);
      const rect = await page.eval("__fa.rect('#previewCanvas')");
      const centerX = rect.x + rect.w / 2;
      const centerY = rect.y + rect.h / 2;
      const before = await page.eval('state.zoom');
      await page.wheel(centerX, centerY, -200);
      await sleep(150);
      const afterUp = await page.eval('state.zoom');
      await page.wheel(centerX, centerY, 200);
      await sleep(150);
      const afterDown = await page.eval('state.zoom');
      // 连续向上 → 上限 300
      for (let i = 0; i < 60; i += 1) await page.wheel(centerX, centerY, -300);
      await sleep(250);
      const maxZoom = await page.eval('state.zoom');
      // 连续向下 → 下限 10
      for (let i = 0; i < 80; i += 1) await page.wheel(centerX, centerY, 300);
      await sleep(250);
      const minZoom = await page.eval('state.zoom');
      ctx.measure('wheel', { before, afterUp, afterDown, maxZoom, minZoom });
      ctx.check('滚轮向上放大（+5 步进）', afterUp === before + 5, { actual: { before, afterUp } });
      ctx.check('滚轮向下缩小（-5 步进）', afterDown === afterUp - 5, { actual: { afterUp, afterDown } });
      ctx.check('连续放大被限制在 300', maxZoom === 300, { actual: maxZoom });
      ctx.check('连续缩小被限制在 100（cover 模式）', minZoom === 100, { actual: minZoom });
    },
  });

  await runCase(page, {
    id: 'CRP-04',
    group: 'squarecrop',
    page: '/tools/squarecrop/',
    name: '拖拽平移：pan 与画面内容变化',
    async fn(ctx) {
      await page.eval("__fa.setRange('#zoomSlider', 150)");
      await sleep(200);
      const before = await page.eval(`({ pan: { ...state.pan }, hash: __fa.pixelSnapshot(state.canvas).hash })`);
      await page.eval("__fa.dragCanvas('#previewCanvas', 300, 300, 380, 350)");
      await sleep(250);
      const after = await page.eval(`({ pan: { ...state.pan }, hash: __fa.pixelSnapshot(state.canvas).hash })`);
      ctx.measure('pan', { before, after });
      ctx.check('拖拽后 pan 发生位移', after.pan.x !== before.pan.x || after.pan.y !== before.pan.y, { actual: after.pan });
      ctx.check('拖拽后画布内容变化', before.hash !== after.hash, { actual: { before: before.hash, after: after.hash } });
      await ctx.screenshot('squarecrop-pan');
    },
  });

  await runCase(page, {
    id: 'CRP-05',
    group: 'squarecrop',
    page: '/tools/squarecrop/',
    name: '拖拽边界：图像是否可被完全拖出画布',
    async fn(ctx) {
      await page.eval("__fa.setRange('#zoomSlider', 150)");
      await sleep(250);
      const far = await page.eval(`(() => {
        const snapshotBefore = __fa.pixelSnapshot(state.canvas);
        __fa.dragCanvas('#previewCanvas', 100, 100, 900, 900);
        const snapshotAfter = __fa.pixelSnapshot(state.canvas);
        return {
          panBefore: { x: 0, y: 0 },
          panAfter: { ...state.pan },
          alpha0Before: snapshotBefore.alpha0Ratio,
          alpha0After: snapshotAfter.alpha0Ratio,
          canvasArea: state.canvas.width * state.canvas.height,
          canvas: { w: state.canvas.width, h: state.canvas.height },
        };
      })()`);
      await sleep(200);
      ctx.measure('farDrag', far);
      await ctx.screenshot('squarecrop-drag-boundary');
      ctx.check(
        '拖拽受边界约束（不应能拖至画面全空）',
        far.alpha0After < 0.98,
        {
          actual: `pan.x=${Math.round(far.panAfter.x)}, pan.y=${Math.round(far.panAfter.y)}；画布透明像素比例 ${(far.alpha0After * 100).toFixed(1)}%`,
        },
      );
      ctx.check(
        '平移被 clamp 在封面（cover）允许范围内',
        Math.abs(far.panAfter.x) <= far.canvas.w && Math.abs(far.panAfter.y) <= far.canvas.h,
        { actual: far.panAfter },
      );
    },
  });

  await runCase(page, {
    id: 'CRP-06',
    group: 'squarecrop',
    page: '/tools/squarecrop/',
    name: '导出尺寸：original = 短边、1200 = 1200×1200',
    async fn(ctx) {
      await page.eval("__fa.setRange('#zoomSlider', 100)");
      await sleep(200);
      await page.eval("__fa.setSelect('#outputSize', 'original')");
      await sleep(120);
      const original = await toolExport(page, CLICK_VISIBLE_DOWNLOAD);
      ctx.check('original 导出 600×600（800×600 的短边）', original.w === 600 && original.h === 600, { actual: { w: original.w, h: original.h } });
      await page.eval("__fa.setSelect('#outputSize', '1200')");
      await sleep(120);
      const size1200 = await toolExport(page, CLICK_VISIBLE_DOWNLOAD);
      ctx.check('1200 导出 1200×1200', size1200.w === 1200 && size1200.h === 1200, { actual: { w: size1200.w, h: size1200.h } });
      ctx.measure('exports', { original: { w: original.w, h: original.h }, size1200: { w: size1200.w, h: size1200.h } });
    },
  });

  await runCase(page, {
    id: 'CRP-07',
    group: 'squarecrop',
    page: '/tools/squarecrop/',
    name: '导出内容随缩放/平移变化',
    async fn(ctx) {
      await page.eval("__fa.setRange('#zoomSlider', 100)");
      await sleep(200);
      const zoom100 = await toolExport(page, CLICK_VISIBLE_DOWNLOAD);
      await page.eval("__fa.setRange('#zoomSlider', 200)");
      await sleep(300);
      const zoom200 = await toolExport(page, CLICK_VISIBLE_DOWNLOAD);
      ctx.check('缩放后导出内容变化', zoom100.snapshot?.hash !== zoom200.snapshot?.hash, {
        actual: { zoom100: zoom100.snapshot?.hash, zoom200: zoom200.snapshot?.hash },
      });

      const panBefore = await toolExport(page, CLICK_VISIBLE_DOWNLOAD);
      await page.eval("__fa.dragCanvas('#previewCanvas', 300, 300, 350, 330)");
      await sleep(300);
      const panAfter = await toolExport(page, CLICK_VISIBLE_DOWNLOAD);
      ctx.check('平移后导出内容变化', panBefore.snapshot?.hash !== panAfter.snapshot?.hash, {
        actual: { before: panBefore.snapshot?.hash, after: panAfter.snapshot?.hash },
      });
    },
  });

  await runCase(page, {
    id: 'CRP-08',
    group: 'squarecrop',
    page: '/tools/squarecrop/',
    name: '导出格式与下载拦截',
    async fn(ctx) {
      page.dialogs.length = 0;
      await page.eval("__fa.setSelect('#outputFormat', 'png')");
      await page.eval("__fa.setSelect('#outputSize', 'original')");
      await sleep(150);
      const anchorsBefore = await page.eval('__fa.cap.anchors');
      const png = await toolExport(page, CLICK_VISIBLE_DOWNLOAD);
      const anchorsAfter = await page.eval('__fa.cap.anchors');
      ctx.measure('exportMeta', { type: png.type, w: png.w, h: png.h, anchorsBefore, anchorsAfter });
      ctx.check('PNG 格式导出（MIME image/png）', png.type === 'image/png', { actual: png.type });
      ctx.check('导出触发下载按钮但被拦截（无真实下载）', anchorsAfter > anchorsBefore, { actual: { anchorsBefore, anchorsAfter } });
      await ctx.screenshot('squarecrop-export');
    },
  });
}

// ---------------------------------------------------------------------------
// /tools/roundedcorners/ 测试
// ---------------------------------------------------------------------------

async function runRoundedCornersGroup() {
  await gotoPage('/tools/roundedcorners/');
  await runCase(page, {
    id: 'RND-01',
    group: 'roundedcorners',
    page: '/tools/roundedcorners/',
    name: '页面加载 + 上传 1024×1024：初始状态',
    async fn(ctx) {
      ctx.check('无未捕获 JS 异常', pageLoads['/tools/roundedcorners/']?.exceptions.length === 0, { actual: pageLoads['/tools/roundedcorners/']?.exceptions });
      await page.setFiles('#fileInput', [FIXTURES.square]);
      await waitStateImage(1024);
      const info = await page.eval(`({
        image: { w: state.image.width, h: state.image.height },
        canvas: { w: state.canvas.width, h: state.canvas.height },
        radius: state.radius,
        slider: { min: document.getElementById('radiusSlider').min, max: document.getElementById('radiusSlider').max, value: document.getElementById('radiusSlider').value },
        format: document.getElementById('outputFormat').value,
        size: document.getElementById('outputSize').value,
      })`);
      ctx.measure('initial', info);
      ctx.check('图片尺寸 1024×1024', info.image.w === 1024 && info.image.h === 1024, { actual: info.image });
      ctx.check('预览画布已初始化', info.canvas.w > 0 && info.canvas.h > 0, { actual: info.canvas });
      ctx.check('radius 滑块范围 0-50（百分比）', info.slider.min === '0' && info.slider.max === '50', { actual: info.slider });
      await ctx.screenshot('roundedcorners-loaded');
    },
  });

  await runCase(page, {
    id: 'RND-02',
    group: 'roundedcorners',
    page: '/tools/roundedcorners/',
    name: 'radius 0 / 25 / 50：圆角与透明角像素',
    async fn(ctx) {
      const records = {};
      for (const radius of [0, 25, 50]) {
        await page.eval(`__fa.setRange('#radiusSlider', ${radius})`);
        await sleep(300);
        records[radius] = await page.eval(`(() => {
          const canvas = state.canvas, ctx = state.ctx;
          const px = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data);
          return {
            radius: state.radius,
            canvas: { w: canvas.width, h: canvas.height },
            corner: px(1, 1),
            center: px(canvas.width >> 1, canvas.height >> 1),
            alpha0Ratio: __fa.pixelSnapshot(canvas).alpha0Ratio,
          };
        })()`);
      }
      ctx.measure('radii', records);
      await ctx.screenshot('roundedcorners-radius');
      ctx.check('radius=0：四角不透明（alpha=255）', records[0].corner[3] === 255, { actual: records[0].corner });
      ctx.check('radius=25：角像素透明（alpha=0）', records[25].corner[3] === 0, { actual: records[25].corner });
      ctx.check('radius=25：中心保持不透明', records[25].center[3] === 255, { actual: records[25].center });
      ctx.check('radius=50（圆形模式）：角透明、中心不透明', records[50].corner[3] === 0 && records[50].center[3] === 255, {
        actual: { corner: records[50].corner, center: records[50].center },
      });
      ctx.check('radius=50：画布变为正方形', records[50].canvas.w === records[50].canvas.h, { actual: records[50].canvas });
    },
  });

  await runCase(page, {
    id: 'RND-03',
    group: 'roundedcorners',
    page: '/tools/roundedcorners/',
    name: '导出尺寸：512 / 1024 / custom 256 / original',
    async fn(ctx) {
      await page.eval("__fa.setRange('#radiusSlider', 25)");
      await sleep(250);
      ctx.check('默认输出格式为 PNG', (await page.eval("document.getElementById('outputFormat').value")) === 'png');
      const sizes = {};
      for (const [option, expected] of [['512', 512], ['1024', 1024]]) {
        await page.eval(`__fa.setSelect('#outputSize', '${option}')`);
        await sleep(150);
        const blob = await toolExport(page, CLICK_VISIBLE_DOWNLOAD);
        sizes[option] = { w: blob.w, h: blob.h, type: blob.type };
        ctx.check(`${option}px 导出 ${expected}×${expected}`, blob.w === expected && blob.h === expected, { actual: { w: blob.w, h: blob.h } });
      }
      await page.eval("__fa.setSelect('#outputSize', 'custom')");
      await page.eval("__fa.setValue('#customWidth', 256); __fa.setValue('#customHeight', 256)");
      await sleep(150);
      const custom = await toolExport(page, CLICK_VISIBLE_DOWNLOAD);
      sizes.custom = { w: custom.w, h: custom.h };
      ctx.check('custom 256×256 导出 256×256', custom.w === 256 && custom.h === 256, { actual: { w: custom.w, h: custom.h } });

      await page.eval("__fa.setSelect('#outputSize', 'original')");
      await sleep(150);
      const original = await toolExport(page, CLICK_VISIBLE_DOWNLOAD);
      sizes.original = { w: original.w, h: original.h };
      ctx.check('original 导出 1024×1024', original.w === 1024 && original.h === 1024, { actual: { w: original.w, h: original.h } });
      ctx.measure('sizes', sizes);
    },
  });

  await runCase(page, {
    id: 'RND-04',
    group: 'roundedcorners',
    page: '/tools/roundedcorners/',
    name: 'PNG 透明背景 + 圆角随输出尺寸等比缩放',
    async fn(ctx) {
      await page.eval("__fa.setRange('#radiusSlider', 25)");
      await sleep(250);
      const exportsBySize = {};
      for (const option of ['512', '1024']) {
        await page.eval(`__fa.setSelect('#outputSize', '${option}')`);
        await sleep(150);
        const blob = await toolExport(page, CLICK_VISIBLE_DOWNLOAD);
        exportsBySize[option] = blob;
      }
      await page.eval("__fa.setSelect('#outputSize', 'custom')");
      await page.eval("__fa.setValue('#customWidth', 256); __fa.setValue('#customHeight', 256)");
      await sleep(150);
      exportsBySize['256'] = await toolExport(page, CLICK_VISIBLE_DOWNLOAD);

      const probes = {};
      for (const [size, blob] of Object.entries(exportsBySize)) {
        const norm = Object.fromEntries((blob.snapshot?.normSamples || []).map((sample) => [`${sample.nx},${sample.ny}`, sample.px]));
        probes[size] = { type: blob.type, w: blob.w, h: blob.h, corner: blob.snapshot?.samples?.tl, norm };
        ctx.check(`${size} 导出为 PNG`, blob.type === 'image/png', { actual: blob.type });
        ctx.check(`${size} 导出角落像素透明（alpha=0）`, blob.snapshot?.samples?.tl?.[3] === 0, { actual: blob.snapshot?.samples?.tl });
      }
      ctx.measure('probes', probes);
      const alphaAt = (size, key) => probes[size].norm[key]?.[3];
      for (const size of ['256', '512', '1024']) {
        ctx.check(
          `${size}：圆角边界随尺寸等比缩放（0.05 归一化点透明、0.10 不透明）`,
          alphaAt(size, '0.05,0.05') === 0 && alphaAt(size, '0.1,0.1') === 255,
          { actual: { alpha005: alphaAt(size, '0.05,0.05'), alpha010: alphaAt(size, '0.1,0.1') } },
        );
      }
      await ctx.screenshot('roundedcorners-export');
    },
  });

  await runCase(page, {
    id: 'RND-05',
    group: 'roundedcorners',
    page: '/tools/roundedcorners/',
    name: '自定义宽高（非正方形输入）：300×200',
    async fn(ctx) {
      await page.eval("__fa.setSelect('#outputSize', 'custom')");
      await page.eval("__fa.setValue('#customWidth', 300); __fa.setValue('#customHeight', 200)");
      await sleep(150);
      const custom = await toolExport(page, CLICK_VISIBLE_DOWNLOAD);
      ctx.measure('custom', { w: custom.w, h: custom.h });
      ctx.check('custom 300×200 导出 300×200', custom.w === 300 && custom.h === 200, { actual: { w: custom.w, h: custom.h } });
    },
  });

  await runCase(page, {
    id: 'RND-06',
    group: 'roundedcorners',
    page: '/tools/roundedcorners/',
    name: 'radius=50 圆形模式：横图导出比例与透明',
    async fn(ctx) {
      await page.setFiles('#fileInput', [FIXTURES.landscape]);
      await waitStateImage(800);
      await page.eval("__fa.setRange('#radiusSlider', 50)");
      await sleep(350);
      const preview = await page.eval(`({
        canvas: { w: state.canvas.width, h: state.canvas.height },
        corner: (() => { const c = state.canvas, ctx = state.ctx; return Array.from(ctx.getImageData(1, 1, 1, 1).data); })(),
        center: (() => { const c = state.canvas, ctx = state.ctx; return Array.from(ctx.getImageData(c.width >> 1, c.height >> 1, 1, 1).data); })(),
      })`);
      await page.eval("__fa.setSelect('#outputSize', '512')");
      await sleep(150);
      const exported = await toolExport(page, CLICK_VISIBLE_DOWNLOAD);
      ctx.measure('circle', { preview, exported: { w: exported.w, h: exported.h } });
      ctx.check('圆形模式预览画布为正方形', preview.canvas.w === preview.canvas.h, { actual: preview.canvas });
      ctx.check('圆形模式预览角透明', preview.corner[3] === 0, { actual: preview.corner });
      ctx.check('圆形模式预览中心不透明', preview.center[3] === 255, { actual: preview.center });
      ctx.check('圆形模式导出为正方形', exported.w === exported.h, { actual: { w: exported.w, h: exported.h } });
      ctx.check('圆形模式导出角落透明', exported.snapshot?.samples?.tl?.[3] === 0, { actual: exported.snapshot?.samples?.tl });
      await ctx.screenshot('roundedcorners-circle');
    },
  });
}

// ---------------------------------------------------------------------------
// /tools/blurredframe/ 测试
// ---------------------------------------------------------------------------

async function runBlurredFrameGroup() {
  await gotoPage('/tools/blurredframe/');
  await runCase(page, {
    id: 'BLR-01',
    group: 'blurredframe',
    page: '/tools/blurredframe/',
    name: '页面加载 + 上传 800×600：画布 / 默认参数',
    async fn(ctx) {
      ctx.check('无未捕获 JS 异常', pageLoads['/tools/blurredframe/']?.exceptions.length === 0, { actual: pageLoads['/tools/blurredframe/']?.exceptions });
      await page.setFiles('#fileInput', [FIXTURES.landscape]);
      await waitStateImage(800);
      await sleep(400);
      const info = await page.eval(`({
        canvas: { w: state.canvas.width, h: state.canvas.height },
        aspectRatio: state.aspectRatio,
        mainScale: state.mainScale,
        bgScale: state.bgScale,
        blurIntensity: state.blurIntensity,
        sliderValues: {
          main: document.getElementById('mainScaleSlider').value,
          bg: document.getElementById('bgScaleSlider').value,
          blur: document.getElementById('blurIntensitySlider').value,
        },
      })`);
      ctx.measure('initial', info);
      ctx.check('画布已初始化且保持原图比例 4:3', info.canvas.w > 0 && info.canvas.h > 0 && Math.abs(info.canvas.w / info.canvas.h - 800 / 600) < 0.02, { actual: info.canvas });
      ctx.check('默认 aspectRatio = original', info.aspectRatio === 'original', { actual: info.aspectRatio });
      ctx.check('默认 mainScale=80 / bgScale=150 / blurIntensity=30', info.mainScale === 80 && info.bgScale === 150 && info.blurIntensity === 30, {
        actual: { mainScale: info.mainScale, bgScale: info.bgScale, blurIntensity: info.blurIntensity },
      });
      await ctx.screenshot('blurredframe-loaded');
    },
  });

  await runCase(page, {
    id: 'BLR-02',
    group: 'blurredframe',
    page: '/tools/blurredframe/',
    name: 'aspect ratio 切换：是否改变 canvas 比例（含 4:3）',
    async fn(ctx) {
      const options = await page.eval("[...document.querySelectorAll('#aspectRatio option')].map((option) => option.value)");
      ctx.measure('ratioOptions', options);
      ctx.check('提供 4:3 比例选项（任务矩阵要求）', options.includes('4:3'), { actual: options, level: 'WARN' });

      const records = [];
      for (const ratio of ['1:1', '4:3', '16:9', '9:16']) {
        await page.eval(`__fa.setSelect('#aspectRatio', '${ratio}')`);
        await sleep(400);
        const info = await page.eval(`({
          ratio: state.aspectRatio,
          canvas: { w: state.canvas.width, h: state.canvas.height },
          hash: __fa.pixelSnapshot(state.canvas).hash,
          exportedCheck: null,
        })`);
        records.push(info);
      }
      ctx.measure('ratios', records);
      await ctx.screenshot('blurredframe-ratio');
      ctx.check('切换后 state.aspectRatio 同步', records.every((record) => record.ratio !== 'original'), { actual: records.map((record) => record.ratio) });
      ctx.check('切换比例会改变画面构图（像素 hash 变化）', new Set(records.map((record) => record.hash)).size >= 3, {
        actual: records.map((record) => record.hash),
      });
      ctx.check(
        'aspect ratio 改变 canvas 宽高比',
        records.some((record) => record.canvas.w !== record.canvas.h),
        {
          actual: `所有比例下 canvas 始终为 ${records[0].canvas.w}×${records[0].canvas.h}（1:1）——aspect ratio 只改变内部构图，不改变画布/导出比例`,
        },
      );

      // 导出比例检查（16:9 下导出仍为正方形）
      await page.eval("__fa.setSelect('#aspectRatio', '16:9')");
      await sleep(400);
      await page.eval("__fa.setSelect('#outputSize', '1200')");
      await sleep(150);
      const exported = await toolExport(page, CLICK_VISIBLE_DOWNLOAD);
      ctx.measure('export16x9', { w: exported.w, h: exported.h });
      ctx.check('16:9 设置下导出应为 16:9', Math.abs(exported.w / exported.h - 16 / 9) <= 0.01, {
        actual: `16:9 设置下导出 ${exported.w}×${exported.h}（比例 ${(exported.w / exported.h).toFixed(3)}，始终正方形）`,
      });
    },
  });

  await runCase(page, {
    id: 'BLR-03',
    group: 'blurredframe',
    page: '/tools/blurredframe/',
    name: 'mainScale 参数：预览与导出均生效',
    async fn(ctx) {
      await page.eval("__fa.setSelect('#aspectRatio', 'original')");
      await sleep(300);
      await page.eval("__fa.setRange('#mainScaleSlider', 60)");
      await sleep(400);
      const preview60 = await page.eval(`({ value: state.mainScale, label: document.getElementById('mainScaleValue').textContent, hash: __fa.pixelSnapshot(state.canvas).hash })`);
      const export60 = await toolExport(page, CLICK_VISIBLE_DOWNLOAD);
      await page.eval("__fa.setRange('#mainScaleSlider', 90)");
      await sleep(400);
      const preview90 = await page.eval(`({ value: state.mainScale, label: document.getElementById('mainScaleValue').textContent, hash: __fa.pixelSnapshot(state.canvas).hash })`);
      const export90 = await toolExport(page, CLICK_VISIBLE_DOWNLOAD);
      ctx.measure('mainScale', { preview60, preview90, exportHashes: { h60: export60.snapshot?.hash, h90: export90.snapshot?.hash } });
      ctx.check('mainScale state 更新为 60/90', preview60.value === 60 && preview90.value === 90, { actual: { preview60: preview60.value, preview90: preview90.value } });
      ctx.check('mainScale 改变预览像素', preview60.hash !== preview90.hash, { actual: { h60: preview60.hash, h90: preview90.hash } });
      ctx.check('mainScale 改变导出像素', export60.snapshot?.hash !== export90.snapshot?.hash, { actual: { h60: export60.snapshot?.hash, h90: export90.snapshot?.hash } });
      ctx.check('参数状态栏百分比文案更新', preview60.label.includes('60') && preview90.label.includes('90'), { actual: { p60: preview60.label, p90: preview90.label } });
      await ctx.screenshot('blurredframe-mainscale');
    },
  });

  await runCase(page, {
    id: 'BLR-04',
    group: 'blurredframe',
    page: '/tools/blurredframe/',
    name: 'bgScale 参数：预览与导出均生效',
    async fn(ctx) {
      await page.eval("__fa.setRange('#bgScaleSlider', 100)");
      await sleep(400);
      const preview100 = await page.eval(`({ value: state.bgScale, label: document.getElementById('bgScaleValue').textContent, hash: __fa.pixelSnapshot(state.canvas).hash })`);
      const export100 = await toolExport(page, CLICK_VISIBLE_DOWNLOAD);
      await page.eval("__fa.setRange('#bgScaleSlider', 220)");
      await sleep(400);
      const preview220 = await page.eval(`({ value: state.bgScale, label: document.getElementById('bgScaleValue').textContent, hash: __fa.pixelSnapshot(state.canvas).hash })`);
      const export220 = await toolExport(page, CLICK_VISIBLE_DOWNLOAD);
      ctx.measure('bgScale', { preview100, preview220 });
      ctx.check('bgScale state 更新为 100/220', preview100.value === 100 && preview220.value === 220, { actual: { v100: preview100.value, v220: preview220.value } });
      ctx.check('bgScale 改变预览像素', preview100.hash !== preview220.hash, { actual: { h100: preview100.hash, h220: preview220.hash } });
      ctx.check('bgScale 改变导出像素', export100.snapshot?.hash !== export220.snapshot?.hash, { actual: { h100: export100.snapshot?.hash, h220: export220.snapshot?.hash } });
    },
  });

  await runCase(page, {
    id: 'BLR-05',
    group: 'blurredframe',
    page: '/tools/blurredframe/',
    name: 'blurIntensity 参数：预览与导出均生效',
    async fn(ctx) {
      await page.eval("__fa.setRange('#blurIntensitySlider', 0)");
      await sleep(450);
      const preview0 = await page.eval(`({ value: state.blurIntensity, label: document.getElementById('blurIntensityValue').textContent, hash: __fa.pixelSnapshot(state.canvas).hash })`);
      const export0 = await toolExport(page, CLICK_VISIBLE_DOWNLOAD);
      await page.eval("__fa.setRange('#blurIntensitySlider', 60)");
      await sleep(450);
      const preview60 = await page.eval(`({ value: state.blurIntensity, label: document.getElementById('blurIntensityValue').textContent, hash: __fa.pixelSnapshot(state.canvas).hash })`);
      const export60 = await toolExport(page, CLICK_VISIBLE_DOWNLOAD);
      ctx.measure('blur', { preview0, preview60 });
      ctx.check('blurIntensity state 更新为 0/60', preview0.value === 0 && preview60.value === 60, { actual: { v0: preview0.value, v60: preview60.value } });
      ctx.check('blurIntensity 改变预览像素', preview0.hash !== preview60.hash, { actual: { h0: preview0.hash, h60: preview60.hash } });
      ctx.check('blurIntensity 改变导出像素', export0.snapshot?.hash !== export60.snapshot?.hash, { actual: { h0: export0.snapshot?.hash, h60: export60.snapshot?.hash } });
      await ctx.screenshot('blurredframe-blur');
    },
  });

  await runCase(page, {
    id: 'BLR-06',
    group: 'blurredframe',
    page: '/tools/blurredframe/',
    name: '导出尺寸：1200 / custom 320（保持原图 4:3 比例）',
    async fn(ctx) {
      await page.eval("__fa.setSelect('#outputSize', '1200')");
      await sleep(150);
      const size1200 = await toolExport(page, CLICK_VISIBLE_DOWNLOAD);
      await page.eval("__fa.setSelect('#outputSize', 'custom')");
      await page.eval("__fa.setValue('#customSizeInput', 320)");
      await sleep(150);
      const custom = await toolExport(page, CLICK_VISIBLE_DOWNLOAD);
      ctx.measure('exports', { size1200: { w: size1200.w, h: size1200.h }, custom: { w: custom.w, h: custom.h } });
      ctx.check('1200 导出 1200×900（4:3）', size1200.w === 1200 && size1200.h === 900, { actual: { w: size1200.w, h: size1200.h } });
      ctx.check('custom 320 导出 320×240（4:3）', custom.w === 320 && custom.h === 240, { actual: { w: custom.w, h: custom.h } });
      await ctx.screenshot('blurredframe-export');
    },
  });

  await runCase(page, {
    id: 'BLR-07',
    group: 'blurredframe',
    page: '/tools/blurredframe/',
    name: '主图拖拽平移：预览内容变化',
    async fn(ctx) {
      await page.eval("__fa.setRange('#mainScaleSlider', 70)");
      await sleep(350);
      const before = await page.eval(`({ pan: { ...state.pan }, hash: __fa.pixelSnapshot(state.canvas).hash })`);
      await page.eval("__fa.dragCanvas('#previewCanvas', 300, 300, 360, 340)");
      await sleep(400);
      const after = await page.eval(`({ pan: { ...state.pan }, hash: __fa.pixelSnapshot(state.canvas).hash })`);
      ctx.measure('pan', { before, after });
      ctx.check('拖拽后 pan 变化', after.pan.x !== before.pan.x || after.pan.y !== before.pan.y, { actual: after.pan });
      ctx.check('拖拽后预览像素变化', before.hash !== after.hash, { actual: { before: before.hash, after: after.hash } });
    },
  });
}

// ---------------------------------------------------------------------------
// 覆盖范围 / 环境 / 人工项
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// /tools/aspectratiocalculator/ 测试（Phase AR，2026-11-06）
// ---------------------------------------------------------------------------
async function runAspectRatioGroup() {
  await gotoPage('/tools/aspectratiocalculator/', { waitForFa: false });
  await runCase(page, {
    id: 'AR-01',
    group: 'aspectratio',
    page: '/tools/aspectratiocalculator/',
    name: '页面加载：H1/title/canonical/5 语言 hreflang/JSON-LD',
    async fn(ctx) {
      const info = await page.eval(`(() => {
        const graph = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)['@graph'];
        return {
          h1: (document.querySelector('h1')?.textContent || '').trim(),
          title: document.title,
          canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || null,
          hreflangs: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => l.getAttribute('hreflang')).sort(),
          types: graph.map((node) => node['@type']),
          langOptions: document.querySelectorAll('a.lang-option').length,
          adsense: [...document.scripts].some((s) => /adsbygoogle|pagead2/.test(s.src)),
        };
      })()`);
      ctx.measure('pageInfo', info);
      ctx.check('无未捕获 JS 异常', pageLoads['/tools/aspectratiocalculator/']?.exceptions.length === 0, { actual: pageLoads['/tools/aspectratiocalculator/']?.exceptions });
      ctx.check('H1 = Aspect Ratio Calculator', info.h1 === 'Aspect Ratio Calculator', { actual: info.h1 });
      ctx.check('title 以 Aspect Ratio Calculator 开头且 ≤65 字符', info.title.startsWith('Aspect Ratio Calculator') && info.title.length <= 65, { actual: { title: info.title, length: info.title.length } });
      ctx.check('canonical 自引用', info.canonical === 'https://www.mecollage.top/tools/aspectratiocalculator/', { actual: info.canonical });
      const requiredHreflangs = ['en', 'zh-CN', 'zh-TW', 'ja', 'es', 'x-default'];
      ctx.check('hreflang = 5 语言 + x-default', info.hreflangs.length === 6 && requiredHreflangs.every((code) => info.hreflangs.includes(code)), { actual: info.hreflangs });
      ctx.check('JSON-LD = SoftwareApplication + FAQPage + BreadcrumbList', ['SoftwareApplication', 'FAQPage', 'BreadcrumbList'].every((type) => info.types.includes(type)), { actual: info.types });
      ctx.check('语言菜单 5 项（四语言已发布）', info.langOptions === 5, { actual: info.langOptions });
      ctx.check('无 AdSense 脚本（维护者决定先不放广告）', info.adsense === false, { actual: info.adsense });
    },
  });

  await runCase(page, {
    id: 'AR-02',
    group: 'aspectratio',
    page: '/tools/aspectratiocalculator/',
    name: 'Auto-detect：1920×1080 → 16:9；1200×628 → 最近 16:9（含偏差）',
    async fn(ctx) {
      const initial = await page.eval(`({
        size: document.querySelector('#arcSize').textContent.replace(/\\s+/g, ' ').trim(),
        meta: document.querySelector('#arcMeta').textContent.replace(/\\s+/g, ' ').trim(),
        presetsHidden: document.querySelector('#arcPresets').hidden,
      })`);
      ctx.measure('initial', initial);
      ctx.check('默认结果 = 1920 × 1080', initial.size.startsWith('1920 × 1080'), { actual: initial.size });
      ctx.check('默认比例 = 16:9', initial.meta.includes('16:9') && initial.meta.includes('exact match'), { actual: initial.meta });
      ctx.check('Auto-detect 下不显示 Common sizes', initial.presetsHidden === true, { actual: initial.presetsHidden });

      const near = await page.eval(`(() => {
        const w = document.querySelector('#arcWidth');
        const h = document.querySelector('#arcHeight');
        w.value = '1200'; w.dispatchEvent(new Event('input', { bubbles: true }));
        h.value = '628'; h.dispatchEvent(new Event('input', { bubbles: true }));
        return document.querySelector('#arcMeta').textContent.replace(/\\s+/g, ' ').trim();
      })()`);
      ctx.measure('nearMeta', near);
      ctx.check('1200×628 显示 1.91 且最近比例为 16:9', near.includes('1.91') && near.includes('16:9'), { actual: near });
      ctx.check('非精确比例显示偏差提示', near.includes('away'), { actual: near });
    },
  });

  await runCase(page, {
    id: 'AR-03',
    group: 'aspectratio',
    page: '/tools/aspectratiocalculator/',
    name: '锁定比例：4:5 / 9:16 双向换算 + 21:9 预设 2560×1080 + Copy toast',
    async fn(ctx) {
      await page.eval(`document.querySelector('.arc-ratio[data-ratio="4:5"]').click()`);
      const fourFive = await page.eval(`({ w: document.querySelector('#arcWidth').value, h: document.querySelector('#arcHeight').value, presetsHidden: document.querySelector('#arcPresets').hidden })`);
      ctx.check('4:5 预设 = 1080×1350', fourFive.w === '1080' && fourFive.h === '1350', { actual: fourFive });
      ctx.check('4:5 显示 Common sizes', fourFive.presetsHidden === false, { actual: fourFive.presetsHidden });

      const reverse = await page.eval(`(() => {
        const h = document.querySelector('#arcHeight');
        h.value = '1500'; h.dispatchEvent(new Event('input', { bubbles: true }));
        return { w: document.querySelector('#arcWidth').value, h: document.querySelector('#arcHeight').value };
      })()`);
      ctx.check('改高 1500 → 宽 1200（双向换算）', reverse.w === '1200' && reverse.h === '1500', { actual: reverse });

      const nineSixteen = await page.eval(`(() => {
        document.querySelector('.arc-ratio[data-ratio="9:16"]').click();
        return { w: document.querySelector('#arcWidth').value, h: document.querySelector('#arcHeight').value };
      })()`);
      ctx.check('9:16 预设 = 1080×1920', nineSixteen.w === '1080' && nineSixteen.h === '1920', { actual: nineSixteen });

      const ultrawide = await page.eval(`(() => {
        document.querySelector('.arc-ratio[data-ratio="21:9"]').click();
        return {
          w: document.querySelector('#arcWidth').value,
          h: document.querySelector('#arcHeight').value,
          note: document.querySelector('#arcPresetNote').textContent,
          hidden: document.querySelector('#arcPresetNote').hidden,
        };
      })()`);
      ctx.check('21:9 预设 = 2560×1080', ultrawide.w === '2560' && ultrawide.h === '1080', { actual: ultrawide });
      ctx.check('21:9 显示 64:27 / 2520×1080 脚注', ultrawide.hidden === false && ultrawide.note.includes('2520×1080') && ultrawide.note.includes('64:27'), { actual: ultrawide.note });

      await page.eval(`document.querySelector('#arcCopy').click()`);
      await sleep(250);
      const toastText = await page.eval("[...document.querySelectorAll('#mc-toast-stack .mc-toast__msg')].map((el) => el.textContent).join(' | ')");
      ctx.check('Copy size 触发 toast（含尺寸）', toastText.includes('2560 × 1080'), { actual: toastText });
    },
  });

  await runCase(page, {
    id: 'AR-04',
    group: 'aspectratio',
    page: '/tools/aspectratiocalculator/',
    name: '内容：对照表 5 比例 × 4 平台 / Official size / Native / 内链 / 正文词数',
    async fn(ctx) {
      const info = await page.eval(`(() => {
        const links = [...document.querySelectorAll('.arc-content a')].map((a) => new URL(a.href, location.origin).pathname);
        const table = {
          groups: document.querySelectorAll('.arc-table tbody').length,
          platformRows: document.querySelectorAll('.arc-table tbody tr:not(.arc-group-head)').length,
          officialHeader: [...document.querySelectorAll('.arc-table thead th')].map((th) => th.textContent.trim()),
          firstIg: document.querySelector('.arc-table tbody tr:not(.arc-group-head) td[data-label="Official size"]')?.textContent.trim() || null,
        };
        const words = (document.querySelector('.arc-content')?.innerText || '').match(/[A-Za-z0-9\u00C0-\u024F]+/g) || [];
        const faqWords = (document.querySelector('.faq-section')?.innerText || '').match(/[A-Za-z0-9\u00C0-\u024F]+/g) || [];
        return { links, table, contentWords: words.length, faqWords: faqWords.length };
      })()`);
      ctx.measure('contentInfo', info);
      ctx.check('对照表 5 个比例分组', info.table.groups === 5, { actual: info.table.groups });
      ctx.check('对照表 20 行平台数据（5×4）', info.table.platformRows === 20, { actual: info.table.platformRows });
      ctx.check('表头含 Official size + Native / Not native', info.table.officialHeader.includes('Official size') && info.table.officialHeader.includes('Native / Not native'), { actual: info.table.officialHeader });
      ctx.check('Instagram 4:5 官方尺寸 = 1080×1350', await page.eval(`[...document.querySelectorAll('.arc-table tbody tr')].find((tr) => tr.textContent.includes('1080 × 1350')) !== undefined`));
      ctx.check('正文链接 squarecrop / square-collage / roundedcorners', ['/tools/squarecrop/', '/square-collage/', '/tools/roundedcorners/'].every((path) => info.links.includes(path)), { actual: info.links });
      ctx.check('正文 + FAQ 词数 ≥ 1200', info.contentWords + info.faqWords >= 1200, { actual: info.contentWords + info.faqWords });
    },
  });

  const LOCALES = [
    { key: 'zh', path: '/zh/tools/aspectratiocalculator/', lang: 'zh-CN' },
    { key: 'tw', path: '/tw/tools/aspectratiocalculator/', lang: 'zh-TW' },
    { key: 'ja', path: '/ja/tools/aspectratiocalculator/', lang: 'ja' },
    { key: 'es', path: '/es/tools/aspectratiocalculator/', lang: 'es' },
  ];
  for (const locale of LOCALES) {
    await gotoPage(locale.path, { waitForFa: false });
    await runCase(page, {
      id: `AR-05-${locale.key}`,
      group: 'aspectratio',
      page: locale.path,
      name: `本地化页 ${locale.key}：html lang / 5 语言 hreflang+菜单 / canonical / 本地化计算`,
      async fn(ctx) {
        const info = await page.eval(`(() => {
          const graph = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)['@graph'];
          document.querySelector('.arc-ratio[data-ratio="4:5"]').click();
          return {
            htmlLang: document.documentElement.getAttribute('lang'),
            h1: (document.querySelector('h1')?.textContent || '').trim(),
            canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
            hreflangs: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => l.getAttribute('hreflang')).sort(),
            langOptions: document.querySelectorAll('a.lang-option').length,
            types: graph.map((n) => n['@type']),
            fourFive: { w: document.querySelector('#arcWidth').value, h: document.querySelector('#arcHeight').value },
            tableGroups: document.querySelectorAll('.arc-table tbody').length,
            faq: document.querySelectorAll('.faq-question').length,
          };
        })()`);
        ctx.measure('localizedInfo', info);
        ctx.check('无未捕获 JS 异常', (pageLoads[locale.path]?.exceptions || []).length === 0, { actual: pageLoads[locale.path]?.exceptions });
        ctx.check('html lang 正确', info.htmlLang === locale.lang, { actual: info.htmlLang });
        ctx.check('H1 已本地化（非英文）', Boolean(info.h1) && info.h1 !== 'Aspect Ratio Calculator', { actual: info.h1 });
        ctx.check('canonical 为本地化 URL', info.canonical === `https://www.mecollage.top${locale.path}`, { actual: info.canonical });
        ctx.check('hreflang 完整 5 语言 + x-default', ['en', 'zh-CN', 'zh-TW', 'ja', 'es', 'x-default'].every((code) => info.hreflangs.includes(code)) && info.hreflangs.length === 6, { actual: info.hreflangs });
        ctx.check('语言菜单 5 项', info.langOptions === 5, { actual: info.langOptions });
        ctx.check('JSON-LD 含 SoftwareApplication + FAQPage', ['SoftwareApplication', 'FAQPage'].every((type) => info.types.includes(type)), { actual: info.types });
        ctx.check('本地化 4:5 计算 = 1080×1350', info.fourFive.w === '1080' && info.fourFive.h === '1350', { actual: info.fourFive });
        ctx.check('表格 5 组 / FAQ 11 条', info.tableGroups === 5 && info.faq === 11, { actual: { tableGroups: info.tableGroups, faq: info.faq } });
      },
    });
  }
}

async function runCoverageGroup() {
  await runCase(page, {
    id: 'ENV-01',
    group: 'env',
    page: '（测试基础设施）',
    name: '测试环境信息记录',
    async fn(ctx) {
      const manifest = JSON.parse(readFileSync(join(FIXTURES_DIR, 'manifest.json'), 'utf8'));
      const gitHead = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
      const gitBranch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
      ctx.measure('chrome', chrome.browserVersion);
      ctx.measure('node', process.version);
      ctx.measure('platform', `${process.platform}/${process.arch}`);
      ctx.measure('server', server.url);
      ctx.measure('viewport', VIEWPORT);
      ctx.measure('fixtures', manifest.files.length);
      ctx.measure('git', { head: gitHead, branch: gitBranch });
      ctx.measure('blockedUrls', BLOCKED_URLS);
      ctx.check('Chrome headless 可用', /Chrome\/\d+/.test(chrome.browserVersion), { actual: chrome.browserVersion });
      ctx.check('测试图 fixtures 已生成（>= 6 类）', manifest.files.length >= 6, { actual: manifest.files.length });
      ctx.check('被测分支为 fix/functional-integrity（或当前记录分支）', Boolean(gitBranch), { actual: { branch: gitBranch, head: gitHead }, level: 'WARN' });
      ctx.measure('serverRequests', server.requests.length);
    },
  });

  await runCase(page, {
    id: 'ENV-02',
    group: 'coverage',
    page: '（范围说明）',
    name: '无法自动验证 / 需人工确认项',
    async fn(ctx) {
      const manualList = [
        ['AI 人脸居中的真实检测效果', '本次仅验证模型加载失败路径；未加载/调用 face-api 模型，成功路径需人工在真实网络环境验证'],
        ['AI 本地抠图的真实效果与输出质量', 'esm.sh 被拦截以验证失败路径，未真实下载/运行 @imgly/background-removal 模型'],
        ['真实文件下载与产物可打开性', '为避免产生下载文件，通过拦截 <a>.click() 记录导出 canvas 尺寸/像素；未验证操作系统级下载文件名/格式'],
        ['触屏/移动端手势', '仅测试鼠标/滚轮事件；touch 事件路径未覆盖'],
        ['HTML5 拖拽的真实指针体验', '排序使用合成 DragEvent + DataTransfer；与真实鼠标拖拽的浏览器行为可能有差异'],
        ['导出视觉观感（字体/抗锯齿/跨浏览器渲染）', 'html2canvas 在 headless Chrome 的渲染结果与真实用户浏览器可能存在差异'],
        ['HSTS/CSP 等安全头不属本测试范围', '由 Phase A 的 verify-site.mjs 覆盖；本测试只关注浏览器交互功能'],
      ];
      for (const [label, note] of manualList) ctx.manual(label, note);
      ctx.check('人工确认项已记录（7 项）', manualList.length === 7, { actual: manualList.length });
    },
  });
}

// ---------------------------------------------------------------------------
// 报告生成
// ---------------------------------------------------------------------------

function buildSummary() {
  const byGroup = {};
  for (const group of GROUP_ORDER) byGroup[group] = { PASS: 0, FAIL: 0, WARN: 0, total: 0 };
  const totals = { PASS: 0, FAIL: 0, WARN: 0, total: 0 };
  for (const result of results) {
    const bucket = byGroup[result.group] || (byGroup[result.group] = { PASS: 0, FAIL: 0, WARN: 0, total: 0 });
    bucket[result.status] += 1;
    bucket.total += 1;
    totals[result.status] += 1;
    totals.total += 1;
  }
  totals.verdict = totals.FAIL > 0 ? 'FAIL' : 'PASS';
  return { byGroup, totals };
}

function renderMarkdown(report) {
  const out = [];
  const summary = report.summary.totals;
  out.push('# Phase F-3：真实浏览器功能自动化测试报告');
  out.push('');
  out.push('> 由 `scripts/functional-audit/run-tests.mjs` 自动生成；零依赖 CDP harness（Chrome headless + WebSocket），**不使用 Playwright/Puppeteer**。');
  out.push('> 被测对象 = 当前分支工作区的站点文件，通过本地静态服务器（模拟 Vercel cleanUrls/trailingSlash/rewrite/404）加载；未修改任何站点文件。');
  out.push('');
  out.push('## 1. 环境与运行信息');
  out.push('');
  out.push('| 项目 | 值 |');
  out.push('|---|---|');
  out.push(`| 生成时间 | ${report.meta.generatedAt} |`);
  out.push(`| 分支 / HEAD | \`${report.meta.git.branch}\` / \`${report.meta.git.head}\` |`);
  out.push(`| Chrome | ${report.meta.chrome} |`);
  out.push(`| Node / 平台 | ${report.meta.node} / ${report.meta.platform} |`);
  out.push(`| 本地服务 | \`${report.meta.server}\`（模拟 Vercel 路由） |`);
  out.push(`| 视口 | ${report.meta.viewport.width}×${report.meta.viewport.height} |`);
  out.push(`| 测试图 | ${report.meta.fixtures} 张（Pillow 生成，见 \`fixtures/manifest.json\`） |`);
  out.push(`| 运行时长 | ${(report.meta.durationMs / 1000).toFixed(1)} s |`);
  out.push(`| 外部请求拦截 | ${report.meta.blockedUrls.map((url) => `\`${url}\``).join('、')} |`);
  out.push('');
  out.push('## 2. 结论摘要');
  out.push('');
  out.push(`**总体：${summary.verdict}** —— PASS ${summary.PASS} / FAIL ${summary.FAIL} / WARN ${summary.WARN}（共 ${summary.total} 个用例）`);
  out.push('');
  out.push('| 分组 | PASS | FAIL | WARN | 合计 |');
  out.push('|---|---|---|---|---|');
  for (const group of GROUP_ORDER) {
    const bucket = report.summary.byGroup[group];
    if (!bucket || bucket.total === 0) continue;
    out.push(`| ${GROUP_TITLES[group]} | ${bucket.PASS} | ${bucket.FAIL} | ${bucket.WARN} | ${bucket.total} |`);
  }
  out.push('');

  const fails = report.results.filter((result) => result.status === 'FAIL');
  out.push('## 3. 失败用例（FAIL 明细）');
  out.push('');
  if (fails.length === 0) {
    out.push('无自动断言失败。');
  } else {
    for (const failResult of fails) {
      out.push(`### ❌ \`${failResult.id}\` ${failResult.name}`);
      out.push('');
      out.push(`- 分组：${GROUP_TITLES[failResult.group] || failResult.group}`);
      out.push(`- 页面：\`${failResult.page}\``);
      const failedAssertions = failResult.assertions.filter((assertion) => assertion.status === 'FAIL');
      out.push('- 失败断言：');
      for (const assertion of failedAssertions) {
        out.push(`  - **${assertion.label}** — 实际：${formatActual(assertion.actual)}`);
      }
      if (failResult.screenshots.length > 0) {
        out.push('- 截图：');
        for (const shot of failResult.screenshots) out.push(`  - [\`${shot.path}\`](../${shot.path})`);
      }
      out.push('');
    }
  }

  const warns = report.results.filter((result) => result.status === 'WARN');
  out.push('## 4. 警告 / 需人工确认（WARN）');
  out.push('');
  if (warns.length === 0) {
    out.push('无。');
  } else {
    for (const warnResult of warns) {
      out.push(`### ⚠️ \`${warnResult.id}\` ${warnResult.name}`);
      const warned = warnResult.assertions.filter((assertion) => assertion.status === 'WARN');
      for (const assertion of warned) {
        out.push(`- ${assertion.label}${assertion.actual !== null && assertion.actual !== undefined ? ` — ${formatActual(assertion.actual)}` : ''}`);
      }
      out.push('');
    }
  }

  out.push('## 5. 全部用例结果');
  out.push('');
  out.push('| 用例 | 分组 | 结果 | 用时 | 通过/警告/失败断言 | 截图 |');
  out.push('|---|---|---|---|---|---|');
  for (const result of report.results) {
    const passCount = result.assertions.filter((assertion) => assertion.status === 'PASS').length;
    const failCount = result.assertions.filter((assertion) => assertion.status === 'FAIL').length;
    const warnCount = result.assertions.filter((assertion) => assertion.status === 'WARN').length;
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    out.push(
      `| \`${result.id}\` ${result.name} | ${result.group} | ${icon} ${result.status} | ${result.durationMs}ms | ${passCount}/${warnCount}/${failCount} | ${result.screenshots.map((shot) => `[\`${shot.path.split('/').pop()}\`](../${shot.path})`).join(' ') || '—'} |`,
    );
  }
  out.push('');

  out.push('## 6. 关键实测数据');
  out.push('');
  for (const result of report.results) {
    const keys = Object.keys(result.measurements || {});
    if (keys.length === 0) continue;
    out.push(`### \`${result.id}\` ${result.name}`);
    out.push('');
    out.push('```json');
    out.push(JSON.stringify(result.measurements, null, 2).slice(0, 4000));
    out.push('```');
    out.push('');
  }

  out.push('## 7. 复跑方式');
  out.push('');
  out.push('```bash');
  out.push('# 1) 生成测试图（Pillow；已生成则可跳过）');
  out.push('python3 scripts/functional-audit/make-fixtures.py');
  out.push('');
  out.push('# 2) 运行全部浏览器测试（自动启动/关闭 headless Chrome、清理临时 profile）');
  out.push('node scripts/functional-audit/run-tests.mjs');
  out.push('');
  out.push('# 3) 查看结果');
  out.push('open audit/evidence/phase-f/browser/report.md');
  out.push('```');
  out.push('');
  out.push('## 8. 已知限制与不确定项');
  out.push('');
  const limitations = report.limitations || [];
  if (limitations.length === 0) {
    out.push('无。');
  } else {
    const seen = new Set();
    for (const limitation of limitations) {
      const key = limitation.label;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(`- **${limitation.label}**：${limitation.note}`);
    }
  }
  out.push('');
  out.push('---');
  out.push('');
  out.push('判读约定：**FAIL = 自动断言证明功能不符合预期**；**WARN = 无法自动判定或按设计记录项（需人工/产品确认）**。失败用例均已自动截图（`shots/`）。');
  out.push('');
  return out.join('\n');
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

async function main() {
  const startedAt = performance.now();
  mkdirSync(AUDIT_DIR, { recursive: true });
  mkdirSync(SHOTS_DIR, { recursive: true });
  // 清理上一轮截图，避免旧图混淆（只清理证据目录内的 shots/）
  rmSync(SHOTS_DIR, { recursive: true, force: true });
  mkdirSync(SHOTS_DIR, { recursive: true });

  if (!existsSync(join(ROOT, 'index.html'))) {
    throw new Error(`当前目录不像 MeCollage 仓库根目录（缺少 index.html）：${ROOT}`);
  }

  // 1) 生成 fixtures（Pillow）
  if (!existsSync(join(FIXTURES_DIR, 'manifest.json'))) {
    console.log('[setup] 生成测试图（Pillow）…');
    execFileSync('python3', [FIXTURE_SCRIPT, FIXTURES_DIR], { cwd: ROOT, stdio: 'inherit' });
  } else {
    console.log('[setup] 复用已存在的 fixtures（manifest.json）');
  }

  // 2) 本地静态服务器
  server = await startStaticServer({ root: ROOT });
  console.log(`[setup] 本地服务：${server.url}`);

  // 3) Chrome + CDP
  chrome = await launchChrome({ width: VIEWPORT.width, height: VIEWPORT.height });
  page = await ChromePage.connect(chrome.pageWsUrl);
  await page.enableDomains({ blockedUrls: BLOCKED_URLS, width: VIEWPORT.width, height: VIEWPORT.height });
  await page.addInitScript(INSTRUMENT_SOURCE);
  console.log(`[setup] Chrome：${chrome.browserVersion}`);

  // 4) 运行测试矩阵
  await runIndexGroup();
  await runBlogGroup();
  await runContactGroup();
  await runSquareGroup();
  await runSquarecropGroup();
  await runRoundedCornersGroup();
  await runBlurredFrameGroup();
  await runAspectRatioGroup();
  await runCoverageGroup();

  // 5) 汇总与报告
  const summary = buildSummary();
  const meta = {
    generatedAt: new Date().toISOString(),
    durationMs: Math.round(performance.now() - startedAt),
    git: {
      branch: execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
      head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
    },
    chrome: chrome.browserVersion,
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    server: server.url,
    viewport: VIEWPORT,
    fixtures: JSON.parse(readFileSync(join(FIXTURES_DIR, 'manifest.json'), 'utf8')).files.length,
    blockedUrls: BLOCKED_URLS,
    pageLoads,
    serverRequests: server.requests.length,
  };
  const report = {
    tool: 'functional-audit',
    version: '1.0.0',
    meta,
    summary,
    limitations,
    results,
  };
  writeFileSync(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(REPORT_MD, renderMarkdown(report), 'utf8');

  // 6) 控制台摘要
  console.log('');
  console.log('='.repeat(72));
  console.log(`Phase F-3 浏览器功能测试完成：PASS ${summary.totals.PASS} / FAIL ${summary.totals.FAIL} / WARN ${summary.totals.WARN}（共 ${summary.totals.total}）`);
  if (summary.totals.FAIL > 0) {
    console.log('FAIL 用例：');
    for (const result of results.filter((item) => item.status === 'FAIL')) {
      console.log(`  ❌ ${result.id} ${result.name}`);
    }
  }
  console.log(`报告：${relativePath(REPORT_MD)}`);
  console.log(`JSON：${relativePath(REPORT_JSON)}`);
  console.log(`截图：${relativePath(SHOTS_DIR)}/（${shotIndex} 张）`);
  console.log('='.repeat(72));

  // 7) 退出码：有 FAIL → 1（便于 CI/复跑判读）；仅 WARN → 0
  process.exitCode = summary.totals.FAIL > 0 ? 1 : 0;
}

let exitCode = 0;
try {
  await main();
  exitCode = process.exitCode ?? 0;
} catch (error) {
  console.error('[functional-audit] 运行失败：', error);
  exitCode = 2;
} finally {
  try {
    page?.close();
  } catch {
    /* ignore */
  }
  if (chrome && !KEEP_OPEN) {
    await chrome.close();
  }
  if (server) {
    await server.close();
  }
  process.exit(exitCode);
}
