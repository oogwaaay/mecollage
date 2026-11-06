/**
 * MeCollage 博客列表客户端搜索（R2，2026-11-06）
 * =============================================================================
 * 契约：tasks R2-B（博客列表客户端搜索/筛选，渐进增强）
 *
 * 行为：
 * - 渐进增强：无 JS 时全部 8 篇文章可见（脚本只在用户输入后才隐藏不匹配卡片）；
 * - 输入即时过滤 `.blog-post-card`：大小写不敏感、按空白分词（AND）、
 *   匹配标题（.blog-post-title）与描述（.blog-post-excerpt）；CJK 原样匹配
 *   （normalize('NFKC') + toLowerCase，不做拼音/翻译）；
 * - 结果数写入 `#blogSearchResults`（role="status" aria-live="polite"）；
 * - 0 结果时显示 `#blogSearchEmpty` 空状态 + 清除按钮；清除恢复全部并聚焦输入框；
 * - 不改变 URL / history / 文章链接 / canonical；不提交表单。
 *
 * 本文件只改 DOM 状态（hidden / textContent / placeholder / aria），
 * **不写颜色、字号、间距等视觉值**——视觉由 components.css 的 `.blog-search*` 负责。
 *
 * 依赖：`window.i18n?.t`（i18n.js，异步加载完成前用内置英文兜底；
 * 收到 document 的 `languageChanged` 事件后刷新文案）。
 */
(function () {
  'use strict';

  if (window.mcBlogSearch && window.mcBlogSearch.__ready === true) return;

  // 英文兜底（无 i18n.js / 翻译未就绪 / 缺键时使用；不会出现裸 key）
  var FALLBACK_TEXT = {
    'blog.search.placeholder': 'Search articles…',
    'blog.search.results': '{n} results',
    'blog.search.result_one': '1 result',
    'blog.search.empty': 'No articles match your search.',
    'blog.search.clear': 'Clear search'
  };

  function isI18nKey(value) {
    return typeof value === 'string' && /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i.test(value);
  }

  function replaceParams(text, params) {
    if (!params) return text;
    Object.keys(params).forEach(function (name) {
      if (params[name] == null) return;
      text = text.split('{' + name + '}').join(String(params[name]));
    });
    return text;
  }

  function translate(key, params) {
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
    if (text == null) return key;
    return replaceParams(text, params).replace(/\{[a-zA-Z0-9_]+\}/g, '').trim();
  }

  // 大小写不敏感 + NFKC 归一化（全角/半角、CJK）；CJK 字符原样参与子串匹配
  function normalize(value) {
    var text = String(value == null ? '' : value);
    try {
      if (typeof text.normalize === 'function') text = text.normalize('NFKC');
    } catch (error) {
      /* 老浏览器忽略归一化 */
    }
    return text.toLowerCase();
  }

  function tokenize(value) {
    return normalize(value).split(/\s+/).filter(Boolean);
  }

  function buildSearchIndex(cards) {
    var index = [];
    for (var i = 0; i < cards.length; i += 1) {
      var card = cards[i];
      var title = card.querySelector('.blog-post-title, h2, h3');
      var excerpt = card.querySelector('.blog-post-excerpt, p');
      index.push({
        el: card,
        // 只索引标题 + 描述（不含日期/按钮文案，避免 Read More 等噪声命中）
        text: normalize(
          (title ? title.textContent : '') + ' ' + (excerpt ? excerpt.textContent : '')
        )
      });
    }
    return index;
  }

  function init() {
    var panel = document.querySelector('.blog-search-panel');
    var input = document.getElementById('blogSearchInput');
    var grid = document.querySelector('.blog-posts-grid');
    if (!panel || !input || !grid) return; // 渐进增强：结构不符合时完全不接管

    var cards = Array.prototype.slice.call(grid.querySelectorAll('.blog-post-card'));
    if (!cards.length) return;

    var results = document.getElementById('blogSearchResults');
    var empty = document.getElementById('blogSearchEmpty');
    var clearButton = document.getElementById('blogSearchClear');
    var label = panel.querySelector('label[for="blogSearchInput"]');
    var index = buildSearchIndex(cards);

    function applyI18n() {
      var placeholder = translate('blog.search.placeholder');
      input.setAttribute('placeholder', placeholder);
      if (label) label.textContent = placeholder;
      if (empty) {
        var emptyMessage = empty.querySelector('p');
        if (emptyMessage) emptyMessage.textContent = translate('blog.search.empty');
      }
      if (clearButton) clearButton.textContent = translate('blog.search.clear');
      render();
    }

    function render() {
      var tokens = tokenize(input.value);
      var visibleCount = 0;

      for (var i = 0; i < index.length; i += 1) {
        var item = index[i];
        var isMatch = true;
        for (var t = 0; t < tokens.length; t += 1) {
          if (item.text.indexOf(tokens[t]) === -1) {
            isMatch = false;
            break;
          }
        }
        // hidden 属性给语义层；页面内联 .blog-post-card{display:flex} 的优先级高于
        // UA 的 [hidden]{display:none}，因此同步 inline display 确保“视觉过滤”真正生效
        // （display 属于行为状态，不涉及颜色/字号等设计值；重新显示时还原为空字符串）。
        item.el.hidden = !isMatch;
        item.el.style.display = isMatch ? '' : 'none';
        if (isMatch) visibleCount += 1;
      }

      var hasQuery = tokens.length > 0;
      if (results) {
        results.hidden = !hasQuery;
        if (hasQuery) {
          const resultKey = visibleCount === 1 ? 'blog.search.result_one' : 'blog.search.results';
          results.textContent = translate(resultKey, { n: visibleCount });
        }
      }
      if (empty) empty.hidden = !(hasQuery && visibleCount === 0);
    }

    function clear() {
      if (input.value === '') {
        render();
        input.focus();
        return;
      }
      input.value = '';
      render();
      input.focus();
    }

    input.addEventListener('input', render);
    input.addEventListener('search', render); // 浏览器原生清除（×）也走同一路径

    // Esc 清除查询（键盘可用性；不影响浏览器默认行为以外的任何东西）
    input.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' && event.key !== 'Esc') return;
      if (input.value === '') return;
      event.preventDefault();
      clear();
    });

    if (clearButton) clearButton.addEventListener('click', clear);

    // i18n.js 异步加载完成翻译后刷新文案；页面无 i18n.js 时用英文兜底
    document.addEventListener('languageChanged', applyI18n);

    applyI18n();
    render();

    window.mcBlogSearch = {
      __ready: true,
      apply: render,
      clear: clear,
      getQuery: function () { return input.value; },
      getVisibleCount: function () {
        return index.filter(function (item) {
          return !item.el.hidden && window.getComputedStyle(item.el).display !== 'none';
        }).length;
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}());
