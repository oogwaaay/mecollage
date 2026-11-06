// i18n 翻译系统（Phase B 修复）
// 设计原则：
// 1) 语言由 URL 路径决定（/zh/ /es/ /ja/ /tw/），不再依赖 localStorage 默认值；
// 2) 服务端已输出本地化内容的页面，禁止运行时改写 DOM / title / meta description；
// 3) 运行时仅提供 t() 给工具页的动态文案（滑块单位、下载文件名等），不再覆盖静态页面。
class I18n {
  constructor() {
    this.currentLang = this.detectLanguageFromPath();
    this.translations = {};
    this.init();
  }

  // 从 URL 路径推断语言；根路径（英文页）默认 en。
  detectLanguageFromPath() {
    const match = window.location.pathname.match(/^\/(zh|tw|ja|es)(?:\/|$)/);
    if (!match) return 'en';
    // 目录前缀 tw 对应 zh-TW / i18n/zh-tw.json
    return match[1] === 'tw' ? 'zh-tw' : match[1];
  }

  // 保留旧 API（读取 localStorage 偏好），但不再作为默认语言来源。
  getSavedLanguage() {
    return localStorage.getItem('mecollage-language');
  }

  saveLanguage(lang) {
    localStorage.setItem('mecollage-language', lang);
  }

  async init() {
    await this.loadTranslation(this.currentLang);
    this.setupLanguageSwitcher();
    document.dispatchEvent(new CustomEvent('languageChanged', {
      detail: { lang: this.currentLang, translations: this.translations }
    }));
  }

  async loadTranslation(lang) {
    try {
      const response = await fetch(`/i18n/${lang}.json`);
      if (response.ok) {
        this.translations = await response.json();
      } else {
        console.error(`Failed to load translation for ${lang}`);
      }
    } catch (error) {
      console.error(`Error loading translation: ${error}`);
    }
  }

  // 获取翻译文本（仅动态调用；不再批量覆盖 DOM）
  t(key, params = {}) {
    let text = this.translations[key] || key;
    Object.keys(params).forEach(param => {
      text = text.replace(`{${param}}`, params[param]);
    });
    return text;
  }

  // 语言切换器：真实 <a href> 负责跳转（SEO 硬约束，L-09/L-24），
  // JS 只负责菜单开合与键盘操作（P2-5 标准 menu 键盘模型）。
  setupLanguageSwitcher() {
    const langToggle = document.querySelector('.lang-selector-toggle');
    const langMenu = document.querySelector('.lang-menu');
    const langMenuBackdrop = document.querySelector('.lang-menu-backdrop');

    // 当前语言高亮（CSS .lang-option.is-active）；只加 class，不改链接与 URL 逻辑。
    this.getLangOptions().forEach(option => {
      if (option.getAttribute('aria-current') === 'page') option.classList.add('is-active');
    });

    if (!langToggle || !langMenu) return;

    langToggle.addEventListener('click', () => {
      const isExpanded = langToggle.getAttribute('aria-expanded') === 'true';
      this.toggleLanguageMenu(!isExpanded);
    });

    // 打开后焦点在菜单内：方向键 / Home / End / Esc / 空格
    langMenu.addEventListener('keydown', (event) => {
      const options = this.getLangOptions();
      const index = options.indexOf(document.activeElement);

      switch (event.key) {
        case 'Escape':
        case 'Esc':
          event.preventDefault();
          this.toggleLanguageMenu(false, { restoreFocus: true });
          break;
        case 'ArrowDown':
        case 'ArrowUp': {
          event.preventDefault();
          if (!options.length) break;
          const delta = event.key === 'ArrowDown' ? 1 : -1;
          let next = index < 0 ? 0 : index + delta;
          if (next < 0) next = 0;
          if (next > options.length - 1) next = options.length - 1;
          options[next].focus({ preventScroll: true });
          break;
        }
        case 'Home':
          event.preventDefault();
          if (options.length) options[0].focus({ preventScroll: true });
          break;
        case 'End':
          event.preventDefault();
          if (options.length) options[options.length - 1].focus({ preventScroll: true });
          break;
        case ' ':
        case 'Spacebar':
          // 真实 <a> 默认不响应空格，按标准菜单行为等价于 Enter（走真实 href）
          event.preventDefault();
          if (index >= 0) options[index].click();
          break;
        default:
          break;
      }
    });

    // 在 toggle 上按方向键直接打开并进入首/末项
    langToggle.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      this.toggleLanguageMenu(true);
      const options = this.getLangOptions();
      if (!options.length) return;
      options[event.key === 'ArrowDown' ? 0 : options.length - 1].focus({ preventScroll: true });
    });

    // 点击选项（含 Enter 触发）后只收合菜单，跳转交给真实 <a href>
    this.getLangOptions().forEach(option => {
      option.addEventListener('click', () => {
        this.toggleLanguageMenu(false, { restoreFocus: false });
      });
    });

    if (langMenuBackdrop) {
      langMenuBackdrop.addEventListener('click', () => {
        this.toggleLanguageMenu(false, { restoreFocus: false });
      });
    }

    // 点击语言选择器以外区域时关闭（不抢鼠标点击后的焦点）
    document.addEventListener('click', (event) => {
      const target = event.target;
      const insideSelector = !!target && !!target.closest && !!target.closest('.lang-selector');
      if (!insideSelector) this.toggleLanguageMenu(false, { restoreFocus: false });
    });

    // 焦点移出整个语言选择器时关闭（Tab 导航不留下展开菜单）
    document.querySelectorAll('.lang-selector').forEach((selector) => {
      selector.addEventListener('focusout', (event) => {
        const next = event.relatedTarget;
        if (next && selector.contains(next)) return;
        if (selector.classList.contains('is-open')) {
          this.toggleLanguageMenu(false, { restoreFocus: false });
        }
      });
    });
  }

  getLangOptions() {
    return Array.from(document.querySelectorAll('.lang-option'));
  }

  // 打开/关闭语言菜单。
  // options.restoreFocus: 关闭后焦点是否回到 .lang-selector-toggle
  // （Esc / 键盘关闭为 true；鼠标点外部为 false）
  toggleLanguageMenu(show, options = {}) {
    const langSelector = document.querySelector('.lang-selector');
    const langToggle = document.querySelector('.lang-selector-toggle');
    const langMenu = document.querySelector('.lang-menu');
    const langMenuBackdrop = document.querySelector('.lang-menu-backdrop');
    if (!langToggle || !langMenu) return;

    langToggle.setAttribute('aria-expanded', show ? 'true' : 'false');
    if (langSelector) langSelector.classList.toggle('is-open', show);
    langMenu.style.display = show ? 'flex' : 'none';
    if (langMenuBackdrop) langMenuBackdrop.style.display = show ? 'block' : 'none';

    if (show) {
      // 打开时聚焦第一项（标准 menu 模型）
      const first = this.getLangOptions()[0];
      if (first) {
        try {
          first.focus({ preventScroll: true });
        } catch (error) {
          first.focus();
        }
      }
      return;
    }

    const restoreFocus = options.restoreFocus === true ||
      (options.restoreFocus !== false && langMenu.contains(document.activeElement));
    if (restoreFocus && typeof langToggle.focus === 'function') {
      try {
        langToggle.focus({ preventScroll: true });
      } catch (error) {
        langToggle.focus();
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.i18n = new I18n();
});
