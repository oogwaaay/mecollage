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

  // 获取翻译文本
  t(key, params = {}) {
    let text = this.translations[key] || key;
    Object.keys(params).forEach(param => {
      text = text.replace(`{${param}}`, params[param]);
    });
    return text;
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
        // 检查是否有占位符替换
        let text = this.translations[key];
        // 简单的占位符替换逻辑，如果需要的话
        // ...
        
        // 检查元素是否有子元素（除了纯文本）
        if (element.children.length > 0) {
             // 保留图标等子元素，只替换文本节点
             // 这需要更复杂的DOM操作，或者简单的约定：
             // 如果有子元素，寻找专门的文本容器，或者假定data-i18n只用于替换该元素的文本内容
             // 简单的做法：如果有子元素（如<i>），我们通常不希望破坏它
             // 策略：如果包含子标签，仅替换最后一个文本节点，或者寻找特定的span?
             // 现在的项目结构中，很多按钮是 <i class="..."></i> Text 形式
             // 这种情况下直接设置 textContent 会覆盖图标
             
             // 更好的策略：将文本包裹在 span 中，并把 data-i18n 放在 span 上
             // 或者在这里进行智能处理：保留第一个子元素（如果是图标）
             
             // 暂时简单处理：如果发现有子元素，且没有显式的data-i18n-target，则跳过或者警告
             // 但为了兼容性，我们应该在HTML中把文本包起来。
             // 不过，为了方便，这里可以尝试只替换文本节点
             
             const textNodes = Array.from(element.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
             if (textNodes.length > 0) {
                 // 替换最后一个文本节点（通常是标签后的文字）
                 textNodes[textNodes.length - 1].textContent = text;
             } else {
                 // 如果没有文本节点，可能需要追加？或者直接覆盖？
                 // 安全起见，不做破坏性操作，除非HTML结构调整好
                 // 建议修改HTML结构： <a ...><i ...></i> <span data-i18n="key">Text</span></a>
             }
        } else {
            element.textContent = text;
        }
      }
    });

    // 处理 title 属性
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      if (this.translations[key]) {
        element.title = this.translations[key];
      }
    });

    // 处理 placeholder 属性
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      if (this.translations[key]) {
        element.placeholder = this.translations[key];
      }
    });

    // 处理 meta 标签 content 属性
    document.querySelectorAll('meta[data-i18n-content]').forEach(element => {
      const key = element.getAttribute('data-i18n-content');
      if (this.translations[key]) {
        element.setAttribute('content', this.translations[key]);
      }
    });

    // 处理 alt 属性
    document.querySelectorAll('[data-i18n-alt]').forEach(element => {
      const key = element.getAttribute('data-i18n-alt');
      if (this.translations[key]) {
        element.alt = this.translations[key];
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
    
    // 触发自定义事件，通知其他组件语言已变更
    document.dispatchEvent(new CustomEvent('languageChanged', { 
      detail: { lang: this.currentLang, translations: this.translations } 
    }));
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
