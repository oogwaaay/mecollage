/**
 * 本地静态服务器：尽量模拟 Vercel 静态托管的 URL 行为，供 CDP 功能测试使用。
 * 只读仓库文件，不写任何站点内容。
 *
 * 模拟行为（对应仓库 vercel.json）：
 *   - cleanUrls: true         （/about.html → 308 /about/；/about → 308 /about/）
 *   - trailingSlash: true     （目录路由统一尾斜杠）
 *   - rewrites: /tools/(.*) → /public/tools/$1
 *   - redirects: /public/tools/(.*) → 308 /tools/$1
 *   - 缺失路径 → 404.html + HTTP 404
 *   - 附加 COOP/COEP（避免 coi-serviceworker 的 reload 干扰）
 *
 * 用法（在 run-tests.mjs 中 import）：
 *   const server = await startStaticServer({ root: repoRoot });
 *   console.log(server.url);
 *   await server.close();
 */

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.webmanifest': 'application/manifest+json',
};

const BASE_HEADERS = {
  // 需要 COOP/COEP 才能让 crossOriginIsolated=true，避免 coi-serviceworker 注入后 reload 两次
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-embedder-policy': 'require-corp',
  'cache-control': 'no-store',
  'access-control-allow-origin': '*',
  'x-content-type-options': 'nosniff',
};

/** 解析 URL 路径，返回 {type:'file', file} | {type:'redirect', status, location} | {type:'404'} */
async function resolveRequest(root, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return { type: '404' };
  }

  // 规范化，阻止路径穿越
  const safePath = normalize(decoded).replace(/^([/\\])+/, '');
  if (safePath.includes('..')) return { type: '404' };

  const hasTrailingSlash = decoded.endsWith('/');
  const isRoot = decoded === '/';

  // Vercel redirects: /public/tools/(.*) → /tools/$1（308）
  if (decoded.startsWith('/public/tools/')) {
    return { type: 'redirect', status: 308, location: `/tools/${decoded.slice('/public/tools/'.length)}` };
  }

  // Vercel rewrite: /tools/(.*) → /public/tools/$1（对外 URL 不变）
  let fsPath = safePath;
  if (decoded.startsWith('/tools/')) {
    fsPath = `public/tools/${decoded.slice('/tools/'.length)}`.replace(/\/+$/, '');
    if (decoded.endsWith('/')) fsPath += '/';
  }

  const abs = resolve(root, fsPath);

  // 精确文件命中（静态资源、数据文件等）
  try {
    const info = await stat(abs);
    if (info.isFile()) {
      const ext = extname(abs).toLowerCase();
      if (ext === '.html') {
        // cleanUrls: 显式 .html 访问 → 308 到 clean URL
        const noExt = decoded.replace(/\.html$/i, '');
        const base = noExt.endsWith('/index') ? noExt.slice(0, -'index'.length) : noExt;
        const clean = base === '' ? '/' : `${base.replace(/\/+$/, '')}/`;
        return { type: 'redirect', status: 308, location: clean };
      }
      return { type: 'file', file: abs };
    }
    if (info.isDirectory()) {
      const indexPath = join(abs, 'index.html');
      const indexInfo = await stat(indexPath).catch(() => null);
      if (indexInfo?.isFile()) {
        const clean = decoded.endsWith('/') ? decoded : `${decoded}/`;
        if (hasTrailingSlash || isRoot) return { type: 'file', file: indexPath };
        return { type: 'redirect', status: 308, location: clean };
      }
    }
  } catch {
    /* 继续尝试回退规则 */
  }

  // 尾斜杠 cleanUrls：/about/ → about.html（Vercel cleanUrls + trailingSlash 行为）
  if (hasTrailingSlash && !isRoot) {
    const cleanCandidate = join(root, `${safePath.replace(/\/+$/, '')}.html`);
    try {
      const info = await stat(cleanCandidate);
      if (info.isFile()) return { type: 'file', file: cleanCandidate };
    } catch {
      /* continue */
    }
  }

  // 无尾斜杠：目录 / <path>.html → 308 加尾斜杠（trailingSlash: true）
  if (!hasTrailingSlash && !isRoot) {
    const candidates = [abs, `${abs}.html`];
    for (const candidate of candidates) {
      try {
        const info = await stat(candidate);
        if (info.isDirectory()) {
          const indexInfo = await stat(join(candidate, 'index.html')).catch(() => null);
          if (indexInfo?.isFile()) return { type: 'redirect', status: 308, location: `${decoded}/` };
        } else if (info.isFile() && extname(candidate).toLowerCase() === '.html') {
          return { type: 'redirect', status: 308, location: `${decoded}/` };
        }
      } catch {
        /* ignore */
      }
    }
  }

  return { type: '404' };
}

/**
 * @param {{root: string, port?: number, host?: string, verbose?: boolean}} options
 * @returns {Promise<{url:string, port:number, requests:Array, close:()=>Promise<void>}>}
 */
export async function startStaticServer({ root, port = 0, host = '127.0.0.1', verbose = false }) {
  const rootAbs = resolve(root);
  const requests = [];

  const server = createServer(async (req, res) => {
    const startedAt = Date.now();
    const url = new URL(req.url, `http://${host}`);
    const entry = { method: req.method, path: url.pathname, status: null };
    requests.push(entry);

    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        entry.status = 405;
        res.writeHead(405, BASE_HEADERS);
        res.end('Method Not Allowed');
        return;
      }

      const resolved = await resolveRequest(rootAbs, url.pathname);

      if (resolved.type === 'redirect') {
        entry.status = resolved.status;
        res.writeHead(resolved.status, { ...BASE_HEADERS, location: resolved.location });
        res.end();
        return;
      }

      let file = null;
      if (resolved.type === 'file') {
        file = resolved.file;
        // 防止逃逸 root
        if (!file.startsWith(rootAbs + sep) && file !== rootAbs) file = null;
      }

      if (!file) {
        const notFoundPage = join(rootAbs, '404.html');
        entry.status = 404;
        const notFoundInfo = await stat(notFoundPage).then((info) => (info.isFile() ? info : null)).catch(() => null);
        res.writeHead(404, {
          ...BASE_HEADERS,
          'content-type': 'text/html; charset=utf-8',
          ...(notFoundInfo ? { 'content-length': notFoundInfo.size } : {}),
        });
        if (req.method === 'HEAD') res.end();
        else if (notFoundInfo) createReadStream(notFoundPage).on('error', () => { try { res.destroy(); } catch {} }).pipe(res);
        else res.end('404 Not Found');
        return;
      }

      const info = await stat(file);
      entry.status = 200;
      res.writeHead(200, {
        ...BASE_HEADERS,
        'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
        'content-length': info.size,
      });
      if (req.method === 'HEAD') {
        res.end();
      } else {
        createReadStream(file).on('error', () => { try { res.destroy(); } catch {} }).pipe(res);
      }
    } catch (error) {
      entry.status = 500;
      if (!res.headersSent) {
        res.writeHead(500, BASE_HEADERS);
        res.end(`Internal error: ${error.message}`);
      } else {
        try { res.end(); } catch {}
      }
    } finally {
      entry.durationMs = Date.now() - startedAt;
      if (verbose) console.log(`[server] ${entry.method} ${entry.path} → ${entry.status} (${entry.durationMs}ms)`);
    }
  });

  await new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolvePromise());
  });

  const actualPort = server.address().port;
  return {
    url: `http://${host}:${actualPort}`,
    port: actualPort,
    requests,
    close: () =>
      new Promise((resolvePromise) => {
        server.close(() => resolvePromise());
      }),
  };
}
