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

  // 语言切换器：真实 <a href> 负责跳转，JS 只负责菜单开合。
  setupLanguageSwitcher() {
    document.querySelectorAll('.lang-option').forEach(option => {
      option.addEventListener('click', () => {
        this.toggleLanguageMenu(false);
      });
    });

    const langToggle = document.querySelector('.lang-selector-toggle');
    const langMenu = document.querySelector('.lang-menu');
    const langMenuBackdrop = document.querySelector('.lang-menu-backdrop');

    if (langToggle && langMenu) {
      langToggle.addEventListener('click', () => {
        const isExpanded = langToggle.getAttribute('aria-expanded') === 'true';
        this.toggleLanguageMenu(!isExpanded);
      });

      if (langMenuBackdrop) {
        langMenuBackdrop.addEventListener('click', () => {
          this.toggleLanguageMenu(false);
        });
      }

      document.addEventListener('click', (e) => {
        if (!e.target.closest('.lang-selector')) {
          this.toggleLanguageMenu(false);
        }
      });
    }
  }

  toggleLanguageMenu(show) {
    const langToggle = document.querySelector('.lang-selector-toggle');
    const langMenu = document.querySelector('.lang-menu');
    const langMenuBackdrop = document.querySelector('.lang-menu-backdrop');
    if (!langToggle || !langMenu) return;
    langToggle.setAttribute('aria-expanded', show ? 'true' : 'false');
    langMenu.style.display = show ? 'block' : 'none';
    if (langMenuBackdrop) langMenuBackdrop.style.display = show ? 'block' : 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.i18n = new I18n();
});
