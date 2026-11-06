/**
 * MeCollage 共享 UI 层（R0，2026-11-06）
 * =============================================================================
 * 契约：audit/design-migration/IMPLEMENTATION-SPEC.md §2「R0：共享 UI 契约」。
 *
 * 本文件只创建 DOM、管理状态与 aria 属性，**不写颜色/字号/间距等视觉值**
 * （视觉全部在 assets/css/components.css：#mc-toast-stack / .mc-toast /
 *  .mc-toast--* / .mc-menu-btn / .mc-brand / .mc-mobile-backdrop /
 *  body.mc-nav-open / body.mc-collage-page / body.mc-tool-page）。
 *
 * 对外 API（window.mcUI）：
 *   mcUI.toast(message, { type, duration, actionLabel, onAction, params })
 *     - type: 'success' | 'info' | 'error' | 'undo'（默认 info）
 *     - duration: ms，默认 3200（error 5000）；传 0 表示不自动消失
 *     - actionLabel / onAction: 可选操作按钮（如「撤销」「重试」）
 *     - message / actionLabel 既可传已翻译文本，也可传 i18n key
 *       （如 'toast.export_failed'，自动经 window.i18n.t 翻译）
 *     - params: 可选，配合 key 使用（如 { size: '2400×2400 px · 2.4 MB' }）
 *     - 同屏最多 3 条；role="status" + aria-live="polite"
 *   mcUI.announcePhotosAdded(n)   添加照片后的 toast + 滚动 + 聚焦（n=1 用单数文案）
 *   mcUI.setBusy(el, busy, label) 禁用它 / 恢复原 disabled 与文案，busy 时 aria-busy
 *   mcUI.mobileNav.init()         注入 .mc-menu-btn / .mc-brand / .mc-mobile-backdrop 并绑定行为
 *   mcUI.mobileNav.open() / .close() / .isOpen()
 *   mcUI.exportFeedback           导出状态用的 i18n 键（供 main.js 参考，见下）
 *   mcUI.onReady(fn)              DOM ready 后执行（兼容 defer）
 *
 * 其他：初始化时给 body 打页面类型 class（CSS §17 依赖）：
 *   - 编辑首页 → body.mc-collage-page（.collage-tool-container + 编辑器特征）
 *   - 4 个工具页 → body.mc-tool-page（.square/squarecrop/rounded/blurred-tool-container）
 *   并把带 data-i18n-aria-label 的元素的 aria-label 在 i18n 就绪后本地化。
 *
 * 注：本文件由 scripts/design-system/inject-ui.mjs 在 94 个站点页面 </body> 前注入（defer）。
 */
(function () {
  'use strict';

  // 防止重复加载（注入脚本幂等 + 页面内可能手动引入）
  if (window.mcUI && window.mcUI.__mcUI === true) return;

  /* ------------------------------------------------------------------------ *
   * 1. i18n 辅助
   * ------------------------------------------------------------------------ */

  // ui.js 自身 UI 文案的英文兜底（正常页面由 i18n/{lang}.json 提供；
  // 40 个无 i18n.js 的落地页也安全加载本文件，不能出现裸 key）。
  var FALLBACK_TEXT = {
    'nav.menu': 'Menu',
    'nav.close': 'Close',
    'nav.home': 'Home',
    'toast.dismiss': 'Dismiss',
    'toast.photo_added': '1 photo added',
    'toast.photos_added': '{n} photos added'
  };

  var KEY_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i;

  function isI18nKey(value) {
    return typeof value === 'string' && KEY_PATTERN.test(value);
  }

  function replaceParams(text, params) {
    if (!params) return text;
    Object.keys(params).forEach(function (name) {
      if (params[name] == null) return;
      text = text.split('{' + name + '}').join(String(params[name]));
    });
    return text;
  }

  // 去掉未传入的占位符，避免界面上出现 {size} / {n} 之类的裸占位符。
  function stripUnfilledParams(text) {
    return String(text)
      .replace(/\{[a-zA-Z0-9_]+\}/g, '')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\s+([,.;:!?。，；：！？])/g, '$1')
      .trim();
  }

  /**
   * 取翻译文案。key 不存在时依次退回英文兜底 / key 本身（与 i18n.js t() 一致）。
   */
  function translate(key, params) {
    if (key == null) return '';
    if (!isI18nKey(key)) return String(key);
    var text = null;
    if (window.i18n && typeof window.i18n.t === 'function') {
      try {
        var translated = window.i18n.t(key, params || {});
        if (translated && translated !== key) text = translated;
      } catch (error) {
        text = null;
      }
    }
    if (text == null && Object.prototype.hasOwnProperty.call(FALLBACK_TEXT, key)) {
      text = FALLBACK_TEXT[key];
    }
    if (text == null) return key; // 让缺失 key 可见（与 i18n.js 行为一致）
    return stripUnfilledParams(replaceParams(text, params));
  }

  /* ------------------------------------------------------------------------ *
   * 2. Toast（P1-1 / P0-4 反馈）
   * ------------------------------------------------------------------------ */

  var TOAST_STACK_ID = 'mc-toast-stack';
  var MAX_TOASTS = 3;
  var TOAST_TYPES = { success: true, info: true, error: true, undo: true };
  var DEFAULT_DURATION = { success: 3200, info: 3200, error: 5000, undo: 5000 };
  var toastTimers = typeof WeakMap === 'function' ? new WeakMap() : null;

  function ensureToastStack() {
    var stack = document.getElementById(TOAST_STACK_ID);
    if (stack) return stack;
    stack = document.createElement('div');
    stack.id = TOAST_STACK_ID;
    // 单一 live region：避免每条 toast 各建一个 live region 导致重复播报
    stack.setAttribute('role', 'status');
    stack.setAttribute('aria-live', 'polite');
    stack.setAttribute('aria-atomic', 'false');
    stack.setAttribute('aria-relevant', 'additions text');
    (document.body || document.documentElement).appendChild(stack);
    return stack;
  }

  function prefersReducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (error) {
      return false;
    }
  }

  function clearToastTimer(el) {
    if (!toastTimers) return;
    var state = toastTimers.get(el);
    if (state && state.timerId) {
      clearTimeout(state.timerId);
      state.timerId = null;
    }
  }

  function dismissToast(el) {
    if (!el || !el.parentNode) return;
    clearToastTimer(el);
    if (toastTimers) toastTimers.delete(el);
    el.parentNode.removeChild(el);
  }

  function pauseToastTimer(el) {
    if (!toastTimers) return;
    var state = toastTimers.get(el);
    if (!state || !state.timerId) return;
    clearTimeout(state.timerId);
    state.timerId = null;
    state.remaining = Math.max(0, state.remaining - (Date.now() - state.startedAt));
  }

  function resumeToastTimer(el) {
    if (!toastTimers) return;
    var state = toastTimers.get(el);
    if (!state || state.timerId || state.remaining <= 0) return;
    state.startedAt = Date.now();
    state.timerId = setTimeout(function () {
      dismissToast(el);
    }, state.remaining);
  }

  function scheduleToastDismiss(el, duration) {
    if (!toastTimers || !duration) return;
    var state = { remaining: duration, startedAt: Date.now(), timerId: null };
    toastTimers.set(el, state);
    state.timerId = setTimeout(function () {
      dismissToast(el);
    }, duration);
    // 悬停 / 键盘聚焦时暂停计时，用户可从容阅读或点操作按钮
    el.addEventListener('mouseenter', function () { pauseToastTimer(el); });
    el.addEventListener('mouseleave', function () { resumeToastTimer(el); });
    el.addEventListener('focusin', function () { pauseToastTimer(el); });
    el.addEventListener('focusout', function (event) {
      if (event.relatedTarget && el.contains(event.relatedTarget)) return;
      resumeToastTimer(el);
    });
  }

  function createToastMessageElement(text) {
    var msg = document.createElement('div');
    msg.className = 'mc-toast__msg';
    msg.textContent = text;
    return msg;
  }

  function createToastCloseButton() {
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'mc-toast__close';
    close.setAttribute('aria-label', translate('toast.dismiss'));
    var glyph = document.createElement('span');
    glyph.setAttribute('aria-hidden', 'true');
    glyph.textContent = '\u00d7'; // ×
    close.appendChild(glyph);
    return close;
  }

  /**
   * 创建一条 toast。
   * message 可以是文本，也可以是 i18n key（'toast.export_failed'）。
   */
  function toast(message, options) {
    var opts = options || {};
    var type = TOAST_TYPES[opts.type] ? opts.type : 'info';
    var duration = opts.duration === 0 ? 0
      : (typeof opts.duration === 'number' && opts.duration > 0
        ? opts.duration
        : (DEFAULT_DURATION[type] || 3200));

    var stack = ensureToastStack();
    while (stack.children.length >= MAX_TOASTS) {
      dismissToast(stack.firstElementChild);
    }

    var messageText = typeof message === 'string' || typeof message === 'number'
      ? (isI18nKey(message) ? translate(message, opts.params) : String(message))
      : '';

    var el = document.createElement('div');
    el.className = 'mc-toast mc-toast--' + type;
    el.setAttribute('data-mc-toast', type);
    el.appendChild(createToastMessageElement(messageText));

    var actionLabel = opts.actionLabel || (opts.action && opts.action.label);
    var actionHandler = opts.onAction || (opts.action && opts.action.onClick);
    if (actionLabel) {
      var action = document.createElement('button');
      action.type = 'button';
      action.className = 'mc-toast__action';
      action.textContent = isI18nKey(actionLabel) ? translate(actionLabel, opts.params) : String(actionLabel);
      action.addEventListener('click', function () {
        dismissToast(el);
        if (typeof actionHandler === 'function') {
          try {
            actionHandler();
          } catch (error) {
            console.error('[mcUI] toast action failed:', error);
          }
        }
      });
      el.appendChild(action);
    }

    var close = createToastCloseButton();
    close.addEventListener('click', function () { dismissToast(el); });
    el.appendChild(close);

    stack.appendChild(el);
    scheduleToastDismiss(el, duration);
    return { el: el, dismiss: function () { dismissToast(el); } };
  }

  /* ------------------------------------------------------------------------ *
   * 3. 上传后过渡（P0-4）：toast + 滚动 + 聚焦
   * ------------------------------------------------------------------------ */

  function focusCanvasArea() {
    var target = document.querySelector('.canvas-container') ||
      document.querySelector('#uploadScreen') ||
      document.querySelector('.main-content');
    if (!target) return;
    var reduce = prefersReducedMotion();
    try {
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    } catch (error) {
      try { target.scrollIntoView(); } catch (ignored) { /* noop */ }
    }
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    var doFocus = function () {
      try {
        target.focus({ preventScroll: true });
      } catch (error) {
        try { target.focus(); } catch (ignored) { /* noop */ }
      }
    };
    if (reduce) doFocus();
    else setTimeout(doFocus, 250); // 等平滑滚动开始后再聚焦，避免焦点抢滚动
  }

  function announcePhotosAdded(count) {
    var n = Number(count);
    var hasCount = isFinite(n) && n > 0;
    var message;
    if (hasCount && n === 1) message = translate('toast.photo_added');
    else if (hasCount) message = translate('toast.photos_added', { n: n });
    else message = translate('toast.photos_added');
    toast(message, { type: 'success' });
    focusCanvasArea();
  }

  /* ------------------------------------------------------------------------ *
   * 4. 忙碌态（导出 / AI）：setBusy(el, busy, label)
   * ------------------------------------------------------------------------ */

  var busyStates = typeof WeakMap === 'function' ? new WeakMap() : null;

  function setElementLabel(el, label) {
    if (label == null) return;
    var text = isI18nKey(label) ? translate(label) : String(label);
    el.textContent = text;
  }

  function setBusy(el, busy, label) {
    if (!el || !el.getAttribute) return;
    var supportsDisabled = 'disabled' in el;
    var stored = busyStates ? busyStates.get(el) : null;

    if (busy) {
      if (stored) {
        // 已处于 busy：只更新 loading 文案
        setElementLabel(el, label);
        return;
      }
      var state = {
        disabled: supportsDisabled ? !!el.disabled : false,
        ariaBusy: el.getAttribute('aria-busy'),
        ariaDisabled: el.getAttribute('aria-disabled'),
        html: (el.tagName === 'BUTTON' || el.tagName === 'A') ? el.innerHTML : null
      };
      if (busyStates) busyStates.set(el, state);
      if (supportsDisabled) el.disabled = true;
      else el.setAttribute('aria-disabled', 'true');
      el.setAttribute('aria-busy', 'true');
      setElementLabel(el, label);
      return;
    }

    if (stored) {
      if (supportsDisabled) el.disabled = stored.disabled;
      if (stored.ariaBusy == null) el.removeAttribute('aria-busy');
      else el.setAttribute('aria-busy', stored.ariaBusy);
      if (stored.ariaDisabled == null) el.removeAttribute('aria-disabled');
      else el.setAttribute('aria-disabled', stored.ariaDisabled);
      if (stored.html != null) el.innerHTML = stored.html;
      if (busyStates) busyStates.delete(el);
    } else {
      if (supportsDisabled) el.disabled = false;
      el.removeAttribute('aria-busy');
      el.removeAttribute('aria-disabled');
    }
  }

  /* ------------------------------------------------------------------------ *
   * 5. 页面类型标记（mobileNav 初始化时一并执行；CSS §17 依赖）
   * ------------------------------------------------------------------------ */

  var EDITOR_HOME_SELECTOR = '.collage-tool-container .home-tool-entry, ' +
    '.collage-tool-container #uploadScreen, ' +
    '.collage-tool-container #collageCanvas, ' +
    '.collage-tool-container .bottom-toolbar';
  var TOOL_PAGE_SELECTOR = '.square-tool-container, .squarecrop-tool-container, ' +
    '.blurred-tool-container, .rounded-tool-container, .aspectratio-tool-container';

  function applyPageTypeClasses() {
    var body = document.body;
    if (!body) return;
    if (document.querySelector(EDITOR_HOME_SELECTOR)) body.classList.add('mc-collage-page');
    else if (document.querySelector(TOOL_PAGE_SELECTOR)) body.classList.add('mc-tool-page');
  }

  /* ------------------------------------------------------------------------ *
   * 6. 移动端导航（P0-3）：品牌 + 汉堡菜单 + 遮罩
   * ------------------------------------------------------------------------ */

  var nav = {
    initialized: false,
    root: null,
    brand: null,
    button: null,
    backdrop: null,
    navLeft: null,
    open: false,
    mediaQuery: null,
    onKeydown: null,
    onFocusOut: null
  };

  // 本地化品牌链接目标：zh/tw/ja/es 前缀页面回到对应语言首页
  function localizedHomeHref() {
    var match = (window.location.pathname || '/').match(/^\/(zh|tw|ja|es)(?:\/|$)/);
    return match ? '/' + match[1] + '/' : '/';
  }

  function brandAriaLabel() {
    var home = translate('nav.home');
    return home && home !== 'nav.home' ? 'MeCollage ' + home : 'MeCollage home';
  }

  function setMenuButtonLabel(button, isOpen) {
    var label = translate(isOpen ? 'nav.close' : 'nav.menu');
    button.setAttribute('aria-label', label);
    var icon = button.querySelector('[data-mc-menu-icon]');
    if (!icon) {
      button.textContent = '';
      icon = document.createElement('span');
      icon.setAttribute('aria-hidden', 'true');
      icon.setAttribute('data-mc-menu-icon', '');
      button.appendChild(icon);
    }
    icon.textContent = isOpen ? '\u2715' : '\u2630'; // ✕ / ☰
  }

  function focusElement(el) {
    if (!el || typeof el.focus !== 'function') return;
    try {
      el.focus({ preventScroll: true });
    } catch (error) {
      try { el.focus(); } catch (ignored) { /* noop */ }
    }
  }

  function setMobileNavOpen(open, options) {
    var opts = options || {};
    if (!nav.root) return;
    var restoreFocus = opts.restoreFocus !== false;
    if (nav.open === !!open) {
      if (!open && restoreFocus) focusElement(nav.button);
      return;
    }
    nav.open = !!open;
    document.body.classList.toggle('mc-nav-open', nav.open);
    if (nav.button) {
      nav.button.setAttribute('aria-expanded', nav.open ? 'true' : 'false');
      setMenuButtonLabel(nav.button, nav.open);
    }
    if (nav.open) {
      var firstLink = nav.navLeft ? nav.navLeft.querySelector('.nav-link') : null;
      if (firstLink) focusElement(firstLink);
    } else if (restoreFocus) {
      focusElement(nav.button);
    }
  }

  function initMobileNav() {
    if (nav.initialized) return;
    nav.initialized = true;
    var root = document.querySelector('.ghibli-nav');
    if (!root) return; // 落地页/404 无全局导航
    nav.root = root;

    // 6.1 品牌链接（插到 .ghibli-nav 最前；≤768 显示，桌面隐藏）
    var existingBrand = root.querySelector('.mc-brand');
    if (!existingBrand) {
      var brand = document.createElement('a');
      brand.className = 'mc-brand';
      brand.href = localizedHomeHref();
      brand.setAttribute('aria-label', brandAriaLabel());
      brand.textContent = 'MeCollage';
      root.insertBefore(brand, root.firstChild);
      nav.brand = brand;
    } else {
      nav.brand = existingBrand;
    }

    // 6.2 .nav-left 需要 id 供 aria-controls 引用
    nav.navLeft = root.querySelector('.nav-left');
    if (nav.navLeft && !nav.navLeft.id) nav.navLeft.id = 'mc-mobile-nav';

    // 6.3 菜单按钮（append 到 .ghibli-nav 末尾：品牌 → 语言 → 菜单）
    var existingButton = root.querySelector('.mc-menu-btn');
    if (!existingButton) {
      existingButton = document.createElement('button');
      existingButton.type = 'button';
      existingButton.className = 'mc-menu-btn';
      existingButton.setAttribute('aria-expanded', 'false');
      if (nav.navLeft && nav.navLeft.id) existingButton.setAttribute('aria-controls', nav.navLeft.id);
      setMenuButtonLabel(existingButton, false);
      root.appendChild(existingButton);
    }
    nav.button = existingButton;
    nav.button.addEventListener('click', function () {
      setMobileNavOpen(!nav.open, { restoreFocus: true });
    });

    // 6.4 遮罩（挂 body：nav 是 sticky z-index，遮罩放 body 才在顶栏之下、内容之上）
    var existingBackdrop = document.querySelector('.mc-mobile-backdrop');
    if (!existingBackdrop) {
      existingBackdrop = document.createElement('div');
      existingBackdrop.className = 'mc-mobile-backdrop';
      existingBackdrop.setAttribute('aria-hidden', 'true');
      document.body.appendChild(existingBackdrop);
    }
    nav.backdrop = existingBackdrop;
    nav.backdrop.addEventListener('click', function () {
      setMobileNavOpen(false, { restoreFocus: true });
    });

    // 6.5 点击导航链接后收合（真实 <a> 负责跳转）
    if (nav.navLeft) {
      nav.navLeft.addEventListener('click', function (event) {
        var target = event.target;
        var link = target && target.closest ? target.closest('a') : null;
        if (link) setMobileNavOpen(false, { restoreFocus: false });
      });
    }

    // 6.6 Esc 关闭并返回焦点（若语言菜单展开，先交给语言菜单处理）
    nav.onKeydown = function (event) {
      if (!nav.open) return;
      if (event.key !== 'Escape' && event.key !== 'Esc') return;
      if (document.querySelector('.lang-selector.is-open')) return;
      event.preventDefault();
      setMobileNavOpen(false, { restoreFocus: true });
    };
    document.addEventListener('keydown', nav.onKeydown);

    // 6.7 焦点移出导航面板即收合
    nav.onFocusOut = function (event) {
      if (!nav.open) return;
      var next = event.relatedTarget;
      if (!next || next === nav.backdrop) return;
      if (nav.root && nav.root.contains(next)) return;
      setMobileNavOpen(false, { restoreFocus: false });
    };
    root.addEventListener('focusout', nav.onFocusOut);

    // 6.8 点击导航外区域收合
    document.addEventListener('click', function (event) {
      if (!nav.open) return;
      var target = event.target;
      if (!target || (nav.root && nav.root.contains(target))) return;
      setMobileNavOpen(false, { restoreFocus: false });
    });

    // 6.9 视口回到桌面宽度时复位，避免残留 body.mc-nav-open
    if (window.matchMedia) {
      try {
        nav.mediaQuery = window.matchMedia('(max-width: 768px)');
        var onViewportChange = function (event) {
          if (!event.matches && nav.open) setMobileNavOpen(false, { restoreFocus: false });
        };
        if (nav.mediaQuery.addEventListener) nav.mediaQuery.addEventListener('change', onViewportChange);
        else if (nav.mediaQuery.addListener) nav.mediaQuery.addListener(onViewportChange);
      } catch (error) {
        nav.mediaQuery = null;
      }
    }
  }

  /* ------------------------------------------------------------------------ *
   * 7. data-i18n-aria-label 本地化（编辑器新增按钮等动态文案）
   * ------------------------------------------------------------------------ */

  function applyI18nAriaLabels() {
    var nodes = document.querySelectorAll('[data-i18n-aria-label]');
    if (!nodes.length) return;
    var hasI18n = !!(window.i18n && typeof window.i18n.t === 'function');
    for (var i = 0; i < nodes.length; i += 1) {
      var el = nodes[i];
      var key = el.getAttribute('data-i18n-aria-label');
      if (!key) continue;
      var text = null;
      if (hasI18n) {
        try {
          var translated = window.i18n.t(key);
          if (translated && translated !== key) text = translated;
        } catch (error) {
          text = null;
        }
      }
      if (text == null && Object.prototype.hasOwnProperty.call(FALLBACK_TEXT, key)) text = FALLBACK_TEXT[key];
      if (text) el.setAttribute('aria-label', text);
    }
  }

  function refreshUiLabels() {
    applyI18nAriaLabels();
    if (nav.brand) nav.brand.setAttribute('aria-label', brandAriaLabel());
    if (nav.button) setMenuButtonLabel(nav.button, nav.open);
  }

  /* ------------------------------------------------------------------------ *
   * 8. onReady 与初始化
   * ------------------------------------------------------------------------ */

  function onReady(fn) {
    if (typeof fn !== 'function') return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { fn(); }, { once: true });
    } else {
      fn();
    }
  }

  function initialize() {
    applyPageTypeClasses();
    initMobileNav();
    refreshUiLabels();
  }

  // i18n.js 异步加载完翻译后会派发 languageChanged（含页面无 i18n.js 时不会触发）
  document.addEventListener('languageChanged', refreshUiLabels);
  onReady(initialize);

  /* ------------------------------------------------------------------------ *
   * 9. 对外 API
   * ------------------------------------------------------------------------ */

  window.mcUI = {
    __mcUI: true,
    version: '1.0.0-r0',

    toast: toast,
    announcePhotosAdded: announcePhotosAdded,
    setBusy: setBusy,
    onReady: onReady,

    // 导出状态用的 i18n 键（供 assets/js/mecollage-main.js 参考使用）
    exportFeedback: {
      progress: 'export.progress',
      loading: 'export.disabled_loading',
      success: 'toast.export_success',
      failed: 'toast.export_failed',
      retry: 'toast.retry'
    },

    mobileNav: {
      init: function () {
        onReady(initMobileNav);
        return window.mcUI.mobileNav;
      },
      open: function () {
        onReady(function () {
          initMobileNav();
          setMobileNavOpen(true, { restoreFocus: false });
        });
        return window.mcUI.mobileNav;
      },
      close: function () {
        onReady(function () { setMobileNavOpen(false, { restoreFocus: true }); });
        return window.mcUI.mobileNav;
      },
      isOpen: function () { return nav.open; }
    }
  };
}());
