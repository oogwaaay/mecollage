/**
 * MeCollage 编辑器增强：图片右键菜单 + 可分享布局链接（不含照片）
 * 依赖 window.mecollage（index.html 内联脚本创建）与 window.mcUI.toast。
 * 只做加法：不修改编辑器状态模型，不存储任何图片。
 */
(function () {
  'use strict';
  if (window.mcEditorExtras) return;
  window.mcEditorExtras = true;

  var LABELS = {
    en: { duplicate: 'Duplicate', download: 'Download image', share: 'Copy layout link (no photos)', del: 'Delete', copied: 'Layout link copied. It contains layout settings only, not photos.', copyFail: 'Could not copy the link.', applied: 'Layout applied. Add your photos to use it.' },
    zh: { duplicate: '复制一份', download: '下载图片', share: '复制布局链接（不含图片）', del: '删除', copied: '布局链接已复制，只含排版设置，不含照片。', copyFail: '复制失败，请手动复制。', applied: '布局已应用，添加图片即可使用。' },
    tw: { duplicate: '複製一份', download: '下載圖片', share: '複製版面連結（不含圖片）', del: '刪除', copied: '版面連結已複製，只含排版設定，不含照片。', copyFail: '複製失敗，請手動複製。', applied: '版面已套用，加入圖片即可使用。' },
    ja: { duplicate: '複製', download: '画像をダウンロード', share: 'レイアウトリンクをコピー（写真なし）', del: '削除', copied: 'レイアウトリンクをコピーしました。写真は含まれません。', copyFail: 'コピーできませんでした。', applied: 'レイアウトを適用しました。写真を追加してください。' },
    es: { duplicate: 'Duplicar', download: 'Descargar imagen', share: 'Copiar enlace del diseño (sin fotos)', del: 'Eliminar', copied: 'Enlace del diseño copiado. Solo incluye el diseño, no las fotos.', copyFail: 'No se pudo copiar el enlace.', applied: 'Diseño aplicado. Añade tus fotos para usarlo.' }
  };
  function langKey() {
    var l = (document.documentElement.lang || 'en').toLowerCase();
    if (l.indexOf('zh-tw') === 0 || l.indexOf('zh-hant') === 0) return 'tw';
    if (l.indexOf('zh') === 0) return 'zh';
    if (l.indexOf('ja') === 0) return 'ja';
    if (l.indexOf('es') === 0) return 'es';
    return 'en';
  }
  var L = LABELS[langKey()];

  function toast(msg, type) {
    if (window.mcUI && typeof window.mcUI.toast === 'function') return window.mcUI.toast(msg, { type: type || 'info' });
    if (typeof window.mcToast === 'function') return window.mcToast(msg, { type: type || 'info' });
  }

  function appInstance() {
    var app = window.mecollage;
    return app && Array.isArray(app.images) ? app : null;
  }

  function closeMenu() {
    var old = document.getElementById('mcEditorMenu');
    if (old) old.remove();
  }

  function copyText(text, onFail) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(L.copied, 'success'); }, function () { onFail(text); });
    } else {
      onFail(text);
    }
  }

  function shareLink(app) {
    var snap = app.snapshot ? app.snapshot() : {};
    delete snap.images;
    var payload = { v: 1, ratio: snap.currentAspectRatio, gutter: snap.gutter, radius: snap.radius, text: snap.textLayers || [], sticker: snap.stickerLayers || [] };
    var json = JSON.stringify(payload);
    var b64 = btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    var url = location.origin + location.pathname + '#layout=' + b64;
    copyText(url, function (fallback) {
      window.prompt(L.copied, fallback);
    });
  }

  function applySharedLayout(app) {
    var m = /^#layout=([A-Za-z0-9_-]+)$/.exec(location.hash || '');
    if (!m) return;
    if (location.hash === '#christmas') return;
    try {
      var json = decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))));
      var data = JSON.parse(json);
      if (data.ratio) app.currentAspectRatio = data.ratio;
      if (typeof data.gutter === 'number') app.gutter = data.gutter;
      if (typeof data.radius === 'number') app.radius = data.radius;
      if (Array.isArray(data.text)) app.textLayers = data.text;
      if (Array.isArray(data.sticker)) app.stickerLayers = data.sticker;
      if (typeof app.renderCollage === 'function') app.renderCollage();
      toast(L.applied, 'success');
    } catch (e) { /* 忽略损坏的分享链接 */ }
  }

  function buildMenu(app, index, x, y) {
    closeMenu();
    var menu = document.createElement('div');
    menu.id = 'mcEditorMenu';
    menu.className = 'mc-ctx-menu';
    menu.setAttribute('role', 'menu');
    var items = [
      { key: 'duplicate', run: function () {
          var img = app.images[index];
          if (!img) return;
          app.saveState && app.saveState();
          app.images.splice(index + 1, 0, Object.assign({}, img));
          app.renderCollage(); app.updateImageCount(); app.markDirty();
        } },
      { key: 'download', run: function () {
          var img = app.images[index];
          if (!img || !img.url) return;
          var a = document.createElement('a');
          a.href = img.url; a.download = 'mecollage-image-' + (index + 1) + '.png';
          document.body.appendChild(a); a.click(); a.remove();
        } },
      { key: 'share', run: function () { shareLink(app); } },
      { key: 'del', run: function () { app.saveState && app.saveState(); app.removeImage(index); } }
    ];
    items.forEach(function (item) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mc-ctx-menu__item' + (item.key === 'del' ? ' mc-ctx-menu__item--danger' : '');
      btn.setAttribute('role', 'menuitem');
      btn.textContent = L[item.key];
      btn.addEventListener('click', function () { closeMenu(); item.run(); });
      menu.appendChild(btn);
    });
    menu.style.left = Math.max(8, Math.min(x, window.innerWidth - 220)) + 'px';
    menu.style.top = Math.max(8, Math.min(y, window.innerHeight - 180)) + 'px';
    document.body.appendChild(menu);
    setTimeout(function () {
      document.addEventListener('pointerdown', closeMenu, { once: true });
      document.addEventListener('scroll', closeMenu, { once: true, passive: true });
    }, 0);
  }

  function boot() {
    var app = appInstance();
    if (!app) return false;
    document.addEventListener('contextmenu', function (e) {
      var container = e.target.closest('.image-outer-container');
      if (!container || container.classList.contains('add-image-outer-container')) return;
      var containers = Array.prototype.slice.call(document.querySelectorAll('#collageGrid .image-outer-container')).filter(function (el) { return !el.classList.contains('add-image-outer-container'); });
      var index = containers.indexOf(container);
      if (index < 0 || !app.images[index]) return;
      e.preventDefault();
      buildMenu(app, index, e.clientX, e.clientY);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
    applySharedLayout(app);
    return true;
  }

  if (!boot()) {
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      if (boot() || tries > 40) clearInterval(timer);
    }, 250);
  }
})();
