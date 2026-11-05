/**
 * 零依赖 CDP harness（Chrome DevTools Protocol over WebSocket）。
 *
 * 设计目标：
 *   - 启动独立 profile 的 headless Chrome（--headless=new）；
 *   - 通过原生 WebSocket（Node 24 内置）连接页面 target；
 *   - 提供 navigate / Runtime.evaluate / DOM.setFileInputFiles / 截图 /
 *     console & exception & dialog 收集 / 真实鼠标键盘事件；
 *   - 测试结束关闭 Chrome 并删除临时 profile。
 *
 * 不依赖 Playwright / Puppeteer / npm 包。
 *
 * 用法：
 *   const chrome = await launchChrome({ width: 1440, height: 1000 });
 *   const page = await ChromePage.connect(chrome.pageWsUrl, { timeoutMs: 20000 });
 *   await page.enableDomains({ blockedUrls: ['*://cdn.jsdelivr.net/*'] });
 *   await page.navigate('http://127.0.0.1:PORT/');
 *   const title = await page.eval('document.title');
 *   await page.setFiles('#fileInput', ['/abs/path/img.png']);
 *   await page.screenshot({ path: 'shots/x.png' });
 *   await chrome.close();
 */

import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const DEFAULT_CHROME_PATH =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function summarizeConsoleArgs(args) {
  return args
    .map((arg) => {
      if (arg.type === 'string') return arg.value;
      if ('value' in arg) return String(arg.value);
      if (arg.description) return arg.description;
      if (arg.preview?.properties) return `{${arg.preview.properties.map((p) => `${p.name}:${p.value}`).join(',')}}`;
      return arg.type;
    })
    .join(' ');
}

/** 页面级 CDP 会话 */
export class ChromePage {
  /**
   * @param {string} wsUrl
   * @param {{timeoutMs?: number}} options
   */
  static async connect(wsUrl, { timeoutMs = 20000 } = {}) {
    const page = new ChromePage();
    await page.#open(wsUrl, timeoutMs);
    return page;
  }

  constructor() {
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();
    this.eventHandlers = new Map();
    this.console = [];
    this.exceptions = [];
    this.dialogs = [];
    this.failedRequests = [];
    this.requestUrls = new Map();
    this.pageErrors = [];
    this.closed = false;
  }

  #open(wsUrl, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`连接 CDP WebSocket 超时：${wsUrl}`));
      }, timeoutMs);

      this.ws = new WebSocket(wsUrl);
      this.ws.addEventListener('open', () => {
        clearTimeout(timer);
        resolve();
      });
      this.ws.addEventListener('error', (event) => {
        clearTimeout(timer);
        reject(new Error(`CDP WebSocket 错误：${event?.message || 'unknown'}`));
      });
      this.ws.addEventListener('close', () => {
        this.closed = true;
        for (const { reject: rejectPending } of this.pending.values()) {
          rejectPending(new Error('CDP WebSocket 已关闭'));
        }
        this.pending.clear();
      });
      this.ws.addEventListener('message', (event) => this.#onMessage(event));
    });
  }

  #onMessage(event) {
    let message;
    try {
      message = JSON.parse(typeof event.data === 'string' ? event.data : event.data.toString());
    } catch {
      return;
    }

    if (message.id) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message} (code=${message.error.code})`));
      else pending.resolve(message.result);
      return;
    }

    this.#handleEvent(message.method, message.params);
  }

  #handleEvent(method, params) {
    switch (method) {
      case 'Runtime.consoleAPICalled': {
        this.console.push({
          type: params.type,
          text: summarizeConsoleArgs(params.args || []),
          url: params.stackTrace?.callFrames?.[0]?.url || null,
          line: params.stackTrace?.callFrames?.[0]?.lineNumber ?? null,
        });
        break;
      }
      case 'Runtime.exceptionThrown': {
        const details = params.exceptionDetails || {};
        this.exceptions.push({
          text: details.exception?.description || details.text || 'unknown exception',
          url: details.url || null,
          line: details.lineNumber ?? null,
        });
        break;
      }
      case 'Log.entryAdded': {
        const entry = params.entry || {};
        // Log 域记录浏览器级错误（含被拦截/失败的资源加载）；不混入 JS 异常，单独保存
        this.pageErrors.push({ level: entry.level, text: entry.text, url: entry.url || null, source: entry.source });
        break;
      }
      case 'Page.javascriptDialogOpening': {
        this.dialogs.push({ type: params.type, message: params.message });
        // 立即关闭对话框，避免页面 JS 线程被 alert 阻塞
        this.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
        break;
      }
      case 'Network.requestWillBeSent': {
        this.requestUrls.set(params.requestId, params.request?.url || '');
        break;
      }
      case 'Network.loadingFailed': {
        this.failedRequests.push({
          requestId: params.requestId,
          url: this.requestUrls.get(params.requestId) || '',
          errorText: params.errorText || '',
          blockedReason: params.blockedReason || null,
          canceled: Boolean(params.canceled),
        });
        break;
      }
      default:
        break;
    }

    const handlers = this.eventHandlers.get(method);
    if (handlers) {
      for (const handler of [...handlers]) handler(params);
    }
  }

  send(method, params = {}, { timeoutMs = 20000 } = {}) {
    if (this.closed) return Promise.reject(new Error('CDP WebSocket 已关闭'));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP 命令超时（${timeoutMs}ms）：${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer, method });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  waitForEvent(method, { timeoutMs = 15000 } = {}) {
    return new Promise((resolve, reject) => {
      const handlers = this.eventHandlers.get(method) || [];
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`等待 CDP 事件超时：${method}`));
      }, timeoutMs);
      const handler = (params) => {
        cleanup();
        resolve(params);
      };
      const cleanup = () => {
        clearTimeout(timer);
        const current = this.eventHandlers.get(method) || [];
        this.eventHandlers.set(
          method,
          current.filter((h) => h !== handler),
        );
      };
      handlers.push(handler);
      this.eventHandlers.set(method, handlers);
    });
  }

  resetEvents() {
    this.console = [];
    this.exceptions = [];
    this.dialogs = [];
    this.failedRequests = [];
    this.pageErrors = [];
    this.requestUrls = new Map();
  }

  async enableDomains({ blockedUrls = [], width = 1440, height = 1000 } = {}) {
    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('Log.enable').catch(() => {});
    await this.send('DOM.enable');
    await this.send('Network.enable').catch(() => {});
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    }).catch(() => {});
    if (blockedUrls.length > 0) {
      await this.send('Network.setBlockedURLs', { urls: blockedUrls });
    }
  }

  /** 在页面每次导航的 document 创建前注入脚本（用于导出拦截等 instrumentation） */
  async addInitScript(source) {
    const { identifier } = await this.send('Page.addScriptToEvaluateOnNewDocument', { source });
    return identifier;
  }

  async navigate(url, { timeoutMs = 25000, waitForReady = true } = {}) {
    this.resetEvents();
    const loadPromise = this.waitForEvent('Page.loadEventFired', { timeoutMs }).catch(() => null);
    const result = await this.send('Page.navigate', { url }, { timeoutMs });
    if (result.errorText) throw new Error(`页面导航失败：${result.errorText}（${url}）`);
    await loadPromise;
    if (waitForReady) {
      await this.waitFor("document.readyState === 'complete'", { timeoutMs: 8000 }).catch(() => {});
      await sleep(150);
    }
    return result;
  }

  /**
   * 执行 JS 表达式，返回 JSON 可序列化值。
   * @param {string} expression
   */
  async eval(expression, { awaitPromise = true, timeoutMs = 15000 } = {}) {
    const result = await this.send(
      'Runtime.evaluate',
      { expression, awaitPromise, returnByValue: true, userGesture: true },
      { timeoutMs },
    );
    if (result.exceptionDetails) {
      const description = result.exceptionDetails.exception?.description || result.exceptionDetails.text;
      throw new Error(`页面执行异常：${description}`);
    }
    const remote = result.result || {};
    if (remote.type === 'undefined') return undefined;
    if (remote.subtype === 'null') return null;
    return remote.value;
  }

  async waitFor(expression, { timeoutMs = 10000, intervalMs = 100 } = {}) {
    const deadline = Date.now() + timeoutMs;
    let lastError = null;
    while (Date.now() < deadline) {
      try {
        if (await this.eval(expression, { timeoutMs: 5000 })) return true;
      } catch (error) {
        lastError = error;
      }
      await sleep(intervalMs);
    }
    throw new Error(`等待条件超时（${timeoutMs}ms）：${expression}${lastError ? `；最后错误：${lastError.message}` : ''}`);
  }

  /** 设置 <input type=file> 的文件（CDP DOM.setFileInputFiles，会触发 change 事件） */
  async setFiles(selector, files) {
    const { root } = await this.send('DOM.getDocument', { depth: 1 });
    const { nodeId } = await this.send('DOM.querySelector', { nodeId: root.nodeId, selector });
    if (!nodeId) throw new Error(`未找到文件输入元素：${selector}`);
    await this.send('DOM.setFileInputFiles', { nodeId, files });
  }

  async screenshot({ path = null, clip = null, format = 'png' } = {}) {
    const params = { format, captureBeyondViewport: false };
    if (clip) params.clip = { x: clip.x, y: clip.y, width: clip.width, height: clip.height, scale: clip.scale ?? 1 };
    const { data } = await this.send('Page.captureScreenshot', params, { timeoutMs: 20000 });
    const buffer = Buffer.from(data, 'base64');
    if (path) writeFileSync(path, buffer);
    return buffer;
  }

  /** 截取某个选择器对应元素的截图（clip 基于页面坐标） */
  async screenshotElement(selector, path) {
    const rect = await this.eval(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    })()`);
    if (!rect || rect.width <= 0 || rect.height <= 0) throw new Error(`元素不可截图：${selector}`);
    return this.screenshot({ path, clip: { x: Math.max(0, rect.x - 4), y: Math.max(0, rect.y - 4), width: rect.width + 8, height: rect.height + 8 } });
  }

  /** 真实鼠标点击（页面坐标） */
  async mouseClick(x, y) {
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' });
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  }

  /** 真实鼠标拖拽序列 */
  async mouseDrag(fromX, fromY, toX, toY, { steps = 6 } = {}) {
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: fromX, y: fromY, button: 'none' });
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: fromX, y: fromY, button: 'left', clickCount: 1 });
    for (let i = 1; i <= steps; i += 1) {
      await this.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: fromX + ((toX - fromX) * i) / steps,
        y: fromY + ((toY - fromY) * i) / steps,
        button: 'left',
        buttons: 1,
      });
    }
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: toX, y: toY, button: 'left', clickCount: 1 });
  }

  async wheel(x, y, deltaY) {
    await this.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY });
  }

  /** 发送 Ctrl/Cmd 组合键（如 Ctrl+Z / Ctrl+Y） */
  async ctrlKey(key, code, windowsVirtualKeyCode) {
    await this.send('Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      key,
      code,
      windowsVirtualKeyCode,
      nativeVirtualKeyCode: windowsVirtualKeyCode,
      modifiers: 2, // Ctrl
    });
    await this.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key,
      code,
      windowsVirtualKeyCode,
      nativeVirtualKeyCode: windowsVirtualKeyCode,
      modifiers: 2,
    });
  }

  async pressEscape() {
    await this.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  }

  close() {
    if (this.ws && !this.closed) {
      try {
        this.ws.close();
      } catch {
        /* ignore */
      }
    }
  }
}

async function fetchJson(url, method = 'GET') {
  const response = await fetch(url, { method });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
  return response.json();
}

/** 启动 headless Chrome，返回句柄与页面 WebSocket URL */
export async function launchChrome({
  chromePath = process.env.CHROME_PATH || DEFAULT_CHROME_PATH,
  userDataDir = null,
  width = 1440,
  height = 1000,
  startupTimeoutMs = 25000,
} = {}) {
  if (!existsSync(chromePath)) {
    throw new Error(`未找到 Chrome：${chromePath}（可用 CHROME_PATH 环境变量指定）`);
  }
  const profileDir = userDataDir || mkdtempSync(join(tmpdir(), 'mc-fa-chrome-'));
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--mute-audio',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-default-apps',
    '--disable-component-update',
    '--disable-dev-shm-usage',
    '--metrics-recording-only',
    '--no-sandbox',
    `--window-size=${width},${height}`,
    `--user-data-dir=${profileDir}`,
    '--remote-debugging-port=0',
    '--remote-debugging-address=127.0.0.1',
    'about:blank',
  ];

  const proc = spawn(chromePath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderrTail = '';
  proc.stderr?.on('data', (chunk) => {
    stderrTail = `${stderrTail}${chunk.toString()}`.slice(-4000);
  });

  const portFile = join(profileDir, 'DevToolsActivePort');
  const deadline = Date.now() + startupTimeoutMs;
  let port = null;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) {
      throw new Error(`Chrome 提前退出（code=${proc.exitCode}）：${stderrTail}`);
    }
    if (existsSync(portFile)) {
      const content = readFileSync(portFile, 'utf8').trim().split('\n');
      const parsed = Number(content[0]);
      if (Number.isInteger(parsed) && parsed > 0) {
        port = parsed;
        break;
      }
    }
    await sleep(100);
  }
  if (!port) throw new Error(`Chrome DevTools 端口未就绪（${startupTimeoutMs}ms）：${stderrTail}`);

  const version = await fetchJson(`http://127.0.0.1:${port}/json/version`);

  // 创建独立页面 target
  let target;
  try {
    target = await fetchJson(`http://127.0.0.1:${port}/json/new?about:blank`, 'PUT');
  } catch {
    const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
    target = targets.find((t) => t.type === 'page') || targets[0];
  }
  if (!target?.webSocketDebuggerUrl) throw new Error('无法获取页面 target 的 WebSocket URL');

  const handle = {
    proc,
    port,
    profileDir,
    pageWsUrl: target.webSocketDebuggerUrl,
    browserWsUrl: version.webSocketDebuggerUrl || null,
    browserVersion: version.Browser,
    httpBase: `http://127.0.0.1:${port}`,
    async close() {
      // 1) 首选 CDP Browser.close（优雅退出，确保 Chrome 自己清理子进程）
      if (handle.browserWsUrl) {
        await new Promise((resolvePromise) => {
          const timer = setTimeout(resolvePromise, 1500);
          try {
            const ws = new WebSocket(handle.browserWsUrl);
            ws.addEventListener('open', () => ws.send(JSON.stringify({ id: 1, method: 'Browser.close' })));
            ws.addEventListener('close', () => {
              clearTimeout(timer);
              resolvePromise();
            });
            ws.addEventListener('error', () => {
              clearTimeout(timer);
              resolvePromise();
            });
          } catch {
            clearTimeout(timer);
            resolvePromise();
          }
        });
      }
      // 2) SIGTERM → 等待 → SIGKILL → 等待
      const waitExit = async (timeoutMs) => {
        const deadline = Date.now() + timeoutMs;
        while (proc.exitCode === null && Date.now() < deadline) await sleep(100);
      };
      if (proc.exitCode === null) {
        try {
          proc.kill('SIGTERM');
        } catch {
          /* ignore */
        }
        await waitExit(2000);
      }
      if (proc.exitCode === null) {
        try {
          proc.kill('SIGKILL');
        } catch {
          /* ignore */
        }
        await waitExit(2000);
      }
      // 3) 极端兜底：按 profile 路径强制清理残留进程（macOS/Linux）
      if (proc.exitCode === null && process.platform !== 'win32') {
        try {
          spawnSync('pkill', ['-9', '-f', profileDir]);
        } catch {
          /* ignore */
        }
        await waitExit(1000);
      }
      try {
        rmSync(profileDir, { recursive: true, force: true, maxRetries: 3 });
      } catch {
        /* ignore */
      }
    },
  };
  return handle;
}
