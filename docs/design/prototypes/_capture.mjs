#!/usr/bin/env node
/**
 * 原型截图工具（仅 docs/design/prototypes/ 使用，零依赖）。
 *
 * 输出两套截图到 screenshots/：
 *   review/  评审版：顶部注释条 + 红色标注 + 首屏折叠线（便于逐条对照审计）
 *   clean/   干净版：隐藏 .proto-note/.pmark/.foldline（给用户看设计本体）
 * 每套各 2 张：
 *   <name>-<width>x<height>.png  目标视口（390×844 / 1440×900）——完整体验的首屏
 *   <name>-<kind>-full.png       整页（390 / 1440 宽）
 *
 * 实现说明：
 *  - 在仓库根目录起只读静态服务器（仅 127.0.0.1，不联网）；
 *  - 复用 scripts/functional-audit/cdp.mjs 启动 headless Chrome（只 import，不改）；
 *  - 固定壁纸（position:fixed）只在首个视口内被 Chrome 正确绘制；整页截图的
 *    首屏区域与「视口截图」是真实一致的，这一点与 audit/design-migration/
 *    after-final/ 里的历史证据相同。
 *
 * 用法（仓库根目录）：node docs/design/prototypes/_capture.mjs [页面名过滤...]
 */
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome, ChromePage } from '../../../scripts/functional-audit/cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
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

const JOBS = [
  { file: 'mobile-home.html', name: 'mobile-home', width: 390, viewport: 844, kind: 'mobile' },
  { file: 'mobile-tool.html', name: 'mobile-tool', width: 390, viewport: 844, kind: 'mobile' },
  { file: 'editor-interactions.html', name: 'editor-interactions', width: 1440, viewport: 900, kind: 'desktop' },
  { file: 'desktop-tool-first.html', name: 'desktop-tool-first', width: 1440, viewport: 900, kind: 'desktop' },
  { file: 'index.html', name: 'index', width: 1440, viewport: 900, kind: 'desktop', fullOnly: true },
];

const ONLY = process.argv.slice(2);
const HIDE_CHROME_CSS = `
  .proto-note, .pmark, .foldline, .state-tag, .proto-only { display: none !important; }
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await mkdir(OUT_REVIEW, { recursive: true });
  await mkdir(OUT_CLEAN, { recursive: true });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  console.log(`[capture] static server http://127.0.0.1:${port} (root=${ROOT})`);

  const chrome = await launchChrome({ width: 1440, height: 1000 });
  const page = await ChromePage.connect(chrome.pageWsUrl);
  const rows = [];
  try {
    for (const job of JOBS) {
      if (ONLY.length > 0 && !ONLY.some((x) => job.file.includes(x))) continue;
      const url = `http://127.0.0.1:${port}/docs/design/prototypes/${job.file}`;

      // ---------- 评审版：保留注释条 + 红色标注 ----------
      await page.enableDomains({ width: job.width, height: job.viewport });
      await page.navigate(url);
      await page.waitFor("document.readyState === 'complete'");
      await sleep(350);
      const review = await page.eval(`(() => {
        const d = document.documentElement;
        const note = document.querySelector('.proto-note');
        return {
          innerWidth: window.innerWidth,
          scrollWidth: d.scrollWidth,
          scrollHeight: d.scrollHeight,
          noteBottom: note ? Math.round(note.getBoundingClientRect().bottom + window.scrollY) : 0,
        };
      })()`);

      // 布局探针：给红色标注定位用（.screen 内的 top 坐标）
      const layout = await page.eval(`(() => {
        const screen = document.querySelector('.screen, .app, .page');
        if (!screen) return null;
        const base = screen.getBoundingClientRect().top + window.scrollY;
        const note = document.querySelector('.proto-note');
        const noteBottom = note ? Math.round(note.getBoundingClientRect().bottom + window.scrollY) : 0;
        const pick = ['.appbar', '.topbar', '.seg', '.hero', '.upload-card', '.steps', '.trustrow', '.section', '.tool-head', '.workspace', '.state', '.settings', '.download-card', '.faq', '.section:nth-of-type(2)', '.foldline', 'header', 'main', 'footer'];
        const out = {};
        for (const sel of pick) {
          const el = document.querySelector(sel);
          if (!el) continue;
          const r = el.getBoundingClientRect();
          out[sel] = { top: Math.round(r.top + window.scrollY - base), h: Math.round(r.height) };
        }
        return { screenTop: Math.round(base), noteBottom, out };
      })()`);
      if (layout) {
        const parts = Object.entries(layout.out).map(([k, v]) => `${k}@${v.top}+${v.h}`);
        console.log(`[layout] ${job.file}: ${parts.join('  ')}`);
      }

      const reviewFull = join(OUT_REVIEW, `${job.name}-${job.kind}-full.png`);
      await captureFull(page, job.width, review.scrollHeight, reviewFull);

      let reviewVp = '';
      if (!job.fullOnly) {
        reviewVp = join(OUT_REVIEW, `${job.name}-${job.width}x${job.viewport}.png`);
        // 视口截图从注释条下沿开始：固定壁纸与吸顶元素才是真实设备状态
        await page.eval(`window.scrollTo(0, ${review.noteBottom})`);
        await sleep(250);
        await captureViewport(page, reviewVp);
      }

      // ---------- 干净版：隐藏评审 chrome ----------
      await page.eval(`(() => {
        const style = document.createElement('style');
        style.id = '__clean_review__';
        style.textContent = ${JSON.stringify(HIDE_CHROME_CSS)};
        document.head.appendChild(style);
        window.scrollTo(0, 0);
      })()`);
      await sleep(300);
      const clean = await page.eval(`(() => {
        const d = document.documentElement;
        return { scrollWidth: d.scrollWidth, scrollHeight: d.scrollHeight };
      })()`);

      const cleanFull = join(OUT_CLEAN, `${job.name}-${job.kind}-full.png`);
      await captureFull(page, job.width, clean.scrollHeight, cleanFull);

      let cleanVp = '';
      if (!job.fullOnly) {
        cleanVp = join(OUT_CLEAN, `${job.name}-${job.width}x${job.viewport}.png`);
        await page.eval('window.scrollTo(0, 0)');
        await sleep(200);
        await captureViewport(page, cleanVp);
      }

      const overflow = Math.max(review.scrollWidth, clean.scrollWidth) - review.innerWidth;
      rows.push({ ...job, overflow, reviewHeight: review.scrollHeight, cleanHeight: clean.scrollHeight });
      console.log(
        `[capture] ${job.file} → review/{${basename(reviewFull)},${reviewVp ? basename(reviewVp) : '-'}} ` +
          `+ clean/{${basename(cleanFull)},${cleanVp ? basename(cleanVp) : '-'}} ` +
          `(${job.width}×${clean.scrollHeight} app; overflow=${overflow}px)`,
      );
    }
  } finally {
    await chrome.close();
    server.close();
  }

  const bad = rows.filter((r) => r.overflow > 0);
  if (bad.length) {
    console.warn('[capture] 横向溢出（需修复）:');
    for (const r of bad) console.warn(`  - ${r.file}: +${r.overflow}px`);
    process.exitCode = 1;
  } else {
    console.log('[capture] 横向溢出检查：0（所有原型 scrollWidth === innerWidth）');
  }
}

function basename(p) {
  return p ? p.split('/').pop() : '-';
}

async function captureFull(page, width, height, outPath) {
  const { data } = await page.send(
    'Page.captureScreenshot',
    { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: Math.max(1, Math.ceil(height)), scale: 1 } },
    { timeoutMs: 120000 },
  );
  await writeFile(outPath, Buffer.from(data, 'base64'));
}

async function captureViewport(page, outPath) {
  const { data } = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, { timeoutMs: 90000 });
  await writeFile(outPath, Buffer.from(data, 'base64'));
}

main().catch((error) => {
  console.error('[capture] 失败:', error);
  server.close();
  process.exitCode = 1;
});
