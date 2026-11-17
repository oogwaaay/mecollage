/*! MeCollage editor enhancements (extras + persistence + export + samples) */
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
/**
 * Editor persistence: autosave the project to IndexedDB, restore on reload,
 * and a browsable 30-day local trash panel (restore one / all, empty).
 * No upload. Disabled under automation unless window.__mcEnablePersistence === true.
 */
(function () {
  'use strict';
  if (window.mcEditorPersistence) return;
  window.mcEditorPersistence = true;
  if (navigator.webdriver && window.__mcEnablePersistence !== true) return;
  if (location.hash === '#christmas') return;

  var DB_NAME = 'mecollage-editor';
  var DB_VERSION = 1;
  var DAY = 86400000;
  var app = null;
  var saveTimer = null;
  var trashRows = [];
  var ui = null;
  var panelOpen = false;
  var emptyArmed = false;
  var emptyTimer = null;
  var labels = {
    en: { saved: 'Project saved in this browser.', restored: 'Your last project was restored.', trashed: 'Moved to trash. Kept for 30 days.', undo: 'Undo', trash: 'Trash', count: '{n} pictures', countOne: '1 picture', note: 'Deleted pictures wait here for 30 days, only in this browser.', days: '{n} days left', restore: 'Restore', restoreAll: 'Restore all', empty: 'Empty trash', emptyConfirm: 'Confirm empty', emptied: 'Trash emptied.', close: 'Close' },
    zh: { saved: '项目已保存在这个浏览器里。', restored: '已恢复上次的项目。', trashed: '已移入回收站，保留 30 天。', undo: '撤销', trash: '回收站', count: '{n} 张图片', countOne: '1 张图片', note: '删除的图片会在这里保留 30 天，只存在这个浏览器里。', days: '剩余 {n} 天', restore: '恢复', restoreAll: '全部恢复', empty: '清空回收站', emptyConfirm: '确认清空', emptied: '回收站已清空。', close: '关闭' },
    tw: { saved: '專案已保存在這個瀏覽器裡。', restored: '已恢復上次的專案。', trashed: '已移入回收桶，保留 30 天。', undo: '復原', trash: '回收桶', count: '{n} 張圖片', countOne: '1 張圖片', note: '刪除的圖片會在這裡保留 30 天，只存在這個瀏覽器裡。', days: '剩 {n} 天', restore: '復原', restoreAll: '全部復原', empty: '清空回收桶', emptyConfirm: '確認清空', emptied: '回收桶已清空。', close: '關閉' },
    ja: { saved: 'このブラウザに保存しました。', restored: '前回のプロジェクトを復元しました。', trashed: 'ゴミ箱に移動しました（30日間保存）。', undo: '元に戻す', trash: 'ゴミ箱', count: '{n} 枚', countOne: '1 枚', note: '削除した画像はこのブラウザに 30 日間保存されます。', days: '残り {n} 日', restore: '復元', restoreAll: 'すべて復元', empty: 'ゴミ箱を空にする', emptyConfirm: '空にする', emptied: 'ゴミ箱を空にしました。', close: '閉じる' },
    es: { saved: 'Proyecto guardado en este navegador.', restored: 'Se ha restaurado tu último proyecto.', trashed: 'Movido a la papelera. Se conserva 30 días.', undo: 'Deshacer', trash: 'Papelera', count: '{n} fotos', countOne: '1 foto', note: 'Las fotos eliminadas se guardan aquí 30 días, solo en este navegador.', days: 'Quedan {n} días', restore: 'Restaurar', restoreAll: 'Restaurar todo', empty: 'Vaciar papelera', emptyConfirm: 'Confirmar', emptied: 'Papelera vacía.', close: 'Cerrar' }
  };
  function langKey() {
    var l = (document.documentElement.lang || 'en').toLowerCase();
    if (l.indexOf('zh-tw') === 0 || l.indexOf('zh-hant') === 0) return 'tw';
    if (l.indexOf('zh') === 0) return 'zh';
    if (l.indexOf('ja') === 0) return 'ja';
    if (l.indexOf('es') === 0) return 'es';
    return 'en';
  }
  var L = labels[langKey()];
  function toast(message, options) {
    if (window.mcUI && typeof window.mcUI.toast === 'function') return window.mcUI.toast(message, options || {});
    if (typeof window.mcToast === 'function') return window.mcToast(message, options || {});
  }
  function openDB() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains('state')) db.createObjectStore('state');
        if (!db.objectStoreNames.contains('trash')) db.createObjectStore('trash', { keyPath: 'id', autoIncrement: true });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }
  function request(storeName, mode, run) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, mode);
        var store = tx.objectStore(storeName);
        var req = run(store);
        tx.oncomplete = function () { resolve(req ? req.result : undefined); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error); };
      });
    });
  }
  function snapshotState() {
    if (!app || !app.images.length) return null;
    var snap = app.snapshot ? app.snapshot() : null;
    if (!snap) return null;
    return {
      images: snap.images.map(function (img) { return { url: img.url, width: img.width, height: img.height, filter: img.filter || 'none' }; }),
      textLayers: snap.textLayers || [],
      stickerLayers: snap.stickerLayers || [],
      ratio: snap.currentAspectRatio,
      gutter: snap.gutter,
      radius: snap.radius,
      savedAt: Date.now()
    };
  }
  function saveNow() {
    var data = snapshotState();
    if (!data) {
      request('state', 'readwrite', function (s) { return s.delete('current'); }).catch(function () {});
      return;
    }
    request('state', 'readwrite', function (s) { return s.put(data, 'current'); }).catch(function () {});
  }
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 900);
  }
  function applyState(data) {
    if (!data || !Array.isArray(data.images) || !data.images.length) return false;
    if (app.images.length) return false;
    app.images = data.images.map(function (img) {
      return { file: null, url: img.url, width: img.width, height: img.height, filter: img.filter || 'none' };
    });
    app.textLayers = data.textLayers || [];
    app.stickerLayers = data.stickerLayers || [];
    app.currentAspectRatio = data.ratio || app.currentAspectRatio;
    app.gutter = typeof data.gutter === 'number' ? data.gutter : app.gutter;
    app.radius = typeof data.radius === 'number' ? data.radius : app.radius;
    if (typeof app.renderCollage === 'function') app.renderCollage();
    if (typeof app.showCollageCanvas === 'function') app.showCollageCanvas();
    if (typeof app.updateImageCount === 'function') app.updateImageCount();
    var gs = document.getElementById('gutterSlider');
    var gv = document.getElementById('gutterValue');
    var rs = document.getElementById('radiusSlider');
    var rv = document.getElementById('radiusValue');
    if (gs) gs.value = app.gutter;
    if (gv) gv.textContent = app.gutter + 'px';
    if (rs) rs.value = app.radius;
    if (rv) rv.textContent = app.radius + 'px';
    return true;
  }
  function restoreProject() {
    return request('state', 'readonly', function (s) { return s.get('current'); }).then(function (data) {
      if (applyState(data)) {
        toast(L.restored, { type: 'success', duration: 4200 });
        scheduleSave();
      }
    }).catch(function () {});
  }
  function daysLeft(row) {
    return Math.max(0, 30 - Math.floor((Date.now() - row.deletedAt) / DAY));
  }
  function togglePanel(open) {
    if (!ui) return;
    panelOpen = Boolean(open);
    ui.panel.hidden = !panelOpen;
    ui.btn.setAttribute('aria-expanded', String(panelOpen));
    if (panelOpen) refreshTrash();
  }
  function renderList() {
    if (!ui) return;
    ui.list.innerHTML = '';
    trashRows.forEach(function (row) {
      var li = document.createElement('li');
      li.className = 'mc-trash-item';
      var img = document.createElement('img');
      img.src = row.url || '';
      img.alt = '';
      img.width = 64;
      img.height = 48;
      img.loading = 'lazy';
      var meta = document.createElement('div');
      meta.className = 'mc-trash-meta';
      var name = document.createElement('span');
      name.className = 'mc-trash-name';
      name.textContent = row.name || '';
      var days = document.createElement('span');
      days.className = 'mc-trash-days';
      days.textContent = L.days.replace('{n}', String(daysLeft(row)));
      meta.appendChild(name);
      meta.appendChild(days);
      var restore = document.createElement('button');
      restore.type = 'button';
      restore.className = 'mc-trash-restore';
      restore.textContent = L.restore;
      restore.addEventListener('click', function () { restoreOne(row.id); });
      li.appendChild(img);
      li.appendChild(meta);
      li.appendChild(restore);
      ui.list.appendChild(li);
    });
  }
  function refreshTrash() {
    return request('trash', 'readonly', function (s) { return s.getAll(); }).then(function (rows) {
      trashRows = (rows || []).slice().sort(function (a, b) { return b.deletedAt - a.deletedAt; });
      ensureUI();
      if (!trashRows.length) {
        ui.btn.hidden = true;
        ui.count.hidden = true;
        togglePanel(false);
        renderList();
        return;
      }
      ui.btn.hidden = false;
      ui.count.hidden = false;
      ui.count.textContent = String(trashRows.length);
      ui.total.textContent = trashRows.length === 1 ? L.countOne : L.count.replace('{n}', String(trashRows.length));
      renderList();
    }).catch(function () {});
  }
  function addTrash(img) {
    if (!img || !img.url) return Promise.resolve(null);
    var name = img.file && img.file.name ? img.file.name : '';
    return request('trash', 'readwrite', function (s) {
      return s.add({ url: img.url, name: name, width: img.width, height: img.height, filter: img.filter || 'none', deletedAt: Date.now() });
    }).then(function (id) {
      refreshTrash();
      return id;
    });
  }
  function pushBack(row) {
    if (!row || !row.url) return false;
    if (app.images.length >= (app.maxImages || 20)) return false;
    app.images.push({ file: null, url: row.url, width: row.width, height: row.height, filter: row.filter || 'none' });
    if (typeof app.renderCollage === 'function') app.renderCollage();
    if (typeof app.showCollageCanvas === 'function') app.showCollageCanvas();
    if (typeof app.updateImageCount === 'function') app.updateImageCount();
    if (typeof app.markDirty === 'function') app.markDirty();
    return true;
  }
  function restoreOne(id) {
    return request('trash', 'readonly', function (s) { return s.get(id); }).then(function (row) {
      if (!row) return;
      return request('trash', 'readwrite', function (s) { return s.delete(id); }).then(function () {
        pushBack(row);
        refreshTrash();
      });
    }).catch(function () {});
  }
  function restoreAllTrash() {
    return request('trash', 'readonly', function (s) { return s.getAll(); }).then(function (all) {
      if (!all || !all.length) return;
      all.forEach(pushBack);
      return request('trash', 'readwrite', function (s) { return s.clear(); }).then(function () {
        refreshTrash();
        scheduleSave();
      });
    }).catch(function () {});
  }
  function emptyTrash() {
    if (!ui) return;
    var btn = ui.panel.querySelector('.mc-trash-empty');
    if (!emptyArmed) {
      emptyArmed = true;
      btn.textContent = L.emptyConfirm;
      clearTimeout(emptyTimer);
      emptyTimer = setTimeout(function () { emptyArmed = false; btn.textContent = L.empty; }, 3000);
      return;
    }
    emptyArmed = false;
    clearTimeout(emptyTimer);
    btn.textContent = L.empty;
    request('trash', 'readwrite', function (s) { return s.clear(); }).then(function () {
      refreshTrash();
      toast(L.emptied, { type: 'success' });
    }).catch(function () {});
  }
  function ensureUI() {
    if (ui) return ui;
    var btn = document.createElement('button');
    btn.id = 'mcTrashBtn';
    btn.className = 'mc-trash-fab';
    btn.type = 'button';
    btn.hidden = true;
    btn.setAttribute('aria-label', L.trash);
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<i class="fas fa-trash" aria-hidden="true"></i><span class="mc-trash-count" hidden>0</span>';
    var panel = document.createElement('div');
    panel.id = 'mcTrashPanel';
    panel.className = 'mc-trash-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', L.trash);
    panel.innerHTML = '<div class="mc-trash-head"><strong>' + L.trash + '</strong><span class="mc-trash-total"></span><button type="button" class="mc-trash-close" aria-label="' + L.close + '">×</button></div>' +
      '<p class="mc-trash-note">' + L.note + '</p>' +
      '<ul class="mc-trash-list"></ul>' +
      '<div class="mc-trash-actions"><button type="button" class="mc-trash-restore-all">' + L.restoreAll + '</button><button type="button" class="mc-trash-empty">' + L.empty + '</button></div>';
    document.body.appendChild(btn);
    document.body.appendChild(panel);
    btn.addEventListener('click', function () { togglePanel(!panelOpen); });
    panel.querySelector('.mc-trash-close').addEventListener('click', function () { togglePanel(false); });
    panel.querySelector('.mc-trash-restore-all').addEventListener('click', restoreAllTrash);
    panel.querySelector('.mc-trash-empty').addEventListener('click', emptyTrash);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panelOpen) togglePanel(false); });
    document.addEventListener('pointerdown', function (e) {
      if (!panelOpen) return;
      if (panel.contains(e.target) || btn.contains(e.target)) return;
      togglePanel(false);
    });
    ui = { btn: btn, panel: panel, count: btn.querySelector('.mc-trash-count'), total: panel.querySelector('.mc-trash-total'), list: panel.querySelector('.mc-trash-list') };
    return ui;
  }
  function purgeTrash() {
    return request('trash', 'readonly', function (s) { return s.getAll(); }).then(function (all) {
      var old = (all || []).filter(function (row) { return Date.now() - row.deletedAt > 30 * DAY; });
      return Promise.all(old.map(function (row) {
        return request('trash', 'readwrite', function (s) { return s.delete(row.id); });
      })).then(function () { return (all || []).length - old.length; });
    }).catch(function () { return 0; });
  }
  function boot() {
    app = window.mecollage;
    if (!app || !Array.isArray(app.images)) return false;
    ensureUI();
    var originalDirty = app.markDirty ? app.markDirty.bind(app) : function () {};
    app.markDirty = function () { originalDirty(); scheduleSave(); };
    var originalRemove = app.removeImage ? app.removeImage.bind(app) : null;
    if (originalRemove) {
      app.removeImage = function (index) {
        var img = app.images[index];
        var result = originalRemove(index);
        if (img) {
          addTrash(img).then(function (id) {
            toast(L.trashed, {
              type: 'info', duration: 5200, actionLabel: L.undo,
              onAction: function () { if (id != null) restoreOne(id); }
            });
            scheduleSave();
          });
        }
        return result;
      };
    }
    restoreProject();
    purgeTrash().then(refreshTrash);
    window.addEventListener('pagehide', function () { if (saveTimer) { clearTimeout(saveTimer); saveNow(); } });
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
/**
 * Editor export options: PNG/JPG/WebP, quality, scale, download or copy PNG.
 * Appends a panel to the sidebar; main.js reads app.exportOptions on export.
 */
(function () {
  'use strict';
  if (window.mcEditorExport) return;
  window.mcEditorExport = true;
  var labels = {
    en: { title: 'Export options', format: 'Format', quality: 'Quality', scale: 'Scale', download: 'Download', copy: 'Copy PNG', note: 'Copy places a PNG on the clipboard.' },
    zh: { title: '导出选项', format: '格式', quality: '质量', scale: '倍数', download: '下载', copy: '复制 PNG', note: '复制会把 PNG 放进剪贴板。' },
    tw: { title: '匯出選項', format: '格式', quality: '品質', scale: '倍數', download: '下載', copy: '複製 PNG', note: '複製會把 PNG 放進剪貼簿。' },
    ja: { title: '書き出し設定', format: '形式', quality: '画質', scale: '倍率', download: 'ダウンロード', copy: 'PNGをコピー', note: 'コピーはPNGをクリップボードに入れます。' },
    es: { title: 'Opciones de exportación', format: 'Formato', quality: 'Calidad', scale: 'Escala', download: 'Descargar', copy: 'Copiar PNG', note: 'Copiar pone un PNG en el portapapeles.' }
  };
  function langKey() {
    var l = (document.documentElement.lang || 'en').toLowerCase();
    if (l.indexOf('zh-tw') === 0 || l.indexOf('zh-hant') === 0) return 'tw';
    if (l.indexOf('zh') === 0) return 'zh';
    if (l.indexOf('ja') === 0) return 'ja';
    if (l.indexOf('es') === 0) return 'es';
    return 'en';
  }
  var L = labels[langKey()];
  function boot() {
    var app = window.mecollage;
    var sidebar = document.querySelector('.sidebar');
    if (!app || !sidebar || !app.exportCollage) return false;
    if (document.getElementById('mcExportBox')) return true;
    var box = document.createElement('div');
    box.id = 'mcExportBox';
    box.className = 'mc-export-box';
    box.innerHTML = '<h3>' + L.title + '</h3>' +
      '<label>' + L.format + '<select id="mcExportFormat"><option value="png">PNG</option><option value="jpg">JPG</option><option value="webp">WebP</option></select></label>' +
      '<label>' + L.quality + '<input id="mcExportQuality" type="range" min="40" max="100" value="92"></label>' +
      '<label>' + L.scale + '<select id="mcExportScale"><option value="1">1×</option><option value="2" selected>2×</option><option value="3">3×</option></select></label>' +
      '<div class="mc-export-actions"><button type="button" id="mcExportDownload">' + L.download + '</button><button type="button" id="mcExportCopy">' + L.copy + '</button></div>' +
      '<p class="mc-export-note">' + L.note + '</p>';
    sidebar.appendChild(box);
    function sync() {
      app.exportOptions.format = document.getElementById('mcExportFormat').value;
      app.exportOptions.quality = Number(document.getElementById('mcExportQuality').value) / 100;
      app.exportOptions.scale = Number(document.getElementById('mcExportScale').value);
      app.exportOptions.copy = false;
    }
    ['mcExportFormat', 'mcExportQuality', 'mcExportScale'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', sync);
      if (el && el.type === 'range') el.addEventListener('input', sync);
    });
    document.getElementById('mcExportDownload').addEventListener('click', function () { sync(); app.exportCollage(); });
    document.getElementById('mcExportCopy').addEventListener('click', function () { sync(); app.exportOptions.copy = true; app.exportCollage(); });
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
/**
 * One-click sample pictures for the upload screen.
 * Fetches four local WebP samples, feeds them through the existing file input.
 */
(function () {
  'use strict';
  if (window.mcSampleImages) return;
  window.mcSampleImages = true;
  var labels = {
    en: 'Try sample pictures', zh: '试试示例图片', tw: '試試示例圖片', ja: 'サンプル画像を試す', es: 'Probar fotos de ejemplo'
  };
  function langKey() {
    var l = (document.documentElement.lang || 'en').toLowerCase();
    if (l.indexOf('zh-tw') === 0 || l.indexOf('zh-hant') === 0) return 'tw';
    if (l.indexOf('zh') === 0) return 'zh';
    if (l.indexOf('ja') === 0) return 'ja';
    if (l.indexOf('es') === 0) return 'es';
    return 'en';
  }
  var label = labels[langKey()];
  var files = [1, 2, 3, 4].map(function (n) { return '/assets/images/samples/sample-' + n + '.webp'; });
  function boot() {
    var screen = document.getElementById('uploadScreen');
    var input = document.getElementById('fileInput');
    if (!screen || !input) return false;
    if (document.getElementById('mcSampleBtn')) return true;
    var row = document.createElement('div');
    row.className = 'mc-sample-row';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'mcSampleBtn';
    btn.className = 'mc-sample-btn';
    btn.textContent = label;
    row.appendChild(btn);
    screen.appendChild(row);
    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      btn.disabled = true;
      Promise.all(files.map(function (url) {
        return fetch(url).then(function (res) { return res.blob(); }).then(function (blob) {
          return new File([blob], url.split('/').pop(), { type: blob.type || 'image/webp' });
        });
      })).then(function (list) {
        var dt = new DataTransfer();
        list.forEach(function (file) { dt.items.add(file); });
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }).catch(function () {
        /* 保持静默：失败时不打断用户 */
      }).then(function () {
        btn.disabled = false;
      });
    });
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
