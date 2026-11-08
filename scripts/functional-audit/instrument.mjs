/**
 * 注入到每个新 document 的 instrumentation（通过 Page.addScriptToEvaluateOnNewDocument）。
 *
 * 目的：
 *   1) 拦截导出 = 不真正下载文件，但记录导出 canvas 的真实尺寸 / 像素采样 / 像素哈希；
 *   2) 拦截 html2canvas（首页编辑器导出依赖它）：记录导出容器尺寸、克隆 DOM 内的滤镜/文字/贴纸，
 *      并在真实渲染完成后记录输出 canvas 的尺寸与像素哈希；
 *   3) 提供测试用的 DOM 小工具（click / setRange / drag / rect ...）。
 *
 * 注意：站点自身的全局变量（如工具页顶层 const state、函数 downloadImage）可用 Runtime.evaluate
 * 直接访问；本文件只做"观测"，不修改站点业务代码。
 */

export const INSTRUMENT_SOURCE = String.raw`
(() => {
  if (window.__fa && window.__fa.installed) return;
  const fa = (window.__fa = window.__fa || {});
  fa.installed = true;
  fa.cap = { toBlob: [], toDataURL: [], anchors: 0, h2c: [], clicks: [] };
  fa.errors = [];

  const pixelSnapshot = (canvas) => {
    try {
      const w = canvas.width, h = canvas.height;
      if (!w || !h) return { error: 'zero-size canvas', w, h };
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(0, 0, w, h).data;
      let acc = 0x811c9dc5 >>> 0;
      let alpha0 = 0, sampled = 0;
      const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 9000)));
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          acc = (acc ^ data[i]) >>> 0; acc = Math.imul(acc, 16777619) >>> 0;
          acc = (acc ^ data[i + 1]) >>> 0; acc = Math.imul(acc, 16777619) >>> 0;
          acc = (acc ^ data[i + 2]) >>> 0; acc = Math.imul(acc, 16777619) >>> 0;
          acc = (acc ^ data[i + 3]) >>> 0; acc = Math.imul(acc, 16777619) >>> 0;
          if (data[i + 3] === 0) alpha0 += 1;
          sampled += 1;
        }
      }
      const px = (x, y) => {
        const cx = Math.min(w - 1, Math.max(0, Math.round(x)));
        const cy = Math.min(h - 1, Math.max(0, Math.round(y)));
        return Array.from(ctx.getImageData(cx, cy, 1, 1).data);
      };
      const norm = [[0.02, 0.02], [0.05, 0.05], [0.1, 0.1], [0.2, 0.2], [0.5, 0.5]];
      return {
        w, h, hash: acc.toString(16), alpha0, sampled, alpha0Ratio: sampled ? alpha0 / sampled : 0,
        samples: { tl: px(2, 2), c: px(w / 2, h / 2), br: px(w - 3, h - 3) },
        normSamples: norm.map(([nx, ny]) => ({ nx, ny, px: px(nx * w, ny * h) })),
      };
    } catch (error) {
      return { error: String(error) };
    }
  };
  fa.pixelSnapshot = pixelSnapshot;

  // ---- 导出拦截（工具页：toBlob / toDataURL；首页：html2canvas + toDataURL）----
  const origToBlob = HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
    let record = null;
    try {
      record = { w: this.width, h: this.height, type: type || 'image/png', snapshot: pixelSnapshot(this) };
    } catch (error) {
      record = { w: this.width, h: this.height, type: type || 'image/png', snapshotError: String(error) };
    }
    fa.cap.toBlob.push(record);
    return origToBlob.call(this, callback, type, quality);
  };

  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function (type, quality) {
    try {
      fa.cap.toDataURL.push({ w: this.width, h: this.height, type: type || 'image/png', snapshot: pixelSnapshot(this) });
    } catch (error) {
      fa.cap.toDataURL.push({ w: this.width, h: this.height, type: type || 'image/png', snapshotError: String(error) });
    }
    return origToDataURL.call(this, type, quality);
  };

  // 拦截真实下载（<a>.click()），但保留按钮业务逻辑执行
  const origAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    fa.cap.anchors += 1;
    fa.cap.clicks.push({ href: String(this.href || '').slice(0, 80), download: this.download || '' });
  };

  // 首页导出依赖 html2canvas（cdnjs 加载）；用属性 setter 包一层
  let h2cOriginal = null;
  Object.defineProperty(window, 'html2canvas', {
    configurable: true,
    get() { return h2cOriginal; },
    set(value) {
      if (typeof value !== 'function') { h2cOriginal = value; return; }
      const wrapped = async function (element, options) {
        const rect = element ? element.getBoundingClientRect() : { width: 0, height: 0 };
        const cap = {
          elW: rect.width, elH: rect.height,
          scale: (options && options.scale) || 1,
          images: element ? [...element.querySelectorAll('img')].map((img) => getComputedStyle(img).filter) : [],
          texts: element ? [...element.querySelectorAll('.text-layer')].map((el) => el.textContent) : [],
          stickers: element ? [...element.querySelectorAll('.sticker-layer')].map((el) => el.textContent) : [],
        };
        const canvas = await value(element, options);
        try {
          cap.canvasW = canvas.width;
          cap.canvasH = canvas.height;
          cap.snapshot = pixelSnapshot(canvas);
        } catch (error) {
          cap.pixelError = String(error);
        }
        fa.cap.h2c.push(cap);
        return canvas;
      };
      h2cOriginal = wrapped;
    },
  });

  // ---- 页面错误收集 ----
  window.addEventListener('error', (event) => {
    fa.errors.push({ kind: 'error', message: String(event.message || '') });
  });
  window.addEventListener('unhandledrejection', (event) => {
    fa.errors.push({ kind: 'unhandledrejection', message: String((event.reason && event.reason.message) || event.reason) });
  });

  // ---- DOM 测试工具 ----
  fa.q = (sel) => document.querySelector(sel);
  fa.count = (sel) => document.querySelectorAll(sel).length;
  fa.rect = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  };
  fa.rectOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  fa.click = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    el.click();
    return true;
  };
  fa.clickEl = (el) => { el.click(); };
  fa.setValue = (sel, value) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    el.value = String(value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };
  fa.setSelect = (sel, value) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    el.value = String(value);
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return el.value;
  };
  fa.setRange = (sel, value) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    el.value = String(value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return el.value;
  };
  fa.dispatch = (el, type, init) => el.dispatchEvent(new MouseEvent(type, Object.assign({ bubbles: true, cancelable: true }, init)));
  fa.dblclick = (el) => el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
  fa.keydown = (key, ctrl) => document.dispatchEvent(new KeyboardEvent('keydown', { key, ctrlKey: !!ctrl, metaKey: false, bubbles: true, cancelable: true }));
  // 2026-11-08：文字/贴纸拖拽改为 Pointer Events（触屏可用）；测试用 pointer 序列模拟鼠标拖拽
  fa.pointer = (el, type, init) => el.dispatchEvent(new PointerEvent(type, Object.assign({
    bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', isPrimary: true,
    button: type === 'pointerup' ? 0 : 0,
  }, init)));
  fa.dragText = (dx, dy) => {
    const el = document.querySelector('.text-wrapper');
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    fa.pointer(el, 'pointerdown', { clientX: cx, clientY: cy, buttons: 1 });
    fa.pointer(document, 'pointermove', { clientX: cx + dx, clientY: cy + dy, buttons: 1 });
    fa.pointer(document, 'pointerup', { clientX: cx + dx, clientY: cy + dy, buttons: 0 });
    return true;
  };
  fa.dragCanvas = (sel, fromX, fromY, toX, toY) => {
    const canvas = document.querySelector(sel);
    if (!canvas) return false;
    const r = canvas.getBoundingClientRect();
    fa.dispatch(canvas, 'mousedown', { clientX: r.left + fromX, clientY: r.top + fromY });
    fa.dispatch(canvas, 'mousemove', { clientX: r.left + toX, clientY: r.top + toY });
    fa.dispatch(canvas, 'mouseup', { clientX: r.left + toX, clientY: r.top + toY });
    return true;
  };
  fa.imageSrcTail = () => [...document.querySelectorAll('.image-outer-container img')].map((img) => (img.src || '').slice(-24));
  fa.textWrapperLeft = () => {
    const el = document.querySelector('.text-wrapper');
    return el ? el.style.left : null;
  };
  fa.syntheticReorder = (fromIndex, toIndex) => {
    const containers = [...document.querySelectorAll('.image-outer-container')];
    if (!containers[fromIndex] || !containers[toIndex]) return 'MISSING';
    try {
      const dt = new DataTransfer();
      containers[fromIndex].dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
      containers[toIndex].dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
      containers[toIndex].dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
      return 'OK';
    } catch (error) {
      return 'ERR:' + error.message;
    }
  };
})();
`;
