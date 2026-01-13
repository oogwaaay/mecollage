// i18n 翻译系统
class I18n {
  constructor() {
    this.currentLang = this.getSavedLanguage() || 'en';
    this.translations = {};
    this.init();
  }

  // 获取保存的语言偏好
  getSavedLanguage() {
    return localStorage.getItem('mecollage-language');
  }

  // 保存语言偏好
  saveLanguage(lang) {
    localStorage.setItem('mecollage-language', lang);
  }

  // 初始化翻译系统
  async init() {
    await this.loadTranslation(this.currentLang);
    this.applyTranslation();
    this.setupLanguageSwitcher();
  }

  // 加载指定语言的翻译文件
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

  // 应用翻译到页面元素
  applyTranslation() {
    // 更新HTML语言属性
    document.documentElement.setAttribute('lang', this.currentLang);

    // 翻译所有带有data-i18n属性的元素
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      if (this.translations[key]) {
        element.textContent = this.translations[key];
      }
    });

    // 更新语言选择器显示
    const langToggle = document.querySelector('.lang-selector-toggle');
    if (langToggle) {
      const currentLangText = this.translations[`lang.${this.currentLang}`] || this.currentLang;
      const langTextSpan = langToggle.querySelector('span:not([aria-hidden])');
      if (langTextSpan) {
        langTextSpan.textContent = currentLangText;
      }
    }
  }

  // 设置语言切换器
  setupLanguageSwitcher() {
    // 处理语言选项点击
    const langOptions = document.querySelectorAll('.lang-option');
    langOptions.forEach(option => {
      option.addEventListener('click', async () => {
        const lang = option.getAttribute('data-lang');
        if (lang && lang !== this.currentLang) {
          this.currentLang = lang;
          this.saveLanguage(lang);
          await this.loadTranslation(lang);
          this.applyTranslation();
          console.log(`Switched to language: ${lang}`);
        }
        // 关闭菜单
        this.toggleLanguageMenu(false);
      });
    });

    // 处理语言选择器按钮点击
    const langToggle = document.querySelector('.lang-selector-toggle');
    const langMenu = document.querySelector('.lang-menu');
    const langMenuBackdrop = document.querySelector('.lang-menu-backdrop');

    if (langToggle && langMenu) {
      // 切换菜单显示/隐藏
      langToggle.addEventListener('click', () => {
        const isExpanded = langToggle.getAttribute('aria-expanded') === 'true';
        this.toggleLanguageMenu(!isExpanded);
      });

      // 点击背景关闭菜单
      if (langMenuBackdrop) {
        langMenuBackdrop.addEventListener('click', () => {
          this.toggleLanguageMenu(false);
        });
      }

      // 点击外部关闭菜单
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.lang-selector')) {
          this.toggleLanguageMenu(false);
        }
      });
    }
  }

  // 切换语言菜单显示/隐藏
  toggleLanguageMenu(show) {
    const langToggle = document.querySelector('.lang-selector-toggle');
    const langMenu = document.querySelector('.lang-menu');
    const langMenuBackdrop = document.querySelector('.lang-menu-backdrop');

    if (langToggle && langMenu) {
      langToggle.setAttribute('aria-expanded', show);
      
      if (show) {
        langMenu.style.display = 'block';
        if (langMenuBackdrop) {
          langMenuBackdrop.style.display = 'block';
        }
      } else {
        langMenu.style.display = 'none';
        if (langMenuBackdrop) {
          langMenuBackdrop.style.display = 'none';
        }
      }
    }
  }
}

// 初始化i18n系统
document.addEventListener('DOMContentLoaded', () => {
  window.i18n = new I18n();
});
