#!/usr/bin/env node
/**
 * R2 原型截图工具（仅 docs/design/prototypes/r2/ 使用，零依赖）。
 *
 * 输出到 r2/screenshots/：
 *   review/  评审版：保留 .proto-note/.pmark/.foldline，首屏从注释条下沿开始
 *   clean/   干净版：注入 display:none 隐藏评审 chrome，给用户看设计本体
 *   每套：<name>-1440x900.png + <name>-390x844.png（目标视口真实首屏，用滚动后视口截取）
 *   另存 clean 整页：<name>-desktop-full.png / <name>-mobile-full.png（看下半部分状态规格）
 *   另存状态变体：single-layer-nav 的 tools 关闭 / 移动菜单打开
 *
 * 实现：
 *  - 在仓库根目录起只读静态服务器（127.0.0.1，不联网）；
 *  - 复用 scripts/functional-audit/cdp.mjs（只 import，不改）；
 *  - 断言每个页面在两个视口下 scrollWidth === innerWidth（0 横向溢出）。
 *
 * 用法（仓库根目录）：node docs/design/prototypes/r2/_capture.mjs [页面名过滤...]
 */
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { rmSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome, ChromePage } from '../../../../scripts/functional-audit/cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../../..');
const OUT = join(HERE, 'screenshots');
const OUT_REVIEW = join(OUT, 'review');
const OUT_CLEAN = join(OUT, 'clean');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8',
};

const JOBS = [
  { file: 'single-layer-nav.html', name: 'single-layer-nav' },
  { file: 'contact-form.html', name: 'contact-form' },
  { file: 'blog-search.html', name: 'blog-search' },
  { file: 'index.html', name: 'index' },
];

const VIEWPORTS = [
  { width: 1440, height: 900, kind: 'desktop' },
  { width: 390, height: 844, kind: 'mobile' },
];

// 干净版状态变体（用于展示导航开合；全部在隐藏评审 chrome 后截取）
// review 首屏的状态准备（桌面展示 Tools 下拉打开；移动默认关闭）
const REVIEW_SETUP = {
  'single-layer-nav.html': { 1440: "document.querySelector('.nav-tools-btn')?.click()" },
};

// clean 额外状态变体（导航开合）
const EXTRAS = [
  { file: 'single-layer-nav.html', name: 'single-layer-nav', width: 1440, height: 900, suffix: 'open', script: "document.querySelector('.nav-tools-btn')?.click()" },
  { file: 'single-layer-nav.html', name: 'single-layer-nav', width: 390, height: 844, suffix: 'open', script: "document.querySelector('.menu-btn')?.click()" },
  // 博客搜索：真实输入触发的“有结果 / 无结果”状态（clean 首屏）
  { file: 'blog-search.html', name: 'blog-search', width: 1440, height: 900, suffix: 'results', script: "(() => { const i = document.getElementById('blogSearchInput'); i.value = 'mobile'; i.dispatchEvent(new Event('input', { bubbles: true })); })()" },
  { file: 'blog-search.html', name: 'blog-search', width: 1440, height: 900, suffix: 'empty', script: "(() => { const i = document.getElementById('blogSearchInput'); i.value = 'zzz'; i.dispatchEvent(new Event('input', { bubbles: true })); })()" },
  { file: 'blog-search.html', name: 'blog-search', width: 390, height: 844, suffix: 'results', script: "(() => { const i = document.getElementById('blogSearchInput'); i.value = 'mobile'; i.dispatchEvent(new Event('input', { bubbles: true })); })()" },
  { file: 'blog-search.html', name: 'blog-search', width: 390, height: 844, suffix: 'empty', script: "(() => { const i = document.getElementById('blogSearchInput'); i.value = 'zzz'; i.dispatchEvent(new Event('input', { bubbles: true })); })()" },
  // Contact 表单：校验错误 / 成功态（clean 首屏）
  { file: 'contact-form.html', name: 'contact-form', width: 1440, height: 900, suffix: 'error', script: "document.querySelector('#contactForm button[type=submit]').click()" },
  { file: 'contact-form.html', name: 'contact-form', width: 1440, height: 900, suffix: 'success', script: "(() => { document.getElementById('name').value = 'Ada'; document.getElementById('email').value = 'ada@example.com'; document.getElementById('message').value = 'The rounded corners tool exports a blank image on Safari 17.'; document.querySelector('#contactForm button[type=submit]').click(); })()" },
  { file: 'contact-form.html', name: 'contact-form', width: 390, height: 844, suffix: 'success', script: "(() => { document.getElementById('name').value = 'Ada'; document.getElementById('email').value = 'ada@example.com'; document.getElementById('message').value = 'The rounded corners tool exports a blank image on Safari 17.'; document.querySelector('#contactForm button[type=submit]').click(); })()" },
];

const ONLY = process.argv.slice(2);

// index（总览）的 review 首屏保留顶部注释条（没有红色标注，注释条本身就是评审说明）
const REVIEW_FROM_TOP = new Set(['index.html']);
const CLEAN_CSS = `
  .proto-note, .pmark, .foldline, .proto-only { display: none !important; }
`;

const server = createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const file = resolve(ROOT, `.${urlPath}`);
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, {
      'content-type': MIME[extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(data);
  } catch {
    res.writeHead(404).end('not found');
  }
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // 每次重截前清空输出，避免旧状态变体残留（如改名前的 -closed.png）
  rmSync(OUT_REVIEW, { recursive: true, force: true });
  rmSync(OUT_CLEAN, { recursive: true, force: true });
  await mkdir(OUT_REVIEW, { recursive: true });
  await mkdir(OUT_CLEAN, { recursive: true });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  console.log(`[capture] static server http://127.0.0.1:${port} (root=${ROOT})`);

  const chrome = await launchChrome({ width: 1440, height: 1000 });
  const page = await ChromePage.connect(chrome.pageWsUrl);
  const rows = [];
  const fail = [];
  try {
    for (const job of JOBS) {
      if (ONLY.length > 0 && !ONLY.some((x) => job.file.includes(x))) continue;
      const url = `http://127.0.0.1:${port}/docs/design/prototypes/r2/${job.file}`;

      for (const vp of VIEWPORTS) {
        await page.enableDomains({ width: vp.width, height: vp.height });
        await page.navigate(url);
        await page.waitFor("document.readyState === 'complete'");
        await sleep(400);

        const m = await page.eval(`(() => {
          const d = document.documentElement;
          const note = document.querySelector('.proto-note');
          return {
            noteBottom: note ? Math.round(note.getBoundingClientRect().bottom + window.scrollY) : 0,
            scrollWidth: d.scrollWidth,
            scrollHeight: d.scrollHeight,
          };
        })()`);

        // ---------- review：真实视口首屏（可先切到要评审的状态） ----------
        const setup = REVIEW_SETUP[job.file]?.[vp.width];
        if (setup) { await page.eval(setup); await sleep(250); }
        await page.eval(`window.scrollTo(0, ${REVIEW_FROM_TOP.has(job.file) ? 0 : m.noteBottom})`);
        await sleep(250);
        await shot(page, vp, join(OUT_REVIEW, `${job.name}-${vp.width}x${vp.height}.png`));

        // ---------- clean：重新导航重置状态 → 隐藏评审 chrome → 首屏 + 整页 ----------
        await page.navigate(url);
        await page.waitFor("document.readyState === 'complete'");
        await sleep(300);
        await page.eval(`(() => {
          const style = document.createElement('style');
          style.textContent = ${JSON.stringify(CLEAN_CSS)};
          document.head.appendChild(style);
          window.scrollTo(0, 0);
        })()`);
        await sleep(300);
        const clean = await page.eval('({ scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight })');
        await shot(page, vp, join(OUT_CLEAN, `${job.name}-${vp.width}x${vp.height}.png`));
        await fullShot(page, vp.width, clean.scrollHeight, join(OUT_CLEAN, `${job.name}-${vp.kind}-full.png`));

        const overflow = Math.max(m.scrollWidth, clean.scrollWidth) - vp.width;
        rows.push({ file: job.file, viewport: `${vp.width}x${vp.height}`, overflow, appHeight: clean.scrollHeight });
        if (overflow > 0) {
          fail.push(`${job.file} @${vp.width}: +${overflow}px`);
          const offenders = await page.eval(`(() => {
            const vw = window.innerWidth; const out = [];
            document.querySelectorAll('body *').forEach((el) => {
              const r = el.getBoundingClientRect();
              if (r.width > 0 && r.right > vw + 1) {
                const cls = typeof el.className === 'string' ? el.className : (el.className.baseVal || '');
                out.push({ tag: el.tagName, cls: cls.slice(0, 60), right: Math.round(r.right), width: Math.round(r.width) });
              }
            });
            return out.slice(0, 12);
          })()`);
          console.log(`[capture]   offenders @${vp.width}:`, JSON.stringify(offenders, null, 1));
        }

        // ---------- 状态变体（仅 clean） ----------
        for (const ex of EXTRAS.filter((x) => x.file === job.file && x.width === vp.width)) {
          await page.eval(ex.script);
          await sleep(250);
          await shot(page, { width: ex.width, height: ex.height }, join(OUT_CLEAN, `${job.name}-${ex.width}x${ex.height}-${ex.suffix}.png`));
        }

        console.log(`[capture] ${job.file} @${vp.width}×${vp.height} → review+clean 首屏、clean 整页（app ${clean.scrollHeight}px，overflow=${overflow}px）`);
      }
    }
  } finally {
    await chrome.close();
    server.close();
  }

  console.log(fail.length ? `[capture] 横向溢出 FAIL：\n  - ${fail.join('\n  - ')}` : '[capture] 横向溢出检查：0（所有页面 1440/390 均 scrollWidth === innerWidth）');
  if (fail.length) process.exitCode = 1;
}

async function shot(page, vp, outPath) {
  const { data } = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, { timeoutMs: 90000 });
  await writeFile(outPath, Buffer.from(data, 'base64'));
}

async function fullShot(page, width, height, outPath) {
  const { data } = await page.send(
    'Page.captureScreenshot',
    { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: Math.ceil(height), scale: 1 } },
    { timeoutMs: 120000 },
  );
  await writeFile(outPath, Buffer.from(data, 'base64'));
}

main().catch((err) => {
  console.error('[capture] 失败:', err);
  server.close();
  process.exitCode = 1;
});
